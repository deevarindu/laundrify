
import type { Request, Response } from "express";
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import { emitPaymentStatusChanged } from "../lib/socketEvent.js";

const paymentInclude = {
  order: true,
  receivedBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
};

const parsePaymentId = (value: string | string[] | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
};

const parsePaidAt = (value: unknown): Date | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const isValidPaymentMethod = (
  value: unknown
): value is PaymentMethod =>
  typeof value === "string" &&
  Object.values(PaymentMethod).includes(value as PaymentMethod);

const isKnownPrismaError = (
  error: unknown,
  code: string
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === code;

export const getAllPayments = async (_req: Request, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      include: paymentInclude,
      orderBy: {
        paidAt: "desc",
      },
    });

    return res.status(200).json({
      message: "Payments fetched successfully.",
      data: payments,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch payments.",
    });
  }
};

export const getPaymentById = async (req: Request, res: Response) => {
  const id = parsePaymentId(req.params.id);

  if (id === null) {
    return res.status(400).json({
      message: "Invalid payment ID.",
    });
  }

  try {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: paymentInclude,
    });

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found.",
      });
    }

    return res.status(200).json({
      message: "Payment fetched successfully.",
      data: payment,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch payment.",
    });
  }
};

export const createPayment = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  const orderId = Number(req.body.orderId);
  const amount = Number(req.body.amount);
  const method = req.body.method;
  const paidAtInput = req.body.paidAt;
  const cashReceivedInput = req.body.cashReceived;

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      message: "Invalid order ID.",
    });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({
      message: "Payment amount must be greater than 0.",
    });
  }

  if (!isValidPaymentMethod(method)) {
    return res.status(400).json({
      message: "Invalid payment method.",
    });
  }

  let cashReceived: Prisma.Decimal | null = null;

  if (method === PaymentMethod.CASH) {
    const parsedCashReceived = Number(cashReceivedInput);

    if (
      cashReceivedInput === undefined ||
      cashReceivedInput === null ||
      cashReceivedInput === "" ||
      !Number.isFinite(parsedCashReceived) ||
      parsedCashReceived <= 0
    ) {
      return res.status(400).json({
        message: "Cash received must be greater than 0.",
      });
    }

    cashReceived = new Prisma.Decimal(parsedCashReceived);
  }

  let paidAt: Date | undefined;

  if (
    paidAtInput !== undefined &&
    paidAtInput !== null &&
    paidAtInput !== ""
  ) {
    const parsedDate = parsePaidAt(paidAtInput);

    if (!parsedDate) {
      return res.status(400).json({
        message: "Invalid payment date.",
      });
    }

    paidAt = parsedDate;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          payment: true,
        },
      });

      if (!order) {
        throw new Error("ORDER_NOT_FOUND");
      }

      if (order.orderStatus === OrderStatus.DIBATALKAN) {
        throw new Error("ORDER_CANCELLED");
      }

      if (
        order.paymentStatus === PaymentStatus.SUDAH_DIBAYAR ||
        order.payment
      ) {
        throw new Error("PAYMENT_ALREADY_EXISTS");
      }

      const paymentAmount = new Prisma.Decimal(amount);

      if (!paymentAmount.equals(order.total)) {
        throw new Error("PAYMENT_AMOUNT_MISMATCH");
      }

      if (
        method === PaymentMethod.CASH &&
        cashReceived!.lessThan(paymentAmount)
      ) {
        throw new Error("CASH_RECEIVED_INSUFFICIENT");
      }

      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          amount: paymentAmount,
          method,
          cashReceived,
          receivedById: req.user!.userId,
          ...(paidAt ? { paidAt } : {}),
        },
        include: paymentInclude,
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.SUDAH_DIBAYAR,
        },
      });

      return payment;
    });

    emitPaymentStatusChanged({
      orderId: result.orderId,
      orderCode: result.order.orderCode,
      paymentStatus: PaymentStatus.SUDAH_DIBAYAR,
      payment: result,
    });

    return res.status(201).json({
      message: "Payment successfully recorded.",
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      const responses: Record<
        string,
        { status: number; message: string }
      > = {
        ORDER_NOT_FOUND: {
          status: 404,
          message: "Order not found.",
        },
        ORDER_CANCELLED: {
          status: 409,
          message: "Cancelled order cannot be paid.",
        },
        PAYMENT_ALREADY_EXISTS: {
          status: 409,
          message: "Order has already been paid.",
        },
        PAYMENT_AMOUNT_MISMATCH: {
          status: 400,
          message: "Payment amount must be equal to the order total.",
        },
        CASH_RECEIVED_INSUFFICIENT: {
          status: 400,
          message: "Cash received must be at least equal to the order total.",
        },
      };

      const response = responses[error.message];

      if (response) {
        return res.status(response.status).json({
          message: response.message,
        });
      }
    }

    if (isKnownPrismaError(error, "P2002")) {
      return res.status(409).json({
        message: "Order has already been paid.",
      });
    }

    if (isKnownPrismaError(error, "P2025")) {
      return res.status(404).json({
        message: "Order or user not found.",
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Failed to create payment.",
    });
  }
};

