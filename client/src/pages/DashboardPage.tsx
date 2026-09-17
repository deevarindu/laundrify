import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import type {
  OrderWithRelations,
  Payment,
  Service,
} from "../types";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

const categoryLabels = {
  REGULER: "Reguler",
  EKSPRESS: "Ekspress",
  KHUSUS: "Khusus",
} as const;

const statusLabels = {
  PESANAN_DITERIMA: "Received",
  DICUCI: "Washing",
  DIKERINGKAN: "Drying",
  DISETRIKA: "Ironing",
  SIAP_DIAMBIL: "Ready",
  SELESAI: "Completed",
  DIBATALKAN: "Cancelled",
} as const;

const DashboardPage = () => {
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const [
          ordersResponse,
          paymentsResponse,
          servicesResponse,
        ] = await Promise.all([
          api.get("/order"),
          api.get("/payment"),
          api.get("/service"),
        ]);

        if (cancelled) {
          return;
        }

        setOrders(ordersResponse.data.data);
        setPayments(paymentsResponse.data.data);
        setServices(servicesResponse.data.data);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(error);
        setError("Failed to load dashboard data.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.orderStatus !== "SELESAI" &&
        order.orderStatus !== "DIBATALKAN"
    );
  }, [orders]);

  const processingOrders = useMemo(() => {
    return orders.filter((order) =>
      [
        "DICUCI",
        "DIKERINGKAN",
        "DISETRIKA",
      ].includes(order.orderStatus)
    );
  }, [orders]);

  const readyOrders = useMemo(() => {
    return orders.filter(
      (order) => order.orderStatus === "SIAP_DIAMBIL"
    );
  }, [orders]);

  const unpaidOrders = useMemo(() => {
    return orders.filter(
      (order) => order.paymentStatus === "BELUM_DIBAYAR"
    );
  }, [orders]);

  const statusCounts = useMemo(() => {
    return {
      received: orders.filter(
        (order) =>
          order.orderStatus === "PESANAN_DITERIMA"
      ).length,

      washing: orders.filter(
        (order) => order.orderStatus === "DICUCI"
      ).length,

      drying: orders.filter(
        (order) =>
          order.orderStatus === "DIKERINGKAN"
      ).length,

      ironing: orders.filter(
        (order) =>
          order.orderStatus === "DISETRIKA"
      ).length,

      ready: orders.filter(
        (order) =>
          order.orderStatus === "SIAP_DIAMBIL"
      ).length,
    };
  }, [orders]);

  const todayRevenue = useMemo(() => {
    const today = new Date();

    return payments
      .filter((payment) => {
        const paidAt = new Date(payment.paidAt);

        return (
          paidAt.getFullYear() === today.getFullYear() &&
          paidAt.getMonth() === today.getMonth() &&
          paidAt.getDate() === today.getDate()
        );
      })
      .reduce(
        (total, payment) => total + Number(payment.amount),
        0
      );
  }, [payments]);

  const bestSellers = useMemo(() => {
    const categories = [
      "REGULER",
      "EKSPRESS",
      "KHUSUS",
    ] as const;

    const salesMap = new Map<number, number>();

    orders
      .filter(
        (order) => order.orderStatus !== "DIBATALKAN"
      )
      .forEach((order) => {
        order.orderItems?.forEach((item) => {
          const currentQuantity =
            salesMap.get(item.serviceId) ?? 0;

          salesMap.set(
            item.serviceId,
            currentQuantity + Number(item.quantity)
          );
        });
      });

    return categories.map((category) => {
      const categoryServices = services
        .filter(
          (service) =>
            service.category === category
        )
        .map((service) => ({
          service,
          soldQuantity:
            salesMap.get(service.id) ?? 0,
        }))
        .sort(
          (a, b) =>
            b.soldQuantity - a.soldQuantity
        );

      return {
        category,
        label: categoryLabels[category],
        service:
          categoryServices[0]?.service ?? null,
        soldQuantity:
          categoryServices[0]?.soldQuantity ?? 0,
      };
    });
  }, [orders, services]);

  const recentOrders = useMemo(() => {
    return orders.slice(0, 5);
  }, [orders]);

  const formatCurrency = (
    value: number | string
  ) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value));
  };

  const formatDate = (value: string) => {
    return new Date(value).toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const summaryCards = [
    {
      title: "Active Orders",
      value: activeOrders.length,
      style: "bg-[#E7ECDD]",
    },
    {
      title: "Processing",
      value: processingOrders.length,
      style: "bg-[#EAE2D6]",
    },
    {
      title: "Ready",
      value: readyOrders.length,
      style: "bg-[#E0E7D5]",
    },
    {
      title: "Unpaid",
      value: unpaidOrders.length,
      style: "bg-[#EDE8E0]",
    },
    {
      title: "Today Revenue",
      value: formatCurrency(todayRevenue),
      style: "bg-[#8B9A6E] text-white",
    },
  ];

  const statusCards = [
    {
      label: statusLabels.PESANAN_DITERIMA,
      value: statusCounts.received,
      style: "bg-[#F0F2E9]",
    },
    {
      label: statusLabels.DICUCI,
      value: statusCounts.washing,
      style: "bg-[#E7ECDD]",
    },
    {
      label: statusLabels.DIKERINGKAN,
      value: statusCounts.drying,
      style: "bg-[#EAE2D6]",
    },
    {
      label: statusLabels.DISETRIKA,
      value: statusCounts.ironing,
      style: "bg-[#E6E9DD]",
    },
    {
      label: statusLabels.SIAP_DIAMBIL,
      value: statusCounts.ready,
      style: "bg-[#DDE5D0]",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#F7F2EB]">
        <p className="text-sm text-[#73776D]">
          Loading dashboard...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#D8CACA] bg-white p-6">
        <p className="text-sm text-[#B85C5C]">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-8 bg-[#F7F2EB]">
      <section className="overflow-hidden rounded-3xl bg-[#8B9A6E] px-6 py-7 text-white shadow-sm md:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">
              Laundrify
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Dashboard
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
              Overview of your laundry business and daily
              operations.
            </p>
          </div>

          <div className="rounded-2xl bg-white/15 px-5 py-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-white/70">
              Total Orders
            </p>

            <p className="mt-1 text-3xl font-semibold">
              {orders.length}
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#30352A]">
            Overview
          </h2>

          <p className="mt-1 text-sm text-[#73776D]">
            A quick look at your laundry activity.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((card) => (
            <Card
              key={card.title}
              className={`border-[#DED8CF] shadow-sm ${card.style}`}
            >
              <CardContent className="p-5">
                <p
                  className={
                    card.title === "Today Revenue"
                      ? "text-sm text-white/75"
                      : "text-sm text-[#73776D]"
                  }
                >
                  {card.title}
                </p>

                <p
                  className={
                    card.title === "Today Revenue"
                      ? "mt-4 text-2xl font-semibold text-white"
                      : "mt-4 text-2xl font-semibold text-[#4B5141]"
                  }
                >
                  {card.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#30352A]">
            Order Status
          </h2>

          <p className="mt-1 text-sm text-[#73776D]">
            Current orders across each processing stage.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {statusCards.map((status) => (
            <div
              key={status.label}
              className={`rounded-2xl border border-[#DED8CF] p-5 shadow-sm ${status.style}`}
            >
              <p className="text-sm text-[#73776D]">
                {status.label}
              </p>

              <p className="mt-3 text-3xl font-semibold text-[#4B5141]">
                {status.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#30352A]">
            Best Sellers
          </h2>

          <p className="mt-1 text-sm text-[#73776D]">
            Top-selling service in each category.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {bestSellers.map((item) => (
            <Card
              key={item.category}
              className="border-[#DED8CF] bg-white shadow-sm"
            >
              <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4] pb-4">
                <Badge className="w-fit border-0 bg-[#EAE2D6] text-[#4B5141] hover:bg-[#EAE2D6]">
                  {item.label}
                </Badge>

                <CardTitle className="pt-1 text-lg font-semibold text-[#30352A]">
                  {item.service?.name ??
                    "No sales yet"}
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-5">
                {item.service ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#73776D]">
                        Sold
                      </span>

                      <span className="font-semibold text-[#4B5141]">
                        {item.soldQuantity}{" "}
                        {item.service.unit === "KG"
                          ? "KG"
                          : "unit"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#73776D]">
                        Price
                      </span>

                      <span className="font-semibold text-[#4B5141]">
                        {formatCurrency(
                          item.service.price
                        )}
                      </span>
                    </div>

                    <Badge
                      className={
                        item.service.isActive
                          ? "border-0 bg-[#8B9A6E] text-white hover:bg-[#8B9A6E]"
                          : "border-0 bg-[#EEEEEE] text-[#73776D] hover:bg-[#EEEEEE]"
                      }
                    >
                      {item.service.isActive
                        ? "Active"
                        : "Inactive"}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-[#73776D]">
                    No service sales in this category yet.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#30352A]">
            Recent Orders
          </h2>

          <p className="mt-1 text-sm text-[#73776D]">
            Your latest laundry transactions.
          </p>
        </div>

        <Card className="overflow-hidden border-[#DED8CF] bg-white shadow-sm">
          <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4]">
            <CardTitle className="text-base font-semibold text-[#4B5141]">
              Latest Activity
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <div className="p-6">
                <p className="text-sm text-[#73776D]">
                  No orders yet.
                </p>
              </div>
            ) : (
              <div>
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col gap-4 border-b border-[#EAE2D6] px-6 py-5 last:border-0 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-[#30352A]">
                        {order.orderCode}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge className="border-0 bg-[#EAE2D6] text-[#4B5141] hover:bg-[#EAE2D6]">
                          {
                            statusLabels[
                              order.orderStatus
                            ]
                          }
                        </Badge>

                        <Badge
                          className={
                            order.paymentStatus ===
                            "SUDAH_DIBAYAR"
                              ? "border-0 bg-[#8B9A6E] text-white hover:bg-[#8B9A6E]"
                              : "border-0 bg-[#EEEEEE] text-[#73776D] hover:bg-[#EEEEEE]"
                          }
                        >
                          {order.paymentStatus ===
                          "SUDAH_DIBAYAR"
                            ? "Paid"
                            : "Unpaid"}
                        </Badge>
                      </div>

                      <p className="mt-2 text-sm text-[#8A8D84]">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>

                    <p className="text-base font-semibold text-[#4B5141]">
                      {formatCurrency(order.total)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default DashboardPage;