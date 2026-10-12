import type { Request, Response } from "express";
import { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import snap from "../lib/midtrans.js";
import { emitPaymentStatusChanged } from "../lib/socketEvent.js";

type MidtransPaymentMethod = "CASH" | "TRANSFER" | "QRIS";

type MidtransStatusResponse = {
  order_id: string;
  transaction_status: string;
  fraud_status?: string;
  gross_amount: string;
  payment_type?: string;
};

type MidtransTransactionApi = {
  status: (orderId: string) => Promise<MidtransStatusResponse>;
  cancel: (orderId: string) => Promise<unknown>;
};

const getPaymentMethod = (paymentType?: string): MidtransPaymentMethod => {
  if (paymentType === "qris") return "QRIS";
  return "TRANSFER";
};

const isSuccessfulTransaction = (transaction: {
  transaction_status: string;
  fraud_status?: string;
}) =>
  transaction.transaction_status === "settlement" ||
  (transaction.transaction_status === "capture" &&
    (!transaction.fraud_status || transaction.fraud_status === "accept"));

const findCustomerOrder = async (orderCode: string, phone: string) =>
  prisma.order.findFirst({
    where: {
      orderCode,
      customer: {
        is: {
          phone,
        },
      },
    },
    include: {
      payment: true,
    },
  });

const createPaidPayment = async (
  order: {
    id: number;
    orderCode: string;
    total: Prisma.Decimal;
  },
  paymentType?: string
) => {
  const result = await prisma.$transaction(async (tx) => {
    const existingPayment = await tx.payment.findUnique({
      where: {
        orderId: order.id,
      },
    });

    if (existingPayment) {
      await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          paymentStatus: "SUDAH_DIBAYAR",
        },
      });

      return {
        payment: existingPayment,
        created: false,
      };
    }

    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        amount: order.total,
        method: getPaymentMethod(paymentType),
      },
    });

    await tx.order.update({
      where: {
        id: order.id,
      },
      data: {
        paymentStatus: "SUDAH_DIBAYAR",
      },
    });

    return {
      payment,
      created: true,
    };
  });

  if (result.created) {
    emitPaymentStatusChanged({
      orderId: order.id,
      orderCode: order.orderCode,
      paymentStatus: "SUDAH_DIBAYAR",
      payment: result.payment,
    });
  }

  return result.payment;
};

export const createMidtransTransaction = async (
  req: Request,
  res: Response
) => {
  try {
    const orderId = Number(req.body.orderId);

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        payment: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    if (order.orderStatus === "DIBATALKAN") {
      return res.status(409).json({
        message: "Cancelled order cannot be paid.",
      });
    }

    if (order.paymentStatus === "SUDAH_DIBAYAR") {
      return res.status(409).json({
        message: "Order has already been paid.",
      });
    }

    if (order.payment) {
      return res.status(409).json({
        message: "Order already has a payment.",
      });
    }

    const grossAmount = Number(order.total);

    if (!Number.isSafeInteger(grossAmount) || grossAmount <= 0) {
      return res.status(400).json({
        message: "Invalid order total for Midtrans.",
      });
    }

    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: order.orderCode,
        gross_amount: grossAmount,
      },
    });

    return res.status(200).json({
      message: "Midtrans transaction created successfully.",
      data: {
        orderId: order.id,
        orderCode: order.orderCode,
        token: transaction.token,
        redirectUrl: transaction.redirect_url,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to create Midtrans transaction.",
    });
  }
};

