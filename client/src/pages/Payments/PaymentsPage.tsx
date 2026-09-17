import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import type {
  Customer,
  Order,
  Payment,
  PaymentMethod,
} from "@/types";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type MethodFilter = "ALL" | PaymentMethod;

const PaymentsPage = () => {
  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [search, setSearch] = useState("");

  const [methodFilter, setMethodFilter] =
    useState<MethodFilter>("ALL");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const [
          paymentsResponse,
          ordersResponse,
          customersResponse,
        ] = await Promise.all([
          api.get("/payment"),
          api.get("/order"),
          api.get("/customer"),
        ]);

        if (cancelled) {
          return;
        }

        setPayments(
          paymentsResponse.data.data
        );

        setOrders(
          ordersResponse.data.data
        );

        setCustomers(
          customersResponse.data.data
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(error);
        setError(
          "Failed to load payments data."
        );
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

  const orderMap = useMemo(() => {
    return new Map(
      orders.map((order) => [
        order.id,
        order,
      ])
    );
  }, [orders]);

  const customerMap = useMemo(() => {
    return new Map(
      customers.map((customer) => [
        customer.id,
        customer.name,
      ])
    );
  }, [customers]);

  const filteredPayments = useMemo(() => {
    const normalizedSearch =
      search.toLowerCase().trim();

    return payments.filter((payment) => {
      const order = orderMap.get(
        payment.orderId
      );

      const customerName = order
        ? customerMap.get(
            order.customerId
          ) ?? ""
        : "";

      const matchesSearch =
        payment.orderId
          .toString()
          .includes(normalizedSearch) ||
        (order?.orderCode ?? "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        customerName
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesMethod =
        methodFilter === "ALL" ||
        payment.method === methodFilter;

      return (
        matchesSearch &&
        matchesMethod
      );
    });
  }, [
    payments,
    orderMap,
    customerMap,
    search,
    methodFilter,
  ]);

  const totalRevenue = useMemo(() => {
    return filteredPayments.reduce(
      (sum, payment) =>
        sum + Number(payment.amount),
      0
    );
  }, [filteredPayments]);

  const cashPayments = useMemo(() => {
    return filteredPayments.filter(
      (payment) =>
        payment.method === "CASH"
    ).length;
  }, [filteredPayments]);

  const qrisPayments = useMemo(() => {
    return filteredPayments.filter(
      (payment) =>
        payment.method === "QRIS"
    ).length;
  }, [filteredPayments]);

  const transferPayments = useMemo(() => {
    return filteredPayments.filter(
      (payment) =>
        payment.method === "TRANSFER"
    ).length;
  }, [filteredPayments]);

  const formatCurrency = (
    value: number | string
  ) => {
    return new Intl.NumberFormat(
      "id-ID",
      {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }
    ).format(Number(value));
  };

  const formatDateTime = (
    value: string
  ) => {
    return new Date(value).toLocaleString(
      "id-ID",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  const getCustomerName = (
    payment: Payment
  ) => {
    const order = orderMap.get(
      payment.orderId
    );

    if (!order) {
      return "Unknown Customer";
    }

    return (
      customerMap.get(
        order.customerId
      ) ?? "Unknown Customer"
    );
  };

  const getOrderCode = (
    payment: Payment
  ) => {
    return (
      orderMap.get(payment.orderId)
        ?.orderCode ??
      `Order #${payment.orderId}`
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#F7F2EB]">
        <p className="text-sm text-[#73776D]">
          Loading payments...
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
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">
            Payment Management
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Payments
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
            View and monitor recorded payment transactions.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="border-[#DED8CF] bg-white shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-[#73776D]">
              Transactions
            </p>

            <p className="mt-3 text-3xl font-semibold text-[#4B5141]">
              {filteredPayments.length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#DED8CF] bg-[#E7ECDD] shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-[#73776D]">
              Total Amount
            </p>

            <p className="mt-3 text-xl font-semibold text-[#4B5141]">
              {formatCurrency(
                totalRevenue
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#DED8CF] bg-[#EAE2D6] shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-[#73776D]">
              Payment Methods
            </p>

            <div className="mt-3 flex items-center gap-3 text-sm font-semibold text-[#4B5141]">
              <span>
                Cash{" "}
                <span className="font-normal text-[#73776D]">
                  {cashPayments}
                </span>
              </span>

              <span className="text-[#C8C2B8]">•</span>

              <span>
                Transfer{" "}
                <span className="font-normal text-[#73776D]">
                  {transferPayments}
                </span>
              </span>

              <span className="text-[#C8C2B8]">•</span>

              <span>
                QRIS{" "}
                <span className="font-normal text-[#73776D]">
                  {qrisPayments}
                </span>
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-[#DED8CF] bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <Input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search order code or customer..."
                className="border-[#D8D2C9] bg-[#FAF8F4] focus-visible:ring-[#8B9A6E]"
              />

              <select
                value={methodFilter}
                onChange={(event) =>
                  setMethodFilter(
                    event.target
                      .value as MethodFilter
                  )
                }
                className="h-10 rounded-md border border-[#D8D2C9] bg-[#FAF8F4] px-3 py-2 text-sm text-[#4B5141] outline-none focus:ring-2 focus:ring-[#8B9A6E]"
              >
                <option value="ALL">
                  All Payment Methods
                </option>

                <option value="CASH">
                  Cash
                </option>

                <option value="TRANSFER">
                  Transfer
                </option>

                <option value="QRIS">
                  QRIS
                </option>
              </select>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="overflow-hidden border-[#DED8CF] bg-white shadow-sm">
        <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4]">
          <div>
            <CardTitle className="text-base font-semibold text-[#4B5141]">
              Payment History
            </CardTitle>

            <p className="mt-1 text-xs text-[#73776D]">
              {filteredPayments.length} transaction
              {filteredPayments.length !==
              1
                ? "s"
                : ""}{" "}
              found
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6">
          {filteredPayments.length ===
          0 ? (
            <div className="rounded-2xl border border-dashed border-[#D8D2C9] bg-[#FAF8F4] px-6 py-10 text-center">
              <p className="text-sm text-[#73776D]">
                No payment transactions
                found.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPayments.map(
                (payment) => (
                  <div
                    key={payment.id}
                    className="rounded-2xl border border-[#E2DDD5] bg-[#FDFCFA] px-4 py-4 transition-colors hover:border-[#C8D0B7] hover:bg-[#FAF8F4]"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[#30352A]">
                            {getOrderCode(
                              payment
                            )}
                          </p>

                          <Badge className="border-0 bg-[#8B9A6E] px-2 py-0.5 text-[11px] text-white hover:bg-[#8B9A6E]">
                            Paid
                          </Badge>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <p className="text-sm font-medium text-[#4B5141]">
                            {getCustomerName(
                              payment
                            )}
                          </p>

                          <span className="text-[#D0CBC2]">
                            •
                          </span>

                          <p className="text-xs text-[#8A8D84]">
                            {formatDateTime(
                              payment.paidAt
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge className="border-0 bg-[#EAE2D6] px-2.5 py-1 text-xs text-[#4B5141] hover:bg-[#EAE2D6]">
                          {payment.method}
                        </Badge>

                        <p className="text-sm font-semibold text-[#4B5141]">
                          {formatCurrency(
                            payment.amount
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsPage;