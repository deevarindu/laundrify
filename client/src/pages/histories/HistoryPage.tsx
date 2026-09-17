import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import type {
  Customer,
  Order,
  Payment,
  PaymentMethod,
} from "@/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type HistoryStatus =
  | "ALL"
  | "SELESAI"
  | "DIBATALKAN";

type HistoryPaymentMethod =
  | "ALL"
  | PaymentMethod;

const HistoryPage = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] =
    useState<Customer[]>([]);
  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<HistoryStatus>("ALL");

  const [
    paymentMethodFilter,
    setPaymentMethodFilter,
  ] = useState<HistoryPaymentMethod>("ALL");

  const [customerFilter, setCustomerFilter] =
    useState("ALL");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

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

        setOrders(
          ordersResponse.data.data
        );

        setCustomers(
          customersResponse.data.data
        );

        setPayments(
          paymentsResponse.data.data
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(error);

        setError(
          "Failed to load transaction history."
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

  const customerMap = useMemo(() => {
    return new Map(
      customers.map((customer) => [
        customer.id,
        customer.name,
      ])
    );
  }, [customers]);

  const paymentMap = useMemo(() => {
    return new Map(
      payments.map((payment) => [
        payment.orderId,
        payment,
      ])
    );
  }, [payments]);

  const historyOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.orderStatus === "SELESAI" ||
        order.orderStatus ===
          "DIBATALKAN"
    );
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch =
      search.toLowerCase().trim();

    return historyOrders.filter(
      (order) => {
        const customerName =
          customerMap.get(
            order.customerId
          ) ?? "";

        const payment = paymentMap.get(
          order.id
        );

        const matchesSearch =
          order.orderCode
            .toLowerCase()
            .includes(
              normalizedSearch
            ) ||
          customerName
            .toLowerCase()
            .includes(
              normalizedSearch
            );

        const matchesStatus =
          statusFilter === "ALL" ||
          order.orderStatus ===
            statusFilter;

        const matchesPaymentMethod =
          paymentMethodFilter === "ALL" ||
          payment?.method ===
            paymentMethodFilter;

        const matchesCustomer =
          customerFilter === "ALL" ||
          order.customerId ===
            Number(customerFilter);

        const orderDate =
          new Date(order.createdAt);

        const matchesStartDate =
          !startDate ||
          orderDate >=
            new Date(
              `${startDate}T00:00:00`
            );

        const matchesEndDate =
          !endDate ||
          orderDate <=
            new Date(
              `${endDate}T23:59:59.999`
            );

        return (
          matchesSearch &&
          matchesStatus &&
          matchesPaymentMethod &&
          matchesCustomer &&
          matchesStartDate &&
          matchesEndDate
        );
      }
    );
  }, [
    historyOrders,
    customerMap,
    paymentMap,
    search,
    statusFilter,
    paymentMethodFilter,
    customerFilter,
    startDate,
    endDate,
  ]);

  const completedCount = useMemo(() => {
    return filteredOrders.filter(
      (order) =>
        order.orderStatus ===
        "SELESAI"
    ).length;
  }, [filteredOrders]);

  const historyRevenue = useMemo(() => {
    return filteredOrders
      .filter(
        (order) =>
          order.orderStatus ===
          "SELESAI"
      )
      .reduce(
        (total, order) =>
          total + Number(order.total),
        0
      );
  }, [filteredOrders]);

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

  const formatDate = (
    value: string
  ) => {
    return new Date(
      value
    ).toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const getCustomerName = (
    order: Order
  ) => {
    return (
      customerMap.get(
        order.customerId
      ) ?? "Unknown Customer"
    );
  };

  const getPayment = (
    order: Order
  ) => {
    return paymentMap.get(order.id);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setPaymentMethodFilter("ALL");
    setCustomerFilter("ALL");
    setStartDate("");
    setEndDate("");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#F7F2EB]">
        <p className="text-sm text-[#73776D]">
          Loading history...
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
            Transaction History
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            History
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
            Review completed and cancelled laundry orders.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="border-[#DED8CF] bg-white shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-[#73776D]">
              Total History
            </p>

            <p className="mt-3 text-3xl font-semibold text-[#4B5141]">
              {filteredOrders.length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#DED8CF] bg-[#E7ECDD] shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-[#73776D]">
              Completed
            </p>

            <p className="mt-3 text-3xl font-semibold text-[#4B5141]">
              {completedCount}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#DED8CF] bg-[#EAE2D6] shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-[#73776D]">
              Completed Revenue
            </p>

            <p className="mt-3 text-xl font-semibold text-[#4B5141]">
              {formatCurrency(
                historyRevenue
              )}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-[#DED8CF] bg-white shadow-sm">
        <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4]">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base font-semibold text-[#4B5141]">
              Filters
            </CardTitle>

            <p className="text-xs text-[#73776D]">
              Narrow down transaction history.
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as HistoryStatus
                )
              }
              className="h-10 rounded-md border border-[#D8D2C9] bg-[#FAF8F4] px-3 py-2 text-sm text-[#4B5141] outline-none focus:ring-2 focus:ring-[#8B9A6E]"
            >
              <option value="ALL">
                All History Status
              </option>

              <option value="SELESAI">
                Completed
              </option>

              <option value="DIBATALKAN">
                Cancelled
              </option>
            </select>

            <select
              value={paymentMethodFilter}
              onChange={(event) =>
                setPaymentMethodFilter(
                  event.target
                    .value as HistoryPaymentMethod
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

            <select
              value={customerFilter}
              onChange={(event) =>
                setCustomerFilter(
                  event.target.value
                )
              }
              className="h-10 rounded-md border border-[#D8D2C9] bg-[#FAF8F4] px-3 py-2 text-sm text-[#4B5141] outline-none focus:ring-2 focus:ring-[#8B9A6E]"
            >
              <option value="ALL">
                All Customers
              </option>

              {customers.map(
                (customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {customer.name}
                  </option>
                )
              )}
            </select>

            <Input
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(
                  event.target.value
                )
              }
              className="border-[#D8D2C9] bg-[#FAF8F4] focus-visible:ring-[#8B9A6E]"
            />

            <Input
              type="date"
              value={endDate}
              onChange={(event) =>
                setEndDate(
                  event.target.value
                )
              }
              className="border-[#D8D2C9] bg-[#FAF8F4] focus-visible:ring-[#8B9A6E]"
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-[#8A8D84]">
              {filteredOrders.length} result
              {filteredOrders.length !== 1
                ? "s"
                : ""}
            </p>

            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className="border-[#C8D0B7] bg-[#F0F2E9] text-[#4B5141] hover:bg-[#E0E7D5]"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-[#DED8CF] bg-white shadow-sm">
        <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4]">
          <div>
            <CardTitle className="text-base font-semibold text-[#4B5141]">
              History
            </CardTitle>

            <p className="mt-1 text-xs text-[#73776D]">
              Completed and cancelled orders.
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6">
          {filteredOrders.length ===
          0 ? (
            <div className="rounded-2xl border border-dashed border-[#D8D2C9] bg-[#FAF8F4] px-6 py-10 text-center">
              <p className="text-sm text-[#73776D]">
                No transaction history found.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOrders.map(
                (order) => {
                  const payment =
                    getPayment(order);

                  return (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-[#E2DDD5] bg-[#FDFCFA] px-4 py-4 transition-colors hover:border-[#C8D0B7] hover:bg-[#FAF8F4]"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-[#30352A]">
                              {order.orderCode}
                            </p>

                            <Badge
                              className={
                                order.orderStatus ===
                                "SELESAI"
                                  ? "border-0 bg-[#8B9A6E] px-2 py-0.5 text-[11px] text-white hover:bg-[#8B9A6E]"
                                  : "border-0 bg-[#B85C5C] px-2 py-0.5 text-[11px] text-white hover:bg-[#B85C5C]"
                              }
                            >
                              {order.orderStatus ===
                              "SELESAI"
                                ? "Completed"
                                : "Cancelled"}
                            </Badge>

                            {payment && (
                              <Badge className="border-0 bg-[#EAE2D6] px-2 py-0.5 text-[11px] text-[#4B5141] hover:bg-[#EAE2D6]">
                                {payment.method}
                              </Badge>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <p className="text-sm font-medium text-[#4B5141]">
                              {getCustomerName(
                                order
                              )}
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

                        <div className="flex items-center gap-3 lg:justify-end">
                          <p className="text-sm font-semibold text-[#4B5141]">
                            {formatCurrency(
                              order.total
                            )}
                          </p>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/orders/${order.id}`
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
                }
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HistoryPage;