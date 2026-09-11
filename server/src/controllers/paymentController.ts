import type { Request, Response } from "express";
import { Prisma, PaymentMethod, PaymentStatus } from "@prisma/client";

import prisma from "../lib/prisma.js";

export const getAllPayments = async (req: Request, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        order: true,
        receivedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
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
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid payment ID.",
      });
    }

    const payment = await prisma.payment.findUnique({
      where: {
        id,
      },
      include: {
        order: true,
        receivedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
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
  try {
    const {
      orderId,
      amount,
      method,
      paidAt,
      receivedById,
    } = req.body;

    const orderIdNumber = Number(orderId);
    const receivedByIdNumber = Number(receivedById);
    const amountNumber = Number(amount);

    if (Number.isNaN(orderIdNumber)) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    if (Number.isNaN(receivedByIdNumber)) {
      return res.status(400).json({
        message: "Invalid received by user ID.",
      });
    }

    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      return res.status(400).json({
        message: "Payment amount must be greater than 0.",
      });
    }

    const order = await prisma.order.findUnique({
      where: {
        id: orderIdNumber,
      },
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    if (order.paymentStatus === PaymentStatus.SUDAH_DIBAYAR) {
      return res.status(409).json({
        message: "This order has already been paid.",
      });
    }

    const existingPayment = await prisma.payment.findUnique({
      where: {
        orderId: orderIdNumber,
      },
    });

    if (existingPayment) {
      return res.status(409).json({
        message: "Payment for this order already exists.",
      });
    }

    const receivedBy = await prisma.user.findUnique({
      where: {
        id: receivedByIdNumber,
      },
    });

    if (!receivedBy) {
      return res.status(404).json({
        message: "Receiving user not found.",
      });
    }

    if (amountNumber !== Number(order.total)) {
      return res.status(400).json({
        message: "Payment amount must be equal to the order total.",
      });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          orderId: orderIdNumber,
          amount: amountNumber,
          method: method as PaymentMethod,
          ...(paidAt !== undefined && {
            paidAt: new Date(paidAt),
          }),
          receivedById: receivedByIdNumber,
        },
        include: {
          order: true,
          receivedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      await tx.order.update({
        where: {
          id: orderIdNumber,
        },
        data: {
          paymentStatus: PaymentStatus.SUDAH_DIBAYAR,
        },
      });

      return newPayment;
    });

    return res.status(201).json({
      message: "New payment successfully added.",
      data: payment,
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "Payment for this order already exists.",
      });
    }

    return res.status(500).json({
      message: "Failed to add new payment.",
    });
  }
};

export const updatePayment = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid payment ID.",
      });
    }

    const {
      orderId,
      amount,
      method,
      paidAt,
      receivedById,
    } = req.body;

    const existingPayment = await prisma.payment.findUnique({
      where: {
        id,
      },
      include: {
        order: true,
      },
    });

    if (!existingPayment) {
      return res.status(404).json({
        message: "Payment not found.",
      });
    }

    const data: Prisma.PaymentUpdateInput = {};

    if (orderId !== undefined) {
      const orderIdNumber = Number(orderId);

      if (Number.isNaN(orderIdNumber)) {
        return res.status(400).json({
          message: "Invalid order ID.",
        });
      }

      const order = await prisma.order.findUnique({
        where: {
          id: orderIdNumber,
        },
      });

      if (!order) {
        return res.status(404).json({
          message: "Order not found.",
        });
      }

      if (
        order.paymentStatus === PaymentStatus.SUDAH_DIBAYAR &&
        order.id !== existingPayment.orderId
      ) {
        return res.status(409).json({
          message: "This order has already been paid.",
        });
      }

      data.order = {
        connect: {
          id: orderIdNumber,
        },
      };
    }

    if (amount !== undefined) {
      const amountNumber = Number(amount);

      if (Number.isNaN(amountNumber) || amountNumber <= 0) {
        return res.status(400).json({
          message: "Payment amount must be greater than 0.",
        });
      }

      data.amount = amountNumber;
    }

    if (method !== undefined) {
      data.method = method as PaymentMethod;
    }

    if (paidAt !== undefined) {
      data.paidAt = paidAt ? new Date(paidAt) : new Date();
    }

    if (receivedById !== undefined) {
      const receivedByIdNumber = Number(receivedById);

      if (Number.isNaN(receivedByIdNumber)) {
        return res.status(400).json({
          message: "Invalid received by user ID.",
        });
      }

      const receivedBy = await prisma.user.findUnique({
        where: {
          id: receivedByIdNumber,
        },
      });

      if (!receivedBy) {
        return res.status(404).json({
          message: "Receiving user not found.",
        });
      }

      data.receivedBy = {
        connect: {
          id: receivedByIdNumber,
        },
      };
    }

    const updatedPayment = await prisma.payment.update({
      where: {
        id,
      },
      data,
      include: {
        order: true,
        receivedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: "Payment updated successfully.",
      data: updatedPayment,
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        message: "Payment not found.",
      });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "Payment for this order already exists.",
      });
    }

    return res.status(500).json({
      message: "Failed to update payment.",
    });
  }
};

export const deletePayment = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid payment ID.",
      });
    }

    const payment = await prisma.payment.findUnique({
      where: {
        id,
      },
      include: {
        order: true,
      },
    });

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found.",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.delete({
        where: {
          id,
        },
      });

      await tx.order.update({
        where: {
          id: payment.orderId,
        },
        data: {
          paymentStatus: PaymentStatus.BELUM_DIBAYAR,
        },
      });
    });

    return res.status(200).json({
      message: "Payment deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        message: "Payment not found.",
      });
    }

    return res.status(500).json({
      message: "Failed to delete payment.",
    });
  }
};