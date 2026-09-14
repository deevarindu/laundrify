import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";

const recalculateOrder = async (tx: Prisma.TransactionClient, orderId: number) => {
  const order = await tx.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      customer: {
        include: {
          membership: true,
        },
      },
      orderItems: true,
    },
  });

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  let subtotal = new Prisma.Decimal(0);

  for (const item of order.orderItems) {
    subtotal = subtotal.plus(item.subtotal);
  }

  let discount = new Prisma.Decimal(0);

  if (
    order.customer.membership &&
    order.customer.membership.isActive
  ) {
    discount = subtotal
      .mul(order.customer.membership.discountPercent)
      .div(100);
  }

  const total = subtotal.minus(discount);

  return tx.order.update({
    where: {
      id: orderId,
    },
    data: {
      subtotal,
      discount,
      total,
    },
  });
};

export const createOrderItem = async (req: Request, res: Response) => {
  try {
    const { orderId, serviceId, quantity } = req.body;

    const orderIdNumber = Number(orderId);
    const serviceIdNumber = Number(serviceId);
    const quantityNumber = Number(quantity);

    if (!Number.isInteger(orderIdNumber) || orderIdNumber <= 0) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    if (!Number.isInteger(serviceIdNumber) || serviceIdNumber <= 0) {
      return res.status(400).json({
        message: "Invalid service ID.",
      });
    }

    if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
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

    if (order.orderStatus === "SELESAI") {
      return res.status(409).json({
        message: "Cannot modify items of a completed order.",
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

    if (
      service.unit === "SATUAN" &&
      !Number.isInteger(quantityNumber)
    ) {
      return res.status(400).json({
        message: `Quantity for ${service.name} must be a whole number.`,
      });
    }

    const existingItem = await prisma.orderItem.findFirst({
      where: {
        orderId: orderIdNumber,
        serviceId: serviceIdNumber,
      },
    });

    if (existingItem) {
      return res.status(409).json({
        message: "This service is already included in the order.",
      });
    }

    const priceSnapshot = service.price;
    const subtotal = priceSnapshot.mul(quantityNumber);

    const result = await prisma.$transaction(async (tx) => {
      const orderItem = await tx.orderItem.create({
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

      await recalculateOrder(tx, orderIdNumber);

      return orderItem;
    });

    return res.status(201).json({
      message: "New order item successfully added.",
      data: result,
    });
  } catch (error) {
    console.error(error);

    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    return res.status(500).json({
      message: "Failed to add new order item.",
    });
  }
};

export const updateOrderItem = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid order item ID.",
      });
    }

    const { serviceId, quantity } = req.body;

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

    const order = await prisma.order.findUnique({
      where: {
        id: existingOrderItem.orderId,
      },
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    if (order.orderStatus === "SELESAI") {
      return res.status(409).json({
        message: "Cannot modify items of a completed order.",
      });
    }

    let selectedService = await prisma.service.findUnique({
      where: {
        id: existingOrderItem.serviceId,
      },
    });

    let serviceIdNumber = existingOrderItem.serviceId;
    let quantityNumber = Number(existingOrderItem.quantity);

    if (serviceId !== undefined) {
      serviceIdNumber = Number(serviceId);

      if (
        !Number.isInteger(serviceIdNumber) ||
        serviceIdNumber <= 0
      ) {
        return res.status(400).json({
          message: "Invalid service ID.",
        });
      }

      selectedService = await prisma.service.findUnique({
        where: {
          id: serviceIdNumber,
        },
      });

      if (!selectedService) {
        return res.status(404).json({
          message: "Service not found.",
        });
      }

      if (!selectedService.isActive) {
        return res.status(400).json({
          message: "Service is no longer active.",
        });
      }
    }

    if (quantity !== undefined) {
      quantityNumber = Number(quantity);

      if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) {
        return res.status(400).json({
          message: "Quantity must be greater than 0.",
        });
      }
    }

    if (!selectedService) {
      return res.status(404).json({
        message: "Service not found.",
      });
    }

    if (
      selectedService.unit === "SATUAN" &&
      !Number.isInteger(quantityNumber)
    ) {
      return res.status(400).json({
        message: `Quantity for ${selectedService.name} must be a whole number.`,
      });
    }

    if (serviceIdNumber !== existingOrderItem.serviceId) {
      const duplicateItem = await prisma.orderItem.findFirst({
        where: {
          orderId: existingOrderItem.orderId,
          serviceId: serviceIdNumber,
          NOT: {
            id,
          },
        },
      });

      if (duplicateItem) {
        return res.status(409).json({
          message: "This service is already included in the order.",
        });
      }
    }

    const priceSnapshot = selectedService.price;
    const subtotal = priceSnapshot.mul(quantityNumber);

    const result = await prisma.$transaction(async (tx) => {
      const updatedOrderItem = await tx.orderItem.update({
        where: {
          id,
        },
        data: {
          serviceId: serviceIdNumber,
          quantity: quantityNumber,
          priceSnapshot,
          subtotal,
        },
        include: {
          service: true,
        },
      });

      await recalculateOrder(tx, existingOrderItem.orderId);

      return updatedOrderItem;
    });

    return res.status(200).json({
      message: "Order item updated successfully.",
      data: result,
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

    if (!Number.isInteger(id) || id <= 0) {
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

    const order = await prisma.order.findUnique({
      where: {
        id: orderItem.orderId,
      },
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    if (order.orderStatus === "SELESAI") {
      return res.status(409).json({
        message: "Cannot modify items of a completed order.",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.delete({
        where: {
          id,
        },
      });

      const remainingItems = await tx.orderItem.count({
        where: {
          orderId: orderItem.orderId,
        },
      });

      if (remainingItems === 0) {
        await tx.order.delete({
          where: {
            id: orderItem.orderId,
          },
        });

        return;
      }

      await recalculateOrder(tx, orderItem.orderId);
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