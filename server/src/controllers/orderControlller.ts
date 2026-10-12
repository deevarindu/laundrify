
import type { Request, Response } from "express";
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
} from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import { emitOrderStatusChanged } from "../lib/socketEvent.js";

const statusTransitions: Record<OrderStatus, OrderStatus[]> = {
  PESANAN_DITERIMA: [OrderStatus.DICUCI, OrderStatus.DIBATALKAN],
  DICUCI: [OrderStatus.DIKERINGKAN],
  DIKERINGKAN: [OrderStatus.DISETRIKA],
  DISETRIKA: [OrderStatus.SIAP_DIAMBIL],
  SIAP_DIAMBIL: [OrderStatus.SELESAI],
  SELESAI: [],
  DIBATALKAN: [],
};

const orderInclude = {
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
        },
      },
    },
    orderBy: {
      changedAt: "desc" as const,
    },
  },
};

const getValidatedQuery = (res: Response) =>
  (res.locals.validatedQuery ?? {}) as {
    q?: string;
    orderStatus?: OrderStatus;
    paymentStatus?: PaymentStatus;
  };

export const getAllOrders = async (
  req: Request,
  res: Response
) => {
  try {
    const { q, orderStatus, paymentStatus } = getValidatedQuery(res);

    const orders = await prisma.order.findMany({
      where: {
        ...(orderStatus ? { orderStatus } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
        ...(q
          ? {
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
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: orderInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({ data: orders });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch orders.",
    });
  }
};

export const getOrderById = async (
  req: Request,
  res: Response
) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      message: "Invalid order ID.",
    });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    return res.status(200).json({ data: order });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch order.",
    });
  }
};

export const trackOrder = async (
  req: Request,
  res: Response
) => {
  const orderCode =
    typeof req.body?.orderCode === "string"
      ? req.body.orderCode.trim()
      : "";

  const phone =
    typeof req.body?.phone === "string"
      ? req.body.phone.trim()
      : "";

  if (
    !orderCode ||
    !phone ||
    orderCode.length > 100 ||
    phone.length > 30
  ) {
    return res.status(400).json({
      message: "Order code and phone number are required.",
    });
  }

  try {
    const order = await prisma.order.findFirst({
      where: {
        orderCode,
        customer: {
          phone,
        },
      },
      select: {
        id: true,
        orderCode: true,
        orderStatus: true,
        paymentStatus: true,
        subtotal: true,
        discount: true,
        total: true,
        dueAt: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            name: true,
          },
        },
        orderItems: {
          select: {
            id: true,
            quantity: true,
            priceSnapshot: true,
            subtotal: true,
            service: {
              select: {
                name: true,
                unit: true,
              },
            },
          },
        },
        orderStatusHistories: {
          select: {
            id: true,
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
        message: "Order not found. Check your order code and phone number.",
      });
    }

    return res.status(200).json({ data: order });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to track order.",
    });
  }
};

