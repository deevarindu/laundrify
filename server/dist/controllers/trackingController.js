import prisma from "../lib/prisma.js";
export const trackOrder = async (req, res) => {
    const orderCode = typeof req.body?.orderCode === "string"
        ? req.body.orderCode.trim()
        : "";
    const phone = typeof req.body?.phone === "string"
        ? req.body.phone.trim()
        : "";
    if (!orderCode || !phone) {
        return res.status(400).json({
            message: "Tracking code and phone number are required.",
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
                deliveryRequest: {
                    select: {
                        id: true,
                        requestCode: true,
                        type: true,
                        address: true,
                        status: true,
                        scheduledDate: true,
                        scheduledStartTime: true,
                        scheduledEndTime: true,
                        createdAt: true,
                        updatedAt: true,
                        processedAt: true,
                    },
                },
            },
        });
        if (order) {
            return res.status(200).json({
                message: "Tracking information fetched successfully.",
                data: {
                    type: "ORDER",
                    order,
                },
            });
        }
        const request = await prisma.pickupDeliveryRequest.findFirst({
            where: {
                requestCode: orderCode,
                phone,
            },
            select: {
                id: true,
                requestCode: true,
                name: true,
                phone: true,
                type: true,
                address: true,
                status: true,
                scheduledDate: true,
                scheduledStartTime: true,
                scheduledEndTime: true,
                createdAt: true,
                updatedAt: true,
                processedAt: true,
                service: {
                    select: {
                        name: true,
                        category: true,
                        unit: true,
                        price: true,
                    },
                },
                order: {
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
                },
            },
        });
        if (!request) {
            return res.status(404).json({
                message: "Tracking data not found. Check your tracking code and phone number.",
            });
        }
        return res.status(200).json({
            message: "Tracking information fetched successfully.",
            data: {
                type: "REQUEST",
                request,
            },
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to fetch tracking information.",
        });
    }
};
