import { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
const recalculateOrder = async (tx, orderId) => {
    const order = await tx.order.findUnique({
        where: {
            id: orderId,
        },
        include: {
            orderItems: true,
        },
    });
    if (!order) {
        throw new Error("ORDER_NOT_FOUND");
    }
    if (order.orderItems.length === 0) {
        throw new Error("ORDER_MUST_HAVE_ITEM");
    }
    let subtotal = new Prisma.Decimal(0);
    for (const item of order.orderItems) {
        subtotal = subtotal.plus(item.subtotal);
    }
    const previousSubtotal = order.subtotal;
    let discountPercent = new Prisma.Decimal(0);
    if (previousSubtotal.gt(0) && order.discount.gt(0)) {
        discountPercent = order.discount
            .mul(100)
            .div(previousSubtotal);
    }
    const discount = subtotal
        .mul(discountPercent)
        .div(100);
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
export const createOrderItem = async (req, res) => {
    try {
        const { orderId, serviceId, quantity } = req.body;
        const order = await prisma.order.findUnique({
            where: {
                id: orderId,
            },
        });
        if (!order) {
            return res.status(404).json({
                message: "Order not found.",
            });
        }
        if (order.orderStatus === "SELESAI" ||
            order.orderStatus === "DIBATALKAN") {
            return res.status(409).json({
                message: "Cannot modify items of this order.",
            });
        }
        if (order.paymentStatus === "SUDAH_DIBAYAR") {
            return res.status(409).json({
                message: "Cannot modify items of a paid order.",
            });
        }
        const service = await prisma.service.findUnique({
            where: {
                id: serviceId,
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
        if (service.unit === "SATUAN" &&
            !Number.isInteger(quantity)) {
            return res.status(400).json({
                message: `Quantity for ${service.name} must be a whole number.`,
            });
        }
        const existingItem = await prisma.orderItem.findFirst({
            where: {
                orderId,
                serviceId,
            },
        });
        if (existingItem) {
            return res.status(409).json({
                message: "This service is already included in the order.",
            });
        }
        const priceSnapshot = service.price;
        const subtotal = priceSnapshot.mul(quantity);
        const result = await prisma.$transaction(async (tx) => {
            const orderItem = await tx.orderItem.create({
                data: {
                    orderId,
                    serviceId,
                    quantity,
                    priceSnapshot,
                    subtotal,
                },
                include: {
                    service: true,
                },
            });
            await recalculateOrder(tx, orderId);
            return orderItem;
        });
        return res.status(201).json({
            message: "New order item successfully added.",
            data: result,
        });
    }
    catch (error) {
        console.error(error);
        if (error instanceof Error &&
            error.message === "ORDER_NOT_FOUND") {
            return res.status(404).json({
                message: "Order not found.",
            });
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002") {
            return res.status(409).json({
                message: "This service is already included in the order.",
            });
        }
        return res.status(500).json({
            message: "Failed to add new order item.",
        });
    }
};
export const updateOrderItem = async (req, res) => {
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
        if (order.orderStatus === "SELESAI" ||
            order.orderStatus === "DIBATALKAN") {
            return res.status(409).json({
                message: "Cannot modify items of this order.",
            });
        }
        if (order.paymentStatus === "SUDAH_DIBAYAR") {
            return res.status(409).json({
                message: "Cannot modify items of a paid order.",
            });
        }
        let serviceIdNumber = existingOrderItem.serviceId;
        let quantityNumber = Number(existingOrderItem.quantity);
        if (serviceId !== undefined) {
            serviceIdNumber = serviceId;
        }
        if (quantity !== undefined) {
            quantityNumber = quantity;
        }
        const selectedService = await prisma.service.findUnique({
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
        if (selectedService.unit === "SATUAN" &&
            !Number.isInteger(quantityNumber)) {
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
    }
    catch (error) {
        console.error(error);
        if (error instanceof Error &&
            error.message === "ORDER_MUST_HAVE_ITEM") {
            return res.status(400).json({
                message: "Order must contain at least one item.",
            });
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025") {
            return res.status(404).json({
                message: "Order item not found.",
            });
        }
        return res.status(500).json({
            message: "Failed to update order item.",
        });
    }
};
export const deleteOrderItem = async (req, res) => {
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
            include: {
                _count: {
                    select: {
                        orderItems: true,
                    },
                },
            },
        });
        if (!order) {
            return res.status(404).json({
                message: "Order not found.",
            });
        }
        if (order.orderStatus === "SELESAI" ||
            order.orderStatus === "DIBATALKAN") {
            return res.status(409).json({
                message: "Cannot modify items of this order.",
            });
        }
        if (order.paymentStatus === "SUDAH_DIBAYAR") {
            return res.status(409).json({
                message: "Cannot modify items of a paid order.",
            });
        }
        if (order._count.orderItems <= 1) {
            return res.status(400).json({
                message: "Order must contain at least one item.",
            });
        }
        await prisma.$transaction(async (tx) => {
            await tx.orderItem.delete({
                where: {
                    id,
                },
            });
            await recalculateOrder(tx, orderItem.orderId);
        });
        return res.status(200).json({
            message: "Order item deleted successfully.",
        });
    }
    catch (error) {
        console.error(error);
        if (error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025") {
            return res.status(404).json({
                message: "Order item not found.",
            });
        }
        return res.status(500).json({
            message: "Failed to delete order item.",
        });
    }
};
