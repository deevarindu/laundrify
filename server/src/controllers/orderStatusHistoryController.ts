import type { Request, Response } from "express";
import { OrderStatus, Prisma } from "@prisma/client";

import prisma from "../lib/prisma.js";

export const getAllOrderStatusHistories = async (
  req: Request,
  res: Response
) => {
  try {
    const orderStatusHistories =
      await prisma.orderStatusHistory.findMany({
        include: {
          order: {
            include: {
              customer: true,
              orderItems: true,
              payment: true,
            },
          },
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
      });

    return res.status(200).json({
      message: "Order status histories fetched successfully.",
      data: orderStatusHistories,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch order status histories.",
    });
  }
};

export const getOrderStatusHistoryById = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid order status history ID.",
      });
    }

    const orderStatusHistory =
      await prisma.orderStatusHistory.findUnique({
        where: {
          id,
        },
        include: {
          order: {
            include: {
              customer: true,
              orderItems: true,
              payment: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

    if (!orderStatusHistory) {
      return res.status(404).json({
        message: "Order status history not found.",
      });
    }

    return res.status(200).json({
      message: "Order status history fetched successfully.",
      data: orderStatusHistory,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch order status history.",
    });
  }
};

export const createOrderStatusHistory = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      orderId,
      orderStatus,
      changedById,
      note,
    } = req.body;

    const orderIdNumber = Number(orderId);
    const changedByIdNumber = Number(changedById);

    if (Number.isNaN(orderIdNumber)) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    if (Number.isNaN(changedByIdNumber)) {
      return res.status(400).json({
        message: "Invalid user ID.",
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

    const user = await prisma.user.findUnique({
      where: {
        id: changedByIdNumber,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const orderStatusHistory =
      await prisma.orderStatusHistory.create({
        data: {
          orderId: orderIdNumber,
          orderStatus: orderStatus as OrderStatus,
          changedById: changedByIdNumber,
          ...(note !== undefined && {
            note,
          }),
        },
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
      });

    return res.status(201).json({
      message: "New order status history successfully added.",
      data: orderStatusHistory,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to add new order status history.",
    });
  }
};

export const updateOrderStatusHistory = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid order status history ID.",
      });
    }

    const {
      orderId,
      orderStatus,
      changedById,
      note,
    } = req.body;

    const existingHistory =
      await prisma.orderStatusHistory.findUnique({
        where: {
          id,
        },
      });

    if (!existingHistory) {
      return res.status(404).json({
        message: "Order status history not found.",
      });
    }

    const data: Prisma.OrderStatusHistoryUpdateInput = {};

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

      data.order = {
        connect: {
          id: orderIdNumber,
        },
      };
    }

    if (orderStatus !== undefined) {
      data.orderStatus = orderStatus as OrderStatus;
    }

    if (changedById !== undefined) {
      const changedByIdNumber = Number(changedById);

      if (Number.isNaN(changedByIdNumber)) {
        return res.status(400).json({
          message: "Invalid user ID.",
        });
      }

      const user = await prisma.user.findUnique({
        where: {
          id: changedByIdNumber,
        },
      });

      if (!user) {
        return res.status(404).json({
          message: "User not found.",
        });
      }

      data.user = {
        connect: {
          id: changedByIdNumber,
        },
      };
    }

    if (note !== undefined) {
      data.note = note;
    }

    const updatedHistory =
      await prisma.orderStatusHistory.update({
        where: {
          id,
        },
        data,
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
      });

    return res.status(200).json({
      message: "Order status history updated successfully.",
      data: updatedHistory,
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        message: "Order status history not found.",
      });
    }

    return res.status(500).json({
      message: "Failed to update order status history.",
    });
  }
};

export const deleteOrderStatusHistory = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid order status history ID.",
      });
    }

    const orderStatusHistory =
      await prisma.orderStatusHistory.findUnique({
        where: {
          id,
        },
      });

    if (!orderStatusHistory) {
      return res.status(404).json({
        message: "Order status history not found.",
      });
    }

    await prisma.orderStatusHistory.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      message: "Order status history deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        message: "Order status history not found.",
      });
    }

    return res.status(500).json({
      message: "Failed to delete order status history.",
    });
  }
};