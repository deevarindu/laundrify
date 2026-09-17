import type { Request, Response } from "express";
import { Prisma, PaymentMethod } from "@prisma/client";
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

    if (!Number.isInteger(id) || id <= 0) {
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
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const { orderId, amount, method, paidAt } = req.body;

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

    if (order.payment) {
      return res.status(409).json({
        message: "Order has already been paid.",
      });
    }

    if (amount !== Number(order.total)) {
      return res.status(400).json({
        message: "Payment amount must be equal to the order total.",
      });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          order: {
            connect: {
              id: order.id,
            },
          },
          amount,
          method,
          receivedBy: {
            connect: {
              id: req.user!.userId,
            },
          },
          ...(paidAt !== undefined && {
            paidAt,
          }),
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
          id: order.id,
        },
        data: {
          paymentStatus: "SUDAH_DIBAYAR",
        },
      });

      return newPayment;
    });

    return res.status(201).json({
      message: "Payment successfully recorded.",
      data: payment,
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "Order has already been paid.",
      });
    }

    return res.status(500).json({
      message: "Failed to create payment.",
    });
  }
};

export const updatePayment = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid payment ID.",
      });
    }

    const existingPayment = await prisma.payment.findUnique({
      where: {
        id,
      },
    });

    if (!existingPayment) {
      return res.status(404).json({
        message: "Payment not found.",
      });
    }

    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        message: "No fields to update.",
      });
    }

    const data: Prisma.PaymentUpdateInput = {};

    if (req.body.method !== undefined) {
      data.method = req.body.method;
    }

    if (req.body.paidAt !== undefined) {
      data.paidAt = req.body.paidAt;
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

    return res.status(500).json({
      message: "Failed to update payment.",
    });
  }
};

export const deletePayment = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
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

    if (payment.order.orderStatus === "SELESAI") {
      return res.status(409).json({
        message: "Payment cannot be deleted from a completed order.",
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
          paymentStatus: "BELUM_DIBAYAR",
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