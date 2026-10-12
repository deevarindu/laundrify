import { randomBytes } from "node:crypto";
import { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import { emitNewPickupDeliveryRequest, emitOrderStatusChanged, emitPickupDeliveryStatusChanged, } from "../lib/socketEvent.js";
const getJakartaDateParts = (date) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return {
        year: Number(values.year),
        month: Number(values.month),
        day: Number(values.day),
        hour: Number(values.hour),
    };
};
const getDeliverySchedule = (now = new Date()) => {
    const jakarta = getJakartaDateParts(now);
    const scheduleDate = new Date(Date.UTC(jakarta.year, jakarta.month - 1, jakarta.day));
    if (jakarta.hour >= 16) {
        scheduleDate.setUTCDate(scheduleDate.getUTCDate() + 1);
    }
    return {
        scheduledDate: scheduleDate,
        scheduledStartTime: "13:00",
        scheduledEndTime: "16:00",
    };
};
const isValidDeliverySchedule = (date, start, end) => {
    if (start !== "13:00" || end !== "16:00") {
        return false;
    }
    const now = new Date();
    const today = getDeliverySchedule(now).scheduledDate;
    const requestedDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    return requestedDate.getTime() >= today.getTime();
};
export const createPickupDeliveryRequest = async (req, res) => {
    const { name, phone, address, type, serviceId } = req.body;
    if (typeof name !== "string" ||
        !name.trim() ||
        typeof phone !== "string" ||
        !phone.trim() ||
        typeof address !== "string" ||
        !address.trim()) {
        return res.status(400).json({
            message: "Name, phone number, and address are required.",
        });
    }
    if (!Number.isInteger(Number(serviceId)) || Number(serviceId) <= 0) {
        return res.status(400).json({
            message: "Invalid service ID.",
        });
    }
    if (type !== "PICKUP" && type !== "DELIVERY") {
        return res.status(400).json({
            message: "Invalid pickup/delivery request type.",
        });
    }
    try {
        const service = await prisma.service.findFirst({
            where: {
                id: Number(serviceId),
                isActive: true,
            },
        });
        if (!service) {
            return res.status(400).json({
                message: "Selected service is unavailable.",
            });
        }
        const request = await prisma.pickupDeliveryRequest.create({
            data: {
                name: name.trim(),
                phone: phone.trim(),
                address: address.trim(),
                type,
                serviceId: Number(serviceId),
            },
            include: {
                service: true,
            },
        });
        emitNewPickupDeliveryRequest(request);
        return res.status(201).json({
            message: "Pickup/delivery request submitted successfully.",
            data: request,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to create pickup/delivery request.",
        });
    }
};
export const createDeliveryRequestFromOrder = async (req, res) => {
    const { orderCode, phone, address } = req.body ?? {};
    if (typeof orderCode !== "string" ||
        !orderCode.trim() ||
        typeof phone !== "string" ||
        !phone.trim() ||
        typeof address !== "string" ||
        !address.trim()) {
        return res.status(400).json({
            message: "Order code, phone number, and delivery address are required.",
        });
    }
    try {
        const order = await prisma.order.findFirst({
            where: {
                orderCode: orderCode.trim(),
                customer: {
                    phone: phone.trim(),
                },
            },
            select: {
                id: true,
                orderCode: true,
                orderStatus: true,
                paymentStatus: true,
                customer: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                    },
                },
                orderItems: {
                    select: {
                        serviceId: true,
                    },
                    take: 1,
                    orderBy: {
                        id: "asc",
                    },
                },
                deliveryRequest: {
                    select: {
                        id: true,
                        requestCode: true,
                        status: true,
                    },
                },
            },
        });
        if (!order) {
            return res.status(404).json({
                message: "Order not found. Check your order code and phone number.",
            });
        }
        if (order.orderStatus !== "SIAP_DIAMBIL" ||
            order.paymentStatus !== "SUDAH_DIBAYAR") {
            return res.status(400).json({
                message: "Delivery can only be requested when the order is ready and fully paid.",
            });
        }
        if (order.deliveryRequest) {
            return res.status(409).json({
                message: "A delivery request already exists for this order.",
                data: order.deliveryRequest,
            });
        }
        const firstOrderItem = order.orderItems[0];
        if (!firstOrderItem) {
            return res.status(400).json({
                message: "No laundry service was found for this order.",
            });
        }
        const schedule = getDeliverySchedule();
        const request = await prisma.pickupDeliveryRequest.create({
            data: {
                name: order.customer.name,
                phone: order.customer.phone,
                address: address.trim(),
                type: "DELIVERY",
                status: "PENDING",
                serviceId: firstOrderItem.serviceId,
                requestedForOrderId: order.id,
                scheduledDate: schedule.scheduledDate,
                scheduledStartTime: schedule.scheduledStartTime,
                scheduledEndTime: schedule.scheduledEndTime,
            },
            include: {
                service: true,
                requestedForOrder: {
                    select: {
                        id: true,
                        orderCode: true,
                        orderStatus: true,
                        paymentStatus: true,
                        total: true,
                    },
                },
            },
        });
        emitNewPickupDeliveryRequest(request);
        return res.status(201).json({
            message: "Delivery request submitted successfully.",
            data: request,
        });
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002") {
            return res.status(409).json({
                message: "A delivery request already exists for this order.",
            });
        }
        console.error(error);
        return res.status(500).json({
            message: "Failed to create delivery request.",
        });
    }
};
export const getAllPickupDeliveryRequests = async (req, res) => {
    try {
        const requests = await prisma.pickupDeliveryRequest.findMany({
            include: {
                service: true,
                processedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
                order: {
                    select: {
                        id: true,
                        orderCode: true,
                        orderStatus: true,
                        paymentStatus: true,
                        total: true,
                    },
                },
                requestedForOrder: {
                    select: {
                        id: true,
                        orderCode: true,
                        orderStatus: true,
                        paymentStatus: true,
                        total: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        return res.status(200).json({
            message: "Pickup/delivery requests fetched successfully.",
            data: requests,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to fetch pickup/delivery requests.",
        });
    }
};
export const getPickupDeliveryRequestById = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                message: "Invalid pickup/delivery request ID.",
            });
        }
        const request = await prisma.pickupDeliveryRequest.findUnique({
            where: { id },
            include: {
                service: true,
                processedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
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
                        createdAt: true,
                    },
                },
                requestedForOrder: {
                    select: {
                        id: true,
                        orderCode: true,
                        orderStatus: true,
                        paymentStatus: true,
                        subtotal: true,
                        discount: true,
                        total: true,
                        createdAt: true,
                    },
                },
            },
        });
        if (!request) {
            return res.status(404).json({
                message: "Pickup/delivery request not found.",
            });
        }
        return res.status(200).json({
            message: "Pickup/delivery request fetched successfully.",
            data: request,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to fetch pickup/delivery request.",
        });
    }
};
export const trackPickupDeliveryRequest = async (req, res) => {
    try {
        const { requestCode, phone } = req.body ?? {};
        if (typeof requestCode !== "string" ||
            typeof phone !== "string" ||
            !requestCode.trim() ||
            !phone.trim()) {
            return res.status(400).json({
                message: "Tracking code and phone number are required.",
            });
        }
        const request = await prisma.pickupDeliveryRequest.findFirst({
            where: {
                requestCode: requestCode.trim(),
                phone: phone.trim(),
            },
            select: {
                id: true,
                requestCode: true,
                name: true,
                phone: true,
                type: true,
                address: true,
                status: true,
                service: {
                    select: {
                        name: true,
                        category: true,
                        unit: true,
                        price: true,
                    },
                },
                scheduledDate: true,
                scheduledStartTime: true,
                scheduledEndTime: true,
                createdAt: true,
                updatedAt: true,
                processedAt: true,
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
                requestedForOrder: {
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
                message: "Request not found. Check your tracking code and phone number.",
            });
        }
        return res.status(200).json({
            message: "Request tracking fetched successfully.",
            data: request,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to track pickup/delivery request.",
        });
    }
};
export const updatePickupDeliveryRequestStatus = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Authentication required.",
        });
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            message: "Invalid pickup/delivery request ID.",
        });
    }
    const { status, scheduledDate } = req.body;
    if (status !== "ACCEPTED" && status !== "REJECTED") {
        return res.status(400).json({
            message: "Invalid request status.",
        });
    }
    let parsedScheduledDate;
    let scheduledStartTime = "";
    let scheduledEndTime = "";
    if (status === "ACCEPTED") {
        try {
            const request = await prisma.pickupDeliveryRequest.findUnique({
                where: { id },
                select: {
                    type: true,
                    scheduledDate: true,
                    scheduledStartTime: true,
                    scheduledEndTime: true,
                },
            });
            if (!request) {
                return res.status(404).json({
                    message: "Pickup/delivery request not found.",
                });
            }
            if (request.type === "DELIVERY") {
                const schedule = getDeliverySchedule();
                const requestedDate = request.scheduledDate ?? schedule.scheduledDate;
                parsedScheduledDate = new Date(Date.UTC(requestedDate.getUTCFullYear(), requestedDate.getUTCMonth(), requestedDate.getUTCDate()));
                scheduledStartTime = "13:00";
                scheduledEndTime = "16:00";
                if (!isValidDeliverySchedule(parsedScheduledDate, scheduledStartTime, scheduledEndTime)) {
                    const nextSchedule = getDeliverySchedule();
                    parsedScheduledDate = nextSchedule.scheduledDate;
                }
            }
            else {
                if (!scheduledDate ||
                    typeof req.body.scheduledStartTime !== "string" ||
                    !req.body.scheduledStartTime.trim() ||
                    typeof req.body.scheduledEndTime !== "string" ||
                    !req.body.scheduledEndTime.trim()) {
                    return res.status(400).json({
                        message: "Schedule date and time are required.",
                    });
                }
                const date = new Date(scheduledDate);
                if (Number.isNaN(date.getTime())) {
                    return res.status(400).json({
                        message: "Invalid scheduled date.",
                    });
                }
                parsedScheduledDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
                scheduledStartTime = req.body.scheduledStartTime.trim();
                scheduledEndTime = req.body.scheduledEndTime.trim();
                const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
                if (!timePattern.test(scheduledStartTime) ||
                    !timePattern.test(scheduledEndTime)) {
                    return res.status(400).json({
                        message: "Schedule times must use HH:mm format.",
                    });
                }
                if (scheduledStartTime >= scheduledEndTime) {
                    return res.status(400).json({
                        message: "End time must be later than start time.",
                    });
                }
            }
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({
                message: "Failed to prepare delivery schedule.",
            });
        }
    }
    try {
        const result = await prisma.$transaction(async (tx) => {
            const request = await tx.pickupDeliveryRequest.findUnique({
                where: { id },
            });
            if (!request) {
                throw new Error("REQUEST_NOT_FOUND");
            }
            if (request.status !== "PENDING") {
                throw new Error("REQUEST_ALREADY_PROCESSED");
            }
            if (status === "REJECTED") {
                const updatedRequest = await tx.pickupDeliveryRequest.update({
                    where: { id },
                    data: {
                        status: "REJECTED",
                        processedAt: new Date(),
                        processedById: req.user.userId,
                    },
                    include: {
                        service: true,
                        processedBy: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                role: true,
                            },
                        },
                        requestedForOrder: {
                            select: {
                                id: true,
                                orderCode: true,
                                orderStatus: true,
                                paymentStatus: true,
                            },
                        },
                    },
                });
                return {
                    request: updatedRequest,
                    customer: null,
                };
            }
            const phone = request.phone.trim();
            let customer = await tx.customer.findUnique({
                where: { phone },
            });
            if (customer && !customer.isActive) {
                throw new Error("CUSTOMER_INACTIVE");
            }
            if (!customer) {
                customer = await tx.customer.create({
                    data: {
                        name: request.name.trim(),
                        phone,
                        address: request.address,
                    },
                });
            }
            const updatedRequest = await tx.pickupDeliveryRequest.update({
                where: { id },
                data: {
                    status: "ACCEPTED",
                    scheduledDate: parsedScheduledDate,
                    scheduledStartTime: scheduledStartTime,
                    scheduledEndTime: scheduledEndTime,
                    processedAt: new Date(),
                    processedById: req.user.userId,
                },
                include: {
                    service: true,
                    processedBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                        },
                    },
                    requestedForOrder: {
                        select: {
                            id: true,
                            orderCode: true,
                            orderStatus: true,
                            paymentStatus: true,
                        },
                    },
                },
            });
            return {
                request: updatedRequest,
                customer,
            };
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
        emitPickupDeliveryStatusChanged(result.request);
        return res.status(200).json({
            message: status === "ACCEPTED"
                ? "Request accepted and schedule saved."
                : "Pickup/delivery request rejected.",
            data: result,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            const responses = {
                REQUEST_NOT_FOUND: {
                    status: 404,
                    message: "Pickup/delivery request not found.",
                },
                REQUEST_ALREADY_PROCESSED: {
                    status: 409,
                    message: "Only pending requests can be processed.",
                },
                CUSTOMER_INACTIVE: {
                    status: 409,
                    message: "The customer associated with this phone number is inactive.",
                },
            };
            const response = responses[error.message];
            if (response) {
                return res.status(response.status).json({
                    message: response.message,
                });
            }
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002" || error.code === "P2034") {
                return res.status(409).json({
                    message: "The request or customer data changed during processing. Please refresh and retry.",
                });
            }
            if (error.code === "P2025") {
                return res.status(404).json({
                    message: "Pickup/delivery request not found.",
                });
            }
        }
        console.error(error);
        return res.status(500).json({
            message: "Failed to update pickup/delivery request.",
        });
    }
};
export const receivePickupDeliveryRequest = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Authentication required.",
        });
    }
    const id = Number(req.params.id);
    const quantity = Number(req.body?.quantity);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            message: "Invalid pickup/delivery request ID.",
        });
    }
    if (typeof req.body?.quantity === "boolean" ||
        req.body?.quantity === null ||
        req.body?.quantity === undefined ||
        !Number.isFinite(quantity) ||
        quantity <= 0) {
        return res.status(400).json({
            message: "A valid positive laundry quantity is required.",
        });
    }
    try {
        const order = await prisma.$transaction(async (tx) => {
            const request = await tx.pickupDeliveryRequest.findUnique({
                where: { id },
                include: {
                    service: true,
                    order: {
                        select: {
                            id: true,
                            orderCode: true,
                        },
                    },
                    requestedForOrder: {
                        select: {
                            id: true,
                            orderCode: true,
                        },
                    },
                },
            });
            if (!request) {
                throw new Error("REQUEST_NOT_FOUND");
            }
            if (request.status !== "ACCEPTED") {
                throw new Error("REQUEST_NOT_ACCEPTED");
            }
            if (request.order || request.requestedForOrder) {
                throw new Error("ORDER_ALREADY_CREATED");
            }
            if (!request.service.isActive) {
                throw new Error("SERVICE_INACTIVE");
            }
            if (request.service.unit === "SATUAN" &&
                !Number.isInteger(quantity)) {
                throw new Error("QUANTITY_MUST_BE_INTEGER");
            }
            const customer = await tx.customer.findUnique({
                where: {
                    phone: request.phone.trim(),
                },
                include: {
                    membership: true,
                },
            });
            if (!customer) {
                throw new Error("CUSTOMER_NOT_FOUND");
            }
            if (!customer.isActive) {
                throw new Error("CUSTOMER_INACTIVE");
            }
            const itemQuantity = new Prisma.Decimal(quantity.toString());
            const priceSnapshot = new Prisma.Decimal(request.service.price.toString());
            const itemSubtotal = priceSnapshot.mul(itemQuantity);
            const subtotal = itemSubtotal;
            const membershipDiscountPercent = customer.membership?.isActive
                ? new Prisma.Decimal(customer.membership.discountPercent.toString())
                : new Prisma.Decimal(0);
            const discount = subtotal
                .mul(membershipDiscountPercent)
                .div(100)
                .toDecimalPlaces(2);
            const total = subtotal.minus(discount);
            const orderCode = `ORD-${Date.now()}-${randomBytes(3)
                .toString("hex")
                .toUpperCase()}`;
            return tx.order.create({
                data: {
                    orderCode,
                    customerId: customer.id,
                    createdById: req.user.userId,
                    pickupDeliveryRequestId: request.id,
                    orderStatus: "PESANAN_DITERIMA",
                    paymentStatus: "BELUM_DIBAYAR",
                    subtotal,
                    discount,
                    total,
                    orderItems: {
                        create: {
                            serviceId: request.serviceId,
                            quantity,
                            priceSnapshot,
                            subtotal: itemSubtotal,
                        },
                    },
                    orderStatusHistories: {
                        create: {
                            orderStatus: "PESANAN_DITERIMA",
                            changedById: req.user.userId,
                            note: "Laundry physically received and order created.",
                        },
                    },
                },
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                        },
                    },
                    orderItems: {
                        include: {
                            service: true,
                        },
                    },
                    orderStatusHistories: {
                        orderBy: {
                            changedAt: "asc",
                        },
                    },
                    pickupDeliveryRequest: {
                        select: {
                            id: true,
                            requestCode: true,
                            type: true,
                            status: true,
                        },
                    },
                },
            });
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
        emitOrderStatusChanged(order);
        return res.status(201).json({
            message: "Laundry received and order created successfully.",
            data: order,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            const responses = {
                REQUEST_NOT_FOUND: {
                    status: 404,
                    message: "Pickup/delivery request not found.",
                },
                REQUEST_NOT_ACCEPTED: {
                    status: 409,
                    message: "Only accepted requests can be received.",
                },
                ORDER_ALREADY_CREATED: {
                    status: 409,
                    message: "An order has already been created for this request.",
                },
                SERVICE_INACTIVE: {
                    status: 409,
                    message: "The selected laundry service is no longer active.",
                },
                QUANTITY_MUST_BE_INTEGER: {
                    status: 400,
                    message: "Quantity for a unit-based service must be a whole number.",
                },
                CUSTOMER_NOT_FOUND: {
                    status: 409,
                    message: "Customer was not found. Check the customer record before receiving the laundry.",
                },
                CUSTOMER_INACTIVE: {
                    status: 409,
                    message: "The customer associated with this request is inactive.",
                },
            };
            const response = responses[error.message];
            if (response) {
                return res.status(response.status).json({
                    message: response.message,
                });
            }
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002" || error.code === "P2034") {
                return res.status(409).json({
                    message: "This request may already have an order, or its data changed during processing. Refresh the request and try again.",
                });
            }
            if (error.code === "P2025") {
                return res.status(404).json({
                    message: "Pickup/delivery request not found.",
                });
            }
        }
        console.error(error);
        return res.status(500).json({
            message: "Failed to receive laundry and create order.",
        });
    }
};
