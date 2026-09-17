import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";

export const getAllOrderStatusHistories = async (req: Request, res: Response) => {
  try {
    const query = res.locals.validatedQuery ?? {};

    const orderStatusHistories =
      await prisma.orderStatusHistory.findMany({
        where: {
          ...(query.orderId !== undefined && {
            orderId: query.orderId,
          }),
          ...(query.status !== undefined && {
            orderStatus: query.status,
          }),
          ...(query.changedById !== undefined && {
            changedById: query.changedById,
          }),
        },
        include: {
          order: {
            include: {
              customer: true,
              orderItems: {
                include: {
                  service: true,
                },
              },
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

export const getOrderStatusHistoryById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
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
              orderItems: {
                include: {
                  service: true,
                },
              },
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