export const createOrder = async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized.",
    });
  }

  const userId = req.user.userId;
  const { customer, items, dueAt } = req.body;

  if (
    !customer ||
    typeof customer.name !== "string" ||
    !customer.name.trim() ||
    typeof customer.phone !== "string" ||
    !customer.phone.trim()
  ) {
    return res.status(400).json({
      message: "Customer name and phone are required.",
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "At least one order item is required.",
    });
  }

  if (dueAt !== undefined && dueAt !== null && dueAt !== "") {
    const dueDate = new Date(dueAt);

    if (Number.isNaN(dueDate.getTime())) {
      return res.status(400).json({
        message: "Invalid due date.",
      });
    }
  }

  const normalizedPhone = customer.phone.trim();
  const normalizedName = customer.name.trim();
  const normalizedAddress =
    typeof customer.address === "string"
      ? customer.address.trim() || null
      : null;

  try {
    const order = await prisma.$transaction(
      async (tx) => {
        let customerRecord = await tx.customer.findUnique({
          where: { phone: normalizedPhone },
        });

        if (customerRecord && !customerRecord.isActive) {
          throw new Error("CUSTOMER_INACTIVE");
        }

        if (!customerRecord) {
          customerRecord = await tx.customer.create({
            data: {
              name: normalizedName,
              phone: normalizedPhone,
              address: normalizedAddress,
            },
          });
        }

        const customerWithMembership = await tx.customer.findUnique({
          where: { id: customerRecord.id },
          include: { membership: true },
        });

        if (!customerWithMembership) {
          throw new Error("CUSTOMER_NOT_FOUND");
        }

        const normalizedItems = items.map(
          (item: { serviceId: unknown; quantity: unknown }) => {
            const serviceId = Number(item.serviceId);
            const quantity = Number(item.quantity);

            if (!Number.isInteger(serviceId) || serviceId <= 0) {
              throw new Error("INVALID_SERVICES");
            }

            if (!Number.isFinite(quantity) || quantity <= 0) {
              throw new Error("INVALID_QUANTITY");
            }

            return { serviceId, quantity };
          }
        );

        const serviceIds = normalizedItems.map(
          (item: { serviceId: number }) => item.serviceId
        );

        if (new Set(serviceIds).size !== serviceIds.length) {
          throw new Error("DUPLICATE_SERVICES");
        }

        const services = await tx.service.findMany({
          where: {
            id: { in: serviceIds },
            isActive: true,
          },
        });

        if (services.length !== serviceIds.length) {
          throw new Error("INVALID_SERVICES");
        }

        let subtotal = new Prisma.Decimal(0);

        const orderItems = normalizedItems.map(
          (item: { serviceId: number; quantity: number }) => {
            const service = services.find(
              (entry) => entry.id === item.serviceId
            );

            if (!service) {
              throw new Error("INVALID_SERVICES");
            }

            if (
              service.unit === "SATUAN" &&
              !Number.isInteger(item.quantity)
            ) {
              throw new Error("INVALID_UNIT_QUANTITY");
            }

            const priceSnapshot = new Prisma.Decimal(service.price);
            const itemSubtotal = priceSnapshot.mul(item.quantity);

            subtotal = subtotal.add(itemSubtotal);

            return {
              serviceId: service.id,
              quantity: item.quantity,
              priceSnapshot,
              subtotal: itemSubtotal,
            };
          }
        );

        const membership = customerWithMembership.membership;

        const discountPercent = membership?.isActive
          ? new Prisma.Decimal(membership.discountPercent)
          : new Prisma.Decimal(0);

        const discount = subtotal
          .mul(discountPercent)
          .div(100)
          .toDecimalPlaces(2);

        const total = subtotal.sub(discount);

        const orderCode =
          `ORD-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

        const createdOrder = await tx.order.create({
          data: {
            orderCode,
            customerId: customerWithMembership.id,
            createdById: userId,
            orderStatus: OrderStatus.PESANAN_DITERIMA,
            paymentStatus: PaymentStatus.BELUM_DIBAYAR,
            subtotal,
            discount,
            total,
            dueAt:
              dueAt !== undefined && dueAt !== null && dueAt !== ""
                ? new Date(dueAt)
                : null,
            orderItems: {
              create: orderItems,
            },
            orderStatusHistories: {
              create: {
                orderStatus: OrderStatus.PESANAN_DITERIMA,
                changedById: userId,
                note: "Laundry physically received and order created.",
              },
            },
          },
          include: orderInclude,
        });

        return createdOrder;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return res.status(201).json({
      message: "Order created successfully.",
      data: order,
    });
  } catch (error) {
    if (error instanceof Error) {
      const responses: Record<
        string,
        { status: number; message: string }
      > = {
        CUSTOMER_INACTIVE: {
          status: 400,
          message: "This customer is inactive.",
        },
        CUSTOMER_NOT_FOUND: {
          status: 404,
          message: "Customer could not be found.",
        },
        DUPLICATE_SERVICES: {
          status: 400,
          message: "Each service can only be added once.",
        },
        INVALID_SERVICES: {
          status: 400,
          message: "One or more services are unavailable or invalid.",
        },
        INVALID_QUANTITY: {
          status: 400,
          message: "Quantity must be greater than zero.",
        },
        INVALID_UNIT_QUANTITY: {
          status: 400,
          message: "Satuan services require a whole number quantity.",
        },
      };

      const response = responses[error.message];

      if (response) {
        return res.status(response.status).json({
          message: response.message,
        });
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      return res.status(409).json({
        message:
          "The order or customer data changed during this request. Please retry.",
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Failed to create order.",
    });
  }
};

export const updateOrder = async (
  req: Request,
  res: Response
) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      message: "Invalid order ID.",
    });
  }

  const { customerId, dueAt } = req.body;

  if (customerId === undefined && dueAt === undefined) {
    return res.status(400).json({
      message: "No fields to update.",
    });
  }

  let parsedCustomerId: number | undefined;

  if (customerId !== undefined) {
    parsedCustomerId = Number(customerId);

    if (!Number.isInteger(parsedCustomerId) || parsedCustomerId <= 0) {
      return res.status(400).json({
        message: "Invalid customer ID.",
      });
    }
  }

  let parsedDueAt: Date | null | undefined;

  if (dueAt !== undefined) {
    if (dueAt === null || dueAt === "") {
      parsedDueAt = null;
    } else {
      parsedDueAt = new Date(dueAt);

      if (Number.isNaN(parsedDueAt.getTime())) {
        return res.status(400).json({
          message: "Invalid due date.",
        });
      }
    }
  }

  try {
    const order = await prisma.$transaction(
      async (tx) => {
        const existingOrder = await tx.order.findUnique({
          where: { id },
        });

        if (!existingOrder) {
          throw new Error("ORDER_NOT_FOUND");
        }

        if (
          existingOrder.orderStatus === OrderStatus.SELESAI ||
          existingOrder.orderStatus === OrderStatus.DIBATALKAN
        ) {
          throw new Error("ORDER_NOT_EDITABLE");
        }

        if (parsedCustomerId !== undefined) {
          const customer = await tx.customer.findFirst({
            where: {
              id: parsedCustomerId,
              isActive: true,
            },
          });

          if (!customer) {
            throw new Error("CUSTOMER_NOT_FOUND_OR_INACTIVE");
          }
        }

        return tx.order.update({
          where: { id },
          data: {
            ...(parsedCustomerId !== undefined
              ? { customerId: parsedCustomerId }
              : {}),
            ...(parsedDueAt !== undefined
              ? { dueAt: parsedDueAt }
              : {}),
          },
          include: orderInclude,
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return res.status(200).json({
      message: "Order updated successfully.",
      data: order,
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
        ORDER_NOT_EDITABLE: {
          status: 409,
          message: "Completed or cancelled orders cannot be updated.",
        },
        CUSTOMER_NOT_FOUND_OR_INACTIVE: {
          status: 400,
          message: "Customer not found or inactive.",
        },
      };

      const response = responses[error.message];

      if (response) {
        return res.status(response.status).json({
          message: response.message,
        });
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return res.status(409).json({
        message:
          "The order changed during this request. Please refresh and retry.",
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Failed to update order.",
    });
  }
};

export const updateOrderStatus = async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized.",
    });
  }

  const userId = req.user.userId;
  const id = Number(req.params.id);
  const { status, note } = req.body;

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      message: "Invalid order ID.",
    });
  }

  if (
    typeof status !== "string" ||
    !Object.values(OrderStatus).includes(status as OrderStatus)
  ) {
    return res.status(400).json({
      message: "Invalid order status.",
    });
  }

  try {
    const order = await prisma.$transaction(
      async (tx) => {
        const existingOrder = await tx.order.findUnique({
          where: { id },
        });

        if (!existingOrder) {
          throw new Error("ORDER_NOT_FOUND");
        }

        const allowedTransitions =
          statusTransitions[existingOrder.orderStatus];

        if (!allowedTransitions.includes(status as OrderStatus)) {
          throw new Error("INVALID_STATUS_TRANSITION");
        }

        if (status === OrderStatus.SELESAI) {
          if (
            existingOrder.paymentStatus !== PaymentStatus.SUDAH_DIBAYAR
          ) {
            throw new Error("ORDER_NOT_PAID");
          }

          const payment = await tx.payment.findUnique({
            where: { orderId: id },
          });

          if (!payment) {
            throw new Error("PAYMENT_NOT_FOUND");
          }
        }

        const updated = await tx.order.update({
          where: { id },
          data: {
            orderStatus: status as OrderStatus,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: id,
            orderStatus: status as OrderStatus,
            changedById: userId,
            note:
              typeof note === "string" && note.trim()
                ? note.trim()
                : null,
          },
        });

        return tx.order.findUniqueOrThrow({
          where: { id: updated.id },
          include: orderInclude,
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    emitOrderStatusChanged(order);

    return res.status(200).json({
      message: "Order status updated successfully.",
      data: order,
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
        INVALID_STATUS_TRANSITION: {
          status: 409,
          message: "Invalid order status transition.",
        },
        ORDER_NOT_PAID: {
          status: 409,
          message: "An order can only be completed after payment.",
        },
        PAYMENT_NOT_FOUND: {
          status: 409,
          message: "Payment record not found for this order.",
        },
      };

      const response = responses[error.message];

      if (response) {
        return res.status(response.status).json({
          message: response.message,
        });
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return res.status(409).json({
        message:
          "The order changed during this request. Please refresh and retry.",
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Failed to update order status.",
    });
  }
};

export const deleteOrder = async (
  req: Request,
  res: Response
) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      message: "Invalid order ID.",
    });
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { id },
          include: {
            payment: true,
            orderStatusHistories: {
              select: { id: true },
            },
          },
        });

        if (!order) {
          throw new Error("ORDER_NOT_FOUND");
        }

        if (
          order.orderStatus !== OrderStatus.PESANAN_DITERIMA ||
          order.paymentStatus !== PaymentStatus.BELUM_DIBAYAR
        ) {
          throw new Error("ORDER_NOT_DELETABLE");
        }

        if (order.payment) {
          throw new Error("ORDER_HAS_PAYMENT");
        }

        if (order.orderStatusHistories.length > 1) {
          throw new Error("ORDER_HAS_STATUS_HISTORY");
        }

        await tx.orderStatusHistory.deleteMany({
          where: { orderId: id },
        });

        await tx.orderItem.deleteMany({
          where: { orderId: id },
        });

        await tx.order.delete({
          where: { id },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return res.status(200).json({
      message: "Order deleted successfully.",
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
        ORDER_NOT_DELETABLE: {
          status: 409,
          message:
            "Only unpaid orders in the received status can be deleted.",
        },
        ORDER_HAS_PAYMENT: {
          status: 409,
          message: "Orders with payment records cannot be deleted.",
        },
        ORDER_HAS_STATUS_HISTORY: {
          status: 409,
          message: "Orders with status history cannot be deleted.",
        },
      };

      const response = responses[error.message];

      if (response) {
        return res.status(response.status).json({
          message: response.message,
        });
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2003" || error.code === "P2034")
    ) {
      return res.status(409).json({
        message:
          "The order cannot be deleted because related records exist or the order changed. Please refresh and retry.",
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Failed to delete order.",
    });
  }
};
