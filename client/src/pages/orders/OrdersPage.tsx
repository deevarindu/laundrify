import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import type {
  Customer,
  Order,
  Payment,
} from "../../types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

type OrderStatusFilter =
  | "ALL"
  | Order["orderStatus"];

type PaymentStatusFilter =
  | "ALL"
  | Order["paymentStatus"];

const OrdersPage = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<OrderStatusFilter>("ALL");

  const [paymentFilter, setPaymentFilter] =
    useState<PaymentStatusFilter>("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const [
          ordersResponse,
          customersResponse,
          paymentsResponse,
        ] = await Promise.all([
          api.get("/order"),
          api.get("/customer"),
          api.get("/payment"),
        ]);

        if (cancelled) {
          return;
        }

        setOrders(ordersResponse.data.data);
        setCustomers(customersResponse.data.data);
        setPayments(paymentsResponse.data.data);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(error);
        setError("Failed to load orders data.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const customerMap = useMemo(() => {
    return new Map(
      customers.map((customer) => [
        customer.id,
        customer.name,
      ])
    );
  }, [customers]);

  const paymentOrderIds = useMemo(() => {
    return new Set(
      payments.map((payment) => payment.orderId)
    );
  }, [payments]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.toLowerCase();

    return orders.filter((order) => {
      const customerName =
        customerMap.get(order.customerId) ?? "";

      const matchesSearch =
        order.orderCode
          .toLowerCase()
          .includes(normalizedSearch) ||
        customerName
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" ||
        order.orderStatus === statusFilter;

      const matchesPayment =
        paymentFilter === "ALL" ||
        order.paymentStatus === paymentFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPayment
      );
    });
  }, [
    orders,
    customerMap,
    search,
    statusFilter,
    paymentFilter,
  ]);

  const activeOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.orderStatus !== "SELESAI" &&
        order.orderStatus !== "DIBATALKAN"
    ).length;
  }, [orders]);

  const unpaidOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.paymentStatus === "BELUM_DIBAYAR"
    ).length;
  }, [orders]);

  const readyOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.orderStatus === "SIAP_DIAMBIL"
    ).length;
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

  const getStatusLabel = (
    status: Order["orderStatus"]
  ) => {
    const labels: Record<
      Order["orderStatus"],
      string
    > = {
      PESANAN_DITERIMA: "Received",
      DICUCI: "Washing",
      DIKERINGKAN: "Drying",
      DISETRIKA: "Ironing",
      SIAP_DIAMBIL: "Ready",
      SELESAI: "Completed",
      DIBATALKAN: "Cancelled",
    };

    return labels[status];
  };

  const getPaymentLabel = (
    status: Order["paymentStatus"]
  ) => {
    return status === "SUDAH_DIBAYAR"
      ? "Paid"
      : "Unpaid";
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#F7F2EB]">
        <p className="text-sm text-[#73776D]">
          Loading orders...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#DED8CF] bg-white p-6">
        <p className="text-sm text-[#B85C5C]">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-8 bg-[#F7F2EB]">
      <section className="rounded-3xl bg-[#8B9A6E] px-6 py-7 text-white shadow-sm md:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">
              Order Management
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Orders
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
              Manage laundry orders and monitor their progress.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => navigate("/orders/create")}
            className="bg-white text-[#4B5141] hover:bg-[#F7F2EB]"
          >
            Create Order
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="border-[#DED8CF] bg-white shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-[#73776D]">
              Total Orders
            </p>

            <p className="mt-3 text-3xl font-semibold text-[#4B5141]">
              {orders.length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#DED8CF] bg-[#E7ECDD] shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-[#73776D]">
              Active Orders
            </p>

            <p className="mt-3 text-3xl font-semibold text-[#4B5141]">
              {activeOrders}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#DED8CF] bg-[#EAE2D6] shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-[#73776D]">
              Unpaid Orders
            </p>

            <p className="mt-3 text-3xl font-semibold text-[#4B5141]">
              {unpaidOrders}
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-[#DED8CF] bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="grid gap-3 md:grid-cols-[1fr_220px_180px]">
              <Input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search order code or customer..."
                className="border-[#D8D2C9] bg-[#FAF8F4] focus-visible:ring-[#8B9A6E]"
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as OrderStatusFilter
                  )
                }
                className="h-10 rounded-md border border-[#D8D2C9] bg-[#FAF8F4] px-3 py-2 text-sm text-[#4B5141] outline-none focus:ring-2 focus:ring-[#8B9A6E]"
              >
                <option value="ALL">
                  All Order Status
                </option>

                <option value="PESANAN_DITERIMA">
                  Received
                </option>

                <option value="DICUCI">
                  Washing
                </option>

                <option value="DIKERINGKAN">
                  Drying
                </option>

                <option value="DISETRIKA">
                  Ironing
                </option>

                <option value="SIAP_DIAMBIL">
                  Ready
                </option>

                <option value="SELESAI">
                  Completed
                </option>

                <option value="DIBATALKAN">
                  Cancelled
                </option>
              </select>

              <select
                value={paymentFilter}
                onChange={(event) =>
                  setPaymentFilter(
                    event.target.value as PaymentStatusFilter
                  )
                }
                className="h-10 rounded-md border border-[#D8D2C9] bg-[#FAF8F4] px-3 py-2 text-sm text-[#4B5141] outline-none focus:ring-2 focus:ring-[#8B9A6E]"
              >
                <option value="ALL">
                  All Payment Status
                </option>

                <option value="BELUM_DIBAYAR">
                  Unpaid
                </option>

                <option value="SUDAH_DIBAYAR">
                  Paid
                </option>
              </select>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="overflow-hidden border-[#DED8CF] bg-white shadow-sm">
        <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4]">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[#4B5141]">
                Order List
              </CardTitle>

              <p className="mt-1 text-xs text-[#73776D]">
                {filteredOrders.length} order
                {filteredOrders.length !== 1
                  ? "s"
                  : ""}{" "}
                found
              </p>
            </div>

            <div className="rounded-lg bg-[#E7ECDD] px-3 py-1.5">
              <span className="text-xs font-medium text-[#4B5141]">
                Ready: {readyOrders}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6">
          {filteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D8D2C9] bg-[#FAF8F4] px-6 py-10 text-center">
              <p className="text-sm text-[#73776D]">
                No orders found.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const customerName =
                  customerMap.get(order.customerId) ??
                  "Unknown Customer";

                const hasPayment =
                  paymentOrderIds.has(order.id);

                return (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-[#E2DDD5] bg-[#FDFCFA] p-4 transition-colors hover:border-[#C8D0B7] hover:bg-[#FAF8F4]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[#30352A]">
                            {order.orderCode}
                          </p>

                          <Badge className="border-0 bg-[#EAE2D6] px-2 py-0.5 text-[11px] text-[#4B5141] hover:bg-[#EAE2D6]">
                            {getStatusLabel(
                              order.orderStatus
                            )}
                          </Badge>

                          <Badge
                            className={
                              order.paymentStatus ===
                              "SUDAH_DIBAYAR"
                                ? "border-0 bg-[#8B9A6E] px-2 py-0.5 text-[11px] text-white hover:bg-[#8B9A6E]"
                                : "border-0 bg-[#EEEEEE] px-2 py-0.5 text-[11px] text-[#73776D] hover:bg-[#EEEEEE]"
                            }
                          >
                            {getPaymentLabel(
                              order.paymentStatus
                            )}
                          </Badge>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <p className="text-sm font-medium text-[#4B5141]">
                            {customerName}
                          </p>

                          <span className="text-[#D0CBC2]">
                            •
                          </span>

                          <p className="text-xs text-[#8A8D84]">
                            {formatDate(
                              order.createdAt
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <div className="mr-1">
                          <p className="text-sm font-semibold text-[#4B5141]">
                            {formatCurrency(order.total)}
                          </p>

                          {hasPayment && (
                            <p className="mt-0.5 text-right text-[11px] text-[#8B9A6E]">
                              Payment recorded
                            </p>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(
                              `/order/${order.id}`
                            )
                          }
                          className="h-8 border-[#C8D0B7] bg-[#F0F2E9] px-3 text-xs text-[#4B5141] hover:bg-[#E0E7D5]"
                        >
                          Detail
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersPage;