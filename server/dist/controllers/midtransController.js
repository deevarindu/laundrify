import { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import snap from "../lib/midtrans.js";
import { emitPaymentStatusChanged } from "../lib/socketEvent.js";
export const createMidtransTransaction = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await prisma.order.findUnique({
            where: {
                id: orderId,
            },
            include: {
                payment: true,
            },
        });
        if (!order) {
            return res.status(404).json({
                message: "Order not found.",
            });
        }
        if (order.orderStatus === "DIBATALKAN") {
            return res.status(409).json({
                message: "Cancelled order cannot be paid.",
            });
        }
        if (order.paymentStatus === "SUDAH_DIBAYAR") {
            return res.status(409).json({
                message: "Order has already been paid.",
            });
        }
        if (order.payment) {
            return res.status(409).json({
                message: "Order already has a payment.",
            });
        }
        const grossAmount = Number(order.total);
        if (!Number.isSafeInteger(grossAmount) || grossAmount <= 0) {
            return res.status(400).json({
                message: "Invalid order total for Midtrans.",
            });
        }
        const transaction = await snap.createTransaction({
            transaction_details: {
                order_id: order.orderCode,
                gross_amount: grossAmount,
            },
        });
        return res.status(200).json({
            message: "Midtrans transaction created successfully.",
            data: {
                orderId: order.id,
                orderCode: order.orderCode,
                token: transaction.token,
                redirectUrl: transaction.redirect_url,
            },
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to create Midtrans transaction.",
        });
    }
};
export const handleMidtransNotification = async (req, res) => {
    try {
        const notification = await snap.transaction.notification(req.body);
        const orderCode = notification.order_id;
        const transactionStatus = notification.transaction_status;
        const fraudStatus = notification.fraud_status;
        const grossAmount = notification.gross_amount;
        const order = await prisma.order.findUnique({
            where: {
                orderCode,
            },
            include: {
                payment: true,
            },
        });
        if (!order) {
            return res.status(404).json({
                message: "Order not found.",
            });
        }
        const notificationAmount = new Prisma.Decimal(grossAmount);
        if (!notificationAmount.equals(order.total)) {
            return res.status(400).json({
                message: "Notification amount does not match order total.",
            });
        }
        const isSuccessful = transactionStatus === "settlement" ||
            (transactionStatus === "capture" &&
                (!fraudStatus || fraudStatus === "accept"));
        if (!isSuccessful) {
            return res.status(200).json({
                message: "Midtrans notification received.",
                data: {
                    orderCode,
                    transactionStatus,
                },
            });
        }
        if (order.paymentStatus === "SUDAH_DIBAYAR" || order.payment) {
            return res.status(200).json({
                message: "Payment has already been processed.",
            });
        }
        const payment = await prisma.$transaction(async (tx) => {
            const existingPayment = await tx.payment.findUnique({
                where: {
                    orderId: order.id,
                },
            });
            if (existingPayment) {
                return existingPayment;
            }
            const createdPayment = await tx.payment.create({
                data: {
                    order: {
                        connect: {
                            id: order.id,
                        },
                    },
                    amount: order.total,
                    method: "QRIS",
                },
            });
            await tx.order.update({
                where: {
                    id: order.id,
                },
                data: {
                    paymentStatus: "SUDAH_DIBAYAR",
                },
            });
            return createdPayment;
        });
        emitPaymentStatusChanged({
            orderId: order.id,
            orderCode: order.orderCode,
            paymentStatus: "SUDAH_DIBAYAR",
            payment,
        });
        return res.status(200).json({
            message: "Midtrans payment processed successfully.",
            data: {
                orderCode: order.orderCode,
                paymentStatus: "SUDAH_DIBAYAR",
            },
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to process Midtrans notification.",
        });
    }
};
