import prisma from "../lib/prisma.js";
export const getDashboard = async (req, res) => {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const startOfTomorrow = new Date(startOfToday);
        startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
        const [activeOrders, processing, ready, unpaid, todayRevenue,] = await Promise.all([
            prisma.order.count({
                where: {
                    orderStatus: {
                        notIn: ["SELESAI", "DIBATALKAN"],
                    },
                },
            }),
            prisma.order.count({
                where: {
                    orderStatus: {
                        in: [
                            "DICUCI",
                            "DIKERINGKAN",
                            "DISETRIKA",
                        ],
                    },
                },
            }),
            prisma.order.count({
                where: {
                    orderStatus: "SIAP_DIAMBIL",
                },
            }),
            prisma.order.count({
                where: {
                    paymentStatus: "BELUM_DIBAYAR",
                    orderStatus: {
                        not: "DIBATALKAN",
                    },
                },
            }),
            prisma.payment.aggregate({
                _sum: {
                    amount: true,
                },
                where: {
                    paidAt: {
                        gte: startOfToday,
                        lt: startOfTomorrow,
                    },
                    order: {
                        orderStatus: {
                            not: "DIBATALKAN",
                        },
                    },
                },
            }),
        ]);
        return res.status(200).json({
            message: "Dashboard data fetched successfully.",
            data: {
                activeOrders,
                processing,
                ready,
                unpaid,
                todayRevenue: todayRevenue._sum.amount ?? 0,
            },
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to fetch dashboard data.",
        });
    }
};