export const updatePayment = async (req: Request, res: Response) => {
  const id = parsePaymentId(req.params.id);

  if (id === null) {
    return res.status(400).json({
      message: "Invalid payment ID.",
    });
  }

  const { method, paidAt: paidAtInput } = req.body;
  const data: Prisma.PaymentUpdateInput = {};

  if (method !== undefined) {
    if (!isValidPaymentMethod(method)) {
      return res.status(400).json({
        message: "Invalid payment method.",
      });
    }

    data.method = method;

    if (method !== PaymentMethod.CASH) {
      data.cashReceived = null;
    }
  }

  if (req.body.cashReceived !== undefined) {
    const parsedCashReceived = Number(req.body.cashReceived);

    if (
      req.body.cashReceived === null ||
      req.body.cashReceived === "" ||
      !Number.isFinite(parsedCashReceived) ||
      parsedCashReceived <= 0
    ) {
      return res.status(400).json({
        message: "Cash received must be greater than 0.",
      });
    }

    data.cashReceived = new Prisma.Decimal(parsedCashReceived);
  }

  if (paidAtInput !== undefined) {
    if (paidAtInput === null || paidAtInput === "") {
      return res.status(400).json({
        message: "Payment date cannot be empty.",
      });
    }

    const paidAt = parsePaidAt(paidAtInput);

    if (!paidAt) {
      return res.status(400).json({
        message: "Invalid payment date.",
      });
    }

    data.paidAt = paidAt;
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({
      message: "No fields to update.",
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingPayment = await tx.payment.findUnique({
        where: { id },
        include: {
          order: true,
        },
      });

      if (!existingPayment) {
        throw new Error("PAYMENT_NOT_FOUND");
      }

      if (existingPayment.order.orderStatus === OrderStatus.SELESAI) {
        throw new Error("COMPLETED_ORDER_PAYMENT_LOCKED");
      }

      if (existingPayment.order.orderStatus === OrderStatus.DIBATALKAN) {
        throw new Error("CANCELLED_ORDER_PAYMENT_LOCKED");
      }

      if (
        existingPayment.order.paymentStatus !==
        PaymentStatus.SUDAH_DIBAYAR
      ) {
        throw new Error("PAYMENT_STATUS_INCONSISTENT");
      }

      const updatedMethod = method ?? existingPayment.method;
      const updatedCashReceived =
        data.cashReceived !== undefined
          ? data.cashReceived
          : method !== undefined && method !== PaymentMethod.CASH
            ? null
            : existingPayment.cashReceived;

      if (
        updatedMethod === PaymentMethod.CASH &&
        updatedCashReceived !== null &&
        updatedCashReceived !== undefined &&
        new Prisma.Decimal(updatedCashReceived.toString()).lessThan(
          existingPayment.amount
        )
      ) {
        throw new Error("CASH_RECEIVED_INSUFFICIENT");
      }

      return tx.payment.update({
        where: { id },
        data,
        include: paymentInclude,
      });
    });

    return res.status(200).json({
      message: "Payment updated successfully.",
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      const responses: Record<
        string,
        { status: number; message: string }
      > = {
        PAYMENT_NOT_FOUND: {
          status: 404,
          message: "Payment not found.",
        },
        COMPLETED_ORDER_PAYMENT_LOCKED: {
          status: 409,
          message: "Payment cannot be updated from a completed order.",
        },
        CANCELLED_ORDER_PAYMENT_LOCKED: {
          status: 409,
          message: "Payment cannot be updated from a cancelled order.",
        },
        PAYMENT_STATUS_INCONSISTENT: {
          status: 409,
          message: "Order payment status is inconsistent.",
        },
        CASH_RECEIVED_INSUFFICIENT: {
          status: 400,
          message: "Cash received must be at least equal to the order total.",
        },
      };

      const response = responses[error.message];

      if (response) {
        return res.status(response.status).json({
          message: response.message,
        });
      }
    }

    if (isKnownPrismaError(error, "P2025")) {
      return res.status(404).json({
        message: "Payment not found.",
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Failed to update payment.",
    });
  }
};

export const deletePayment = async (_req: Request, res: Response) => {
  return res.status(409).json({
    message:
      "Payments cannot be deleted. Correct the payment method or date instead.",
  });
};
