import type { Request, Response } from "express";

import { Prisma, OrderStatus, PaymentStatus } from "@prisma/client";

import prisma from "../lib/prisma.js";

const statusTransitions: Record<OrderStatus, OrderStatus[]> = {
  PESANAN_DITERIMA: [
    OrderStatus.DICUCI,
    OrderStatus.DIBATALKAN,
  ],
  DICUCI: [
    OrderStatus.DIKERINGKAN,
  ],
  DIKERINGKAN: [
    OrderStatus.DISETRIKA,
  ],
  DISETRIKA: [
    OrderStatus.SIAP_DIAMBIL,
  ],
  SIAP_DIAMBIL: [
    OrderStatus.SELESAI,
  ],
  SELESAI: [],
  DIBATALKAN: [],
};

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const query = res.locals.validatedQuery ?? {};
    const q = query.q ?? "";
    const orderStatus = query.orderStatus;
    const paymentStatus = query.paymentStatus;

    const orders = await prisma.order.findMany({
      where: {
        ...(orderStatus !== undefined && {
          orderStatus,
        }),
        ...(paymentStatus !== undefined && {
          paymentStatus,
        }),
        ...(q && {
          OR: [
            {
              orderCode: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              customer: {
                name: {
                  contains: q,
                  mode: "insensitive",
                },
              },
            },
            {
              customer: {
                phone: {
                  contains: q,
                  mode: "insensitive",
                },
              },
            },
          ],
        }),
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

    if (!Number.isInteger(id) || id <= 0) {
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
        payment: {
          include: {
            receivedBy: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
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
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const { customerId, items, dueAt } = req.body;

    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
      include: {
        membership: true,
      },
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found.",
      });
    }

    const serviceIds = items.map(
      (item: {
        serviceId: number;
        quantity: number;
      }) => item.serviceId
    );

    const uniqueServiceIds = new Set(serviceIds);

    if (uniqueServiceIds.size !== serviceIds.length) {
      return res.status(400).json({
        message:
          "The same service cannot be added more than once.",
      });
    }

    const services = await prisma.service.findMany({
      where: {
        id: {
          in: serviceIds,
        },
        isActive: true,
      },
    });

    if (services.length !== serviceIds.length) {
      return res.status(404).json({
        message:
          "One or more services were not found or are inactive.",
      });
    }

    const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];

    let subtotal = new Prisma.Decimal(0);

    for (const item of items) {
      const service = services.find(
        (service) => service.id === item.serviceId
      );

      if (!service) {
        return res.status(404).json({
          message: `Service with ID ${item.serviceId} not found.`,
        });
      }

      if (
        service.unit === "SATUAN" &&
        !Number.isInteger(item.quantity)
      ) {
        return res.status(400).json({
          message: `Quantity for ${service.name} must be a whole number.`,
        });
      }

      const priceSnapshot = service.price;
      const itemSubtotal = priceSnapshot.mul(item.quantity);

      subtotal = subtotal.plus(itemSubtotal);

      orderItems.push({
        service: {
          connect: {
            id: service.id,
          },
        },
        quantity: item.quantity,
        priceSnapshot,
        subtotal: itemSubtotal,
      });
    }

    let discount = new Prisma.Decimal(0);

    if (
      customer.membership &&
      customer.membership.isActive
    ) {
      discount = subtotal
        .mul(customer.membership.discountPercent)
        .div(100);
    }

    const total = subtotal.minus(discount);

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderCode: `ORD-${Date.now()}-${Math.floor(
            Math.random() * 1000
          )}`,
          customerId: customer.id,
          createdById: req.user!.userId,
          orderStatus: OrderStatus.PESANAN_DITERIMA,
          paymentStatus: PaymentStatus.BELUM_DIBAYAR,
          subtotal,
          discount,
          total,
          ...(dueAt !== undefined && {
            dueAt,
          }),
          orderItems: {
            create: orderItems,
          },
          orderStatusHistories: {
            create: {
              orderStatus: OrderStatus.PESANAN_DITERIMA,
              changedById: req.user!.userId,
              note: "Order created.",
            },
          },
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
          payment: {
            include: {
              receivedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
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

      return newOrder;
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

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    const { customerId, dueAt } = req.body;

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

    if (existingOrder.orderStatus === OrderStatus.SELESAI) {
      return res.status(409).json({
        message: "Completed order cannot be modified.",
      });
    }

    if (existingOrder.orderStatus === OrderStatus.DIBATALKAN) {
      return res.status(409).json({
        message: "Cancelled order cannot be modified.",
      });
    }

    if (customerId !== undefined) {
      const customer = await prisma.customer.findUnique({
        where: {
          id: customerId,
        },
      });

      if (!customer) {
        return res.status(404).json({
          message: "Customer not found.",
        });
      }
    }

    if (
      customerId === undefined &&
      dueAt === undefined
    ) {
      return res.status(400).json({
        message: "No fields to update.",
      });
    }

    const data: Prisma.OrderUpdateInput = {};

    if (customerId !== undefined) {
      data.customer = {
        connect: {
          id: customerId,
        },
      };
    }

    if (dueAt !== undefined) {
      data.dueAt = dueAt;
    }

    const updatedOrder = await prisma.order.update({
      where: {
        id,
      },
      data,
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
        payment: {
          include: {
            receivedBy: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
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

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const id = Number(req.params.id);
    const { status, note } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    const order = await prisma.order.findUnique({
      where: {
        id,
      },
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    if (!statusTransitions[order.orderStatus].includes(status)) {
      return res.status(400).json({
        message: `Order cannot change from ${order.orderStatus} to ${status}.`,
      });
    }

    if (
      status === OrderStatus.SELESAI &&
      order.paymentStatus !== PaymentStatus.SUDAH_DIBAYAR
    ) {
      return res.status(400).json({
        message:
          "Order must be fully paid before it can be completed.",
      });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: {
          id,
        },
        data: {
          orderStatus: status,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          orderStatus: status,
          changedById: req.user!.userId,
          note: note ?? null,
        },
      });

      return tx.order.findUnique({
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
          payment: {
            include: {
              receivedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
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
    });

    return res.status(200).json({
      message: "Order status updated successfully.",
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
      message: "Failed to update order status.",
    });
  }
};

export const deleteOrder = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
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

    if (
      existingOrder.orderStatus !== OrderStatus.PESANAN_DITERIMA &&
      existingOrder.orderStatus !== OrderStatus.DIBATALKAN
    ) {
      return res.status(409).json({
        message:
          "Order can only be deleted before processing or after cancellation.",
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