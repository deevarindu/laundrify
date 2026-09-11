import type { Request, Response } from "express";
import { Prisma, OrderStatus, PaymentStatus } from "@prisma/client";

import prisma from "../lib/prisma.js";

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        orderItems: {
          include: {
            service: true,
          },
        },
        payment: true,
        orderStatusHistories: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            changedAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      message: "Orders fetched successfully.",
      data: orders,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch orders.",
    });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    const order = await prisma.order.findUnique({
      where: {
        id,
      },
      include: {
        customer: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        orderItems: {
          include: {
            service: true,
          },
        },
        payment: true,
        orderStatusHistories: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            changedAt: "desc",
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      message: "Order fetched successfully.",
      data: order,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch order.",
    });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      createdById,
      paymentStatus,
      subtotal,
      discount,
      total,
      dueAt,
    } = req.body;

    const customerIdNumber = Number(customerId);
    const createdByIdNumber = Number(createdById);

    if (Number.isNaN(customerIdNumber)) {
      return res.status(400).json({
        message: "Invalid customer ID.",
      });
    }

    if (Number.isNaN(createdByIdNumber)) {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }

    const customer = await prisma.customer.findUnique({
      where: {
        id: customerIdNumber,
      },
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found.",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: createdByIdNumber,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const orderCode = `ORD-${Date.now()}`;

    const order = await prisma.order.create({
      data: {
        orderCode,
        customerId: customerIdNumber,
        createdById: createdByIdNumber,
        orderStatus: OrderStatus.PESANAN_DITERIMA,

        ...(paymentStatus !== undefined && {
          paymentStatus: paymentStatus as PaymentStatus,
        }),

        subtotal: Number(subtotal),
        discount: Number(discount ?? 0),
        total: Number(total),

        ...(dueAt && {
          dueAt: new Date(dueAt),
        }),
      },
    });

    return res.status(201).json({
      message: "New order successfully added.",
      data: order,
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        message: "Order code already exists.",
      });
    }

    return res.status(500).json({
      message: "Failed to create new order.",
    });
  }
};

export const updateOrder = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    const {
      customerId,
      orderStatus,
      paymentStatus,
      subtotal,
      discount,
      total,
      dueAt,
    } = req.body;

    const existingOrder = await prisma.order.findUnique({
      where: {
        id,
      },
    });

    if (!existingOrder) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    const data: Prisma.OrderUpdateInput = {};

    if (customerId !== undefined) {
      const customerIdNumber = Number(customerId);

      if (Number.isNaN(customerIdNumber)) {
        return res.status(400).json({
          message: "Invalid customer ID.",
        });
      }

      const customer = await prisma.customer.findUnique({
        where: {
          id: customerIdNumber,
        },
      });

      if (!customer) {
        return res.status(404).json({
          message: "Customer not found.",
        });
      }

      data.customer = {
        connect: {
          id: customerIdNumber,
        },
      };
    }

    if (orderStatus !== undefined) {
      data.orderStatus = orderStatus as OrderStatus;
    }

    if (paymentStatus !== undefined) {
      data.paymentStatus = paymentStatus as PaymentStatus;
    }

    if (subtotal !== undefined) {
      data.subtotal = Number(subtotal);
    }

    if (discount !== undefined) {
      data.discount = Number(discount);
    }

    if (total !== undefined) {
      data.total = Number(total);
    }

    if (dueAt !== undefined) {
      data.dueAt = dueAt ? new Date(dueAt) : null;
    }

    const updatedOrder = await prisma.order.update({
      where: {
        id,
      },
      data,
    });

    return res.status(200).json({
      message: "Order updated successfully.",
      data: updatedOrder,
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    return res.status(500).json({
      message: "Failed to update order.",
    });
  }
};

export const deleteOrder = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    const existingOrder = await prisma.order.findUnique({
      where: {
        id,
      },
    });

    if (!existingOrder) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    await prisma.order.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      message: "Order deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return res.status(409).json({
        message:
          "Order cannot be deleted because it is still referenced by other data.",
      });
    }

    return res.status(500).json({
      message: "Failed to delete order.",
    });
  }
};