export const createCustomerMidtransTransaction = async (
  req: Request,
  res: Response
) => {
  try {
    const orderCode = String(req.body.orderCode ?? "").trim();
    const phone = String(req.body.phone ?? "").trim();

    if (!orderCode || !phone) {
      return res.status(400).json({
        message: "Order code and phone are required.",
      });
    }

    const order = await findCustomerOrder(orderCode, phone);

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    if (order.orderStatus === "DIBATALKAN") {
      return res.status(409).json({
        message: "Cancelled order cannot be paid.",
      });
    }

    if (order.paymentStatus === "SUDAH_DIBAYAR" || order.payment) {
      return res.status(409).json({
        message: "Order has already been paid.",
      });
    }

    const grossAmount = Number(order.total);

    if (!Number.isSafeInteger(grossAmount) || grossAmount <= 0) {
      return res.status(400).json({
        message: "Invalid order total for Midtrans.",
      });
    }

    const transactionParameters = {
      transaction_details: {
        order_id: order.orderCode,
        gross_amount: grossAmount,
      },
    };

    let transaction: Awaited<ReturnType<typeof snap.createTransaction>>;

    try {
      transaction = await snap.createTransaction(transactionParameters);
    } catch (createError: unknown) {
      const errorObject =
        typeof createError === "object" && createError !== null
          ? (createError as {
              message?: string;
              ApiResponse?: { error_messages?: string[] };
            })
          : undefined;
      const errorText = [
        errorObject?.message ?? String(createError),
        ...(errorObject?.ApiResponse?.error_messages ?? []),
      ]
        .join(" ")
        .toLowerCase();
      const duplicateOrderId =
        errorText.includes("order_id sudah digunakan") ||
        errorText.includes("order_id has already been taken") ||
        errorText.includes("order_id has been used") ||
        errorText.includes("order id is already used");

      if (!duplicateOrderId) {
        throw createError;
      }

      const transactionApi =
        snap.transaction as unknown as MidtransTransactionApi;
      const existingTransaction = await transactionApi.status(order.orderCode);
      const existingAmount = new Prisma.Decimal(
        existingTransaction.gross_amount
      );

      if (!existingAmount.equals(order.total)) {
        return res.status(400).json({
          message: "Existing Midtrans transaction amount does not match order total.",
        });
      }

      if (isSuccessfulTransaction(existingTransaction)) {
        await createPaidPayment(order, existingTransaction.payment_type);

        return res.status(200).json({
          message: "Order payment was already successful.",
          data: {
            orderId: order.id,
            orderCode: order.orderCode,
            paymentStatus: "SUDAH_DIBAYAR",
          },
        });
      }

      if (existingTransaction.transaction_status !== "pending") {
        return res.status(409).json({
          message:
            "Transaksi Midtrans sebelumnya tidak berstatus pending. Periksa status transaksi di dashboard Midtrans sebelum mencoba lagi.",
          data: {
            orderCode: order.orderCode,
            transactionStatus: existingTransaction.transaction_status,
          },
        });
      }

      try {
        await transactionApi.cancel(order.orderCode);
      } catch (cancelError) {
        const latestTransaction = await transactionApi
          .status(order.orderCode)
          .catch(() => null);

        if (latestTransaction && isSuccessfulTransaction(latestTransaction)) {
          await createPaidPayment(order, latestTransaction.payment_type);

          return res.status(200).json({
            message: "Order payment was already successful.",
            data: {
              orderId: order.id,
              orderCode: order.orderCode,
              paymentStatus: "SUDAH_DIBAYAR",
            },
          });
        }

        throw cancelError;
      }

      transaction = await snap.createTransaction(transactionParameters);
    }

    return res.status(200).json({
      message: "Midtrans transaction created successfully.",
      data: {
        orderId: order.id,
        orderCode: order.orderCode,
        token: transaction.token,
        redirectUrl: transaction.redirect_url,
      },
    });
  } catch (error) {
    console.error("Midtrans customer transaction failed:", error);

    return res.status(500).json({
      message: "Failed to create Midtrans transaction.",
    });
  }
};

export const checkCustomerMidtransStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const orderCode = String(req.body.orderCode ?? "").trim();
    const phone = String(req.body.phone ?? "").trim();

    if (!orderCode || !phone) {
      return res.status(400).json({
        message: "Order code and phone are required.",
      });
    }

    const order = await findCustomerOrder(orderCode, phone);

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    if (order.paymentStatus === "SUDAH_DIBAYAR") {
      return res.status(200).json({
        message: "Order has already been paid.",
        data: {
          orderCode: order.orderCode,
          paymentStatus: "SUDAH_DIBAYAR",
        },
      });
    }

    const transactionApi = snap.transaction as unknown as {
      status: (orderId: string) => Promise<MidtransStatusResponse>;
    };

    const transaction = await transactionApi.status(order.orderCode);

    if (transaction.order_id !== order.orderCode) {
      return res.status(400).json({
        message: "Midtrans transaction does not match this order.",
      });
    }

    const transactionAmount = new Prisma.Decimal(transaction.gross_amount);

    if (!transactionAmount.equals(order.total)) {
      return res.status(400).json({
        message: "Transaction amount does not match order total.",
      });
    }

    if (!isSuccessfulTransaction(transaction)) {
      return res.status(200).json({
        message: "Payment has not been confirmed as successful.",
        data: {
          orderCode: order.orderCode,
          paymentStatus: "BELUM_DIBAYAR",
          transactionStatus: transaction.transaction_status,
        },
      });
    }

    if (order.payment) {
      return res.status(409).json({
        message: "A payment record already exists for this order.",
      });
    }

    const payment = await createPaidPayment(
      order,
      transaction.payment_type
    );

    return res.status(200).json({
      message: "Midtrans payment verified successfully.",
      data: {
        orderCode: order.orderCode,
        paymentStatus: "SUDAH_DIBAYAR",
        payment,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(502).json({
      message: "Unable to verify payment status with Midtrans.",
    });
  }
};

export const handleMidtransNotification = async (
  req: Request,
  res: Response
) => {
  try {
    const notification = (await snap.transaction.notification(
      req.body
    )) as MidtransStatusResponse;

    const orderCode = notification.order_id;
    const order = await prisma.order.findUnique({
      where: {
        orderCode,
      },
      include: {
        payment: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    const notificationAmount = new Prisma.Decimal(
      notification.gross_amount
    );

    if (!notificationAmount.equals(order.total)) {
      return res.status(400).json({
        message: "Notification amount does not match order total.",
      });
    }

    if (!isSuccessfulTransaction(notification)) {
      return res.status(200).json({
        message: "Midtrans notification received.",
        data: {
          orderCode,
          transactionStatus: notification.transaction_status,
        },
      });
    }

    if (order.paymentStatus === "SUDAH_DIBAYAR") {
      return res.status(200).json({
        message: "Payment has already been processed.",
      });
    }

    if (order.payment) {
      return res.status(200).json({
        message: "A payment record already exists for this order.",
      });
    }

    const payment = await createPaidPayment(
      order,
      notification.payment_type
    );

    return res.status(200).json({
      message: "Midtrans payment processed successfully.",
      data: {
        orderCode,
        paymentStatus: "SUDAH_DIBAYAR",
        payment,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to process Midtrans notification.",
    });
  }
};
