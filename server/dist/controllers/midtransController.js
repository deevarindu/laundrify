import prisma from "../lib/prisma.js";
import snap from "../lib/midtrans.js";
export const createMidtransTransaction = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await prisma.order.findUnique({
            where: {
                id: orderId,
            },
            include: {
                customer: true,
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
        const transaction = await snap.createTransaction({
            transaction_details: {
                order_id: order.orderCode,
                gross_amount: Number(order.total),
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
