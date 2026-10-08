import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";

export const trackOrder = async (req: Request, res: Response) => {
  try {
    const { orderCode, phone } = req.body;

    const order = await prisma.order.findFirst({
      where: {
        orderCode,
        customer: {
          phone,
        },
      },
      select: {
        orderCode: true,
        orderStatus: true,
        paymentStatus: true,
        subtotal: true,
        discount: true,
        total: true,
        dueAt: true,
        createdAt: true,
        customer: {
          select: {
            name: true,
          },
        },
        orderStatusHistories: {
          select: {
            orderStatus: true,
            changedAt: true,
            note: true,
          },
          orderBy: {
            changedAt: "asc",
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found. Please check your order code and phone number.",
      });
    }

    return res.status(200).json({
      message: "Order tracking fetched successfully.",
      data: {
        orderCode: order.orderCode,
        customer: {
          name: order.customer.name,
        },
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        subtotal: order.subtotal,
        discount: order.discount,
        total: order.total,
        dueAt: order.dueAt,
        createdAt: order.createdAt,
        statusHistory: order.orderStatusHistories,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to track order.",
    });
  }
};