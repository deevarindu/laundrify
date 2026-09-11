import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";

import prisma from "../lib/prisma.js";

export const createOrderItem = async (req: Request, res: Response) => {
  try {
    const { orderId, serviceId, quantity } = req.body;

    const orderIdNumber = Number(orderId);
    const serviceIdNumber = Number(serviceId);
    const quantityNumber = Number(quantity);

    if (Number.isNaN(orderIdNumber)) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    if (Number.isNaN(serviceIdNumber)) {
      return res.status(400).json({
        message: "Invalid service ID.",
      });
    }

    if (Number.isNaN(quantityNumber) || quantityNumber <= 0) {
      return res.status(400).json({
        message: "Quantity must be greater than 0.",
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

    const service = await prisma.service.findUnique({
      where: {
        id: serviceIdNumber,
      },
    });

    if (!service) {
      return res.status(404).json({
        message: "Service not found.",
      });
    }

    if (!service.isActive) {
      return res.status(400).json({
        message: "Service is no longer active.",
      });
    }

    const priceSnapshot = service.price;
    const subtotal = priceSnapshot.mul(quantityNumber);

    const orderItem = await prisma.orderItem.create({
      data: {
        orderId: orderIdNumber,
        serviceId: serviceIdNumber,
        quantity: quantityNumber,
        priceSnapshot,
        subtotal,
      },
      include: {
        service: true,
      },
    });

    return res.status(201).json({
      message: "New order item successfully added.",
      data: orderItem,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to add new order item.",
    });
  }
};

export const updateOrderItem = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid order item ID.",
      });
    }

    const { orderId, serviceId, quantity } = req.body;

    const existingOrderItem = await prisma.orderItem.findUnique({
      where: {
        id,
      },
    });

    if (!existingOrderItem) {
      return res.status(404).json({
        message: "Order item not found.",
      });
    }

    const data: {
      orderId?: number;
      serviceId?: number;
      quantity?: number;
      priceSnapshot?: number;
      subtotal?: number;
    } = {};

    let priceSnapshot = Number(existingOrderItem.priceSnapshot);
    let quantityValue = Number(existingOrderItem.quantity);

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

      data.orderId = orderIdNumber;
    }

    if (serviceId !== undefined) {
      const serviceIdNumber = Number(serviceId);

      if (Number.isNaN(serviceIdNumber)) {
        return res.status(400).json({
          message: "Invalid service ID.",
        });
      }

      const service = await prisma.service.findUnique({
        where: {
          id: serviceIdNumber,
        },
      });

      if (!service) {
        return res.status(404).json({
          message: "Service not found.",
        });
      }

      if (!service.isActive) {
        return res.status(400).json({
          message: "Service is no longer active.",
        });
      }

      data.serviceId = serviceIdNumber;
      priceSnapshot = Number(service.price);
    }

    if (quantity !== undefined) {
      const quantityNumber = Number(quantity);

      if (Number.isNaN(quantityNumber) || quantityNumber <= 0) {
        return res.status(400).json({
          message: "Quantity must be greater than 0.",
        });
      }

      quantityValue = quantityNumber;
    }

    // Recalculate whenever quantity or service changes.
    if (serviceId !== undefined || quantity !== undefined) {
      data.priceSnapshot = priceSnapshot;
      data.quantity = quantityValue;
      data.subtotal = priceSnapshot * quantityValue;
    }

    const updatedOrderItem = await prisma.orderItem.update({
      where: {
        id,
      },
      data,
      include: {
        service: true,
      },
    });

    return res.status(200).json({
      message: "Order item updated successfully.",
      data: updatedOrderItem,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to update order item.",
    });
  }
};


export const deleteOrderItem = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid order item ID.",
      });
    }

    const orderItem = await prisma.orderItem.findUnique({
      where: {
        id,
      },
    });

    if (!orderItem) {
      return res.status(404).json({
        message: "Order item not found.",
      });
    }

    await prisma.orderItem.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      message: "Order item deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        message: "Order item not found.",
      });
    }

    return res.status(500).json({
      message: "Failed to delete order item.",
    });
  }
};