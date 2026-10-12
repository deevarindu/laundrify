
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Receipt,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Wallet,
  X,
} from "lucide-react";
import api from "../../lib/api";
import type {
  Customer,
  Order,
  Payment,
  PaymentMethod,
} from "../../types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type MethodFilter = "ALL" | PaymentMethod;

type StatCard = {
  label: string;
  value: string | number;
  description: string;
  icon: typeof Receipt;
  iconClass: string;
};

const methodLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  TRANSFER: "Transfer",
  QRIS: "QRIS",
};

const methodClasses: Record<PaymentMethod, string> = {
  CASH: "border-[#E9DFC6] bg-[#F8F1E3] text-[#927441]",
  TRANSFER: "border-[#D8E3F2] bg-[#EDF3FA] text-[#5474A2]",
  QRIS: "border-[#E6DCEE] bg-[#F5EDF8] text-[#886C94]",
};

const formatCurrency = (value: number | string): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatDateTime = (value: unknown): string => {
  if (!value) return "-";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;

    const response =
      typeof record.response === "object" && record.response !== null
        ? (record.response as Record<string, unknown>)
        : {};

    const data =
      typeof response.data === "object" && response.data !== null
        ? (response.data as Record<string, unknown>)
        : {};

    if (typeof data.message === "string") {
      return data.message;
    }

    if (typeof record.message === "string") {
      return record.message;
    }
  }

  return fallback;
};

const PaymentsPage = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] =
    useState<MethodFilter>("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
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

      const paymentData = paymentsResponse.data.data;
      const orderData = ordersResponse.data.data;
      const customerData = customersResponse.data.data;

      setPayments(Array.isArray(paymentData) ? paymentData : []);
      setOrders(Array.isArray(orderData) ? orderData : []);
      setCustomers(Array.isArray(customerData) ? customerData : []);
      setError("");
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(
          requestError,
          "Failed to load payment data. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      if (!cancelled) {
        void loadData();
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loadData]);

  const orderMap = useMemo(
    () =>
      new Map(
        orders.map((order) => [order.id, order]),
      ),
    [orders],
  );

  const customerMap = useMemo(
    () =>
      new Map(
        customers.map((customer) => [
          customer.id,
          customer.name,
        ]),
      ),
    [customers],
  );

  const getCustomerName = useCallback(
    (payment: Payment) => {
      const order = orderMap.get(payment.orderId);

      if (!order) return "Unknown customer";

      return (
        customerMap.get(order.customerId) ??
        "Unknown customer"
      );
    },
    [orderMap, customerMap],
  );

  const getOrderCode = useCallback(
    (payment: Payment) =>
      orderMap.get(payment.orderId)?.orderCode ??
      `Order #${payment.orderId}`,
    [orderMap],
  );

  const filteredPayments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return payments
      .filter((payment) => {
        const order = orderMap.get(payment.orderId);
        const customerName = order
          ? customerMap.get(order.customerId) ?? ""
          : "";

        const matchesSearch =
          payment.orderId
            .toString()
            .includes(normalizedSearch) ||
          (order?.orderCode ?? "")
            .toLowerCase()
            .includes(normalizedSearch) ||
          customerName.toLowerCase().includes(normalizedSearch) ||
          methodLabels[payment.method]
            .toLowerCase()
            .includes(normalizedSearch);

        const matchesMethod =
          methodFilter === "ALL" ||
          payment.method === methodFilter;

        return matchesSearch && matchesMethod;
      })
      .sort((first, second) => {
        const firstDate = new Date(
          String(first.paidAt ?? 0),
        ).getTime();
        const secondDate = new Date(
          String(second.paidAt ?? 0),
        ).getTime();

        return (
          (Number.isNaN(secondDate) ? 0 : secondDate) -
          (Number.isNaN(firstDate) ? 0 : firstDate)
        );
      });
  }, [
    payments,
    orderMap,
    customerMap,
    search,
    methodFilter,
  ]);

  const totalAmount = useMemo(
    () =>
      filteredPayments.reduce(
        (sum, payment) => sum + (Number(payment.amount) || 0),
        0,
      ),
    [filteredPayments],
  );

  const cashPayments = useMemo(
    () =>
      filteredPayments.filter(
        (payment) => payment.method === "CASH",
      ).length,
    [filteredPayments],
  );

  const transferPayments = useMemo(
    () =>
      filteredPayments.filter(
        (payment) => payment.method === "TRANSFER",
      ).length,
    [filteredPayments],
  );

  const qrisPayments = useMemo(
    () =>
      filteredPayments.filter(
        (payment) => payment.method === "QRIS",
      ).length,
    [filteredPayments],
  );

  const stats: StatCard[] = [
    {
      label: "Transactions",
      value: filteredPayments.length,
      description: "Recorded payment transactions",
      icon: Receipt,
      iconClass: "bg-[#F0EEE7] text-[#77785F]",
    },
    {
      label: "Total amount",
      value: formatCurrency(totalAmount),
      description: "Combined amount for current results",
      icon: CircleDollarSign,
      iconClass: "bg-[#E8F2E8] text-[#4D7954]",
    },
    {
      label: "Payment methods",
      value: `${cashPayments + transferPayments + qrisPayments}`,
      description: `${cashPayments} cash · ${transferPayments} transfer · ${qrisPayments} QRIS`,
      icon: Wallet,
      iconClass: "bg-[#E9EEF7] text-[#5474A2]",
    },
  ];

  const hasActiveFilters =
    search.trim() !== "" || methodFilter !== "ALL";

  const resetFilters = () => {
    setSearch("");
    setMethodFilter("ALL");
  };

  const handleRefresh = () => {
    setLoading(true);
    void loadData();
  };

  const todayLabel = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-28 rounded-full bg-[#E5DED3]" />
          <div className="h-7 w-52 rounded-lg bg-[#E5DED3]" />
          <div className="h-4 w-72 max-w-full rounded-lg bg-[#EAE4DB]" />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl border border-[#E7E0D6] bg-white"
            />
          ))}
        </div>

        <div className="h-72 animate-pulse rounded-xl border border-[#E7E0D6] bg-white" />
      </div>
    );
  }

  if (error && payments.length === 0) {
    return (
      <div className="flex min-h-[45vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#FAEFED] text-[#AC665C]">
          <Receipt size={22} />
        </div>

        <h2 className="font-heading text-lg font-semibold text-[#34382D]">
          Unable to load payments
        </h2>

        <p className="mt-2 max-w-md text-sm leading-5 text-[#858579]">
          {error}
        </p>

        <Button
          type="button"
          onClick={handleRefresh}
          className="mt-4 h-9 gap-2 rounded-lg bg-[#788A61] px-3 text-xs font-semibold text-white hover:bg-[#64764F]"
        >
          <RefreshCw size={14} />
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#81906C]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#81906C]" />
            Payment management
          </div>

          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[#34382D]">
            Payments
          </h1>

          <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-[#858579]">
            Review payment records, transaction amounts, and payment methods.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E5DED3] bg-white px-2.5 text-xs text-[#727568]">
            <CalendarDays size={14} className="text-[#81906C]" />
            <span>{todayLabel}</span>
          </div>

          <Button
            type="button"
            onClick={handleRefresh}
            className="h-9 gap-1.5 rounded-lg border border-[#E3DED5] bg-white px-3 text-xs font-medium text-[#53594A] shadow-none hover:bg-[#F5F2EC]"
            variant="outline"
          >
            <RefreshCw size={13} />
            Refresh
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card
              key={stat.label}
              className="rounded-xl border-[#E7E0D6] bg-white shadow-[0_1px_5px_rgba(52,56,45,0.025)] transition-colors hover:border-[#D7DCCF]"
            >
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#777B70]">
                      {stat.label}
                    </p>

                    <p className="mt-2 break-words font-heading text-2xl font-semibold leading-tight tracking-tight text-[#34382D]">
                      {stat.value}
                    </p>
                  </div>

                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${stat.iconClass}`}
                  >
                    <Icon size={17} strokeWidth={1.8} />
                  </div>
                </div>

                <p className="mt-2.5 text-[11px] leading-4 text-[#94968C]">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card className="rounded-xl border-[#E7E0D6] bg-white shadow-sm">
        <CardContent className="p-3.5 sm:p-4">
          <div className="mb-3 flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-[#81906C]" />

            <h2 className="text-[13px] font-semibold text-[#454B3A]">
              Search and filters
            </h2>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-[minmax(180px,1fr)_200px_auto]">
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#96968C]"
              />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order code, customer, or method..."
                aria-label="Search payments"
                className="h-9 border-[#E3DED5] bg-[#FCFBF8] pl-9 text-xs placeholder:text-[#A1A194] focus-visible:ring-[#8B9A6E]"
              />
            </div>

            <select
              value={methodFilter}
              onChange={(event) =>
                setMethodFilter(event.target.value as MethodFilter)
              }
              aria-label="Filter by payment method"
              className="h-9 w-full rounded-md border border-[#E3DED5] bg-[#FCFBF8] px-2.5 text-xs text-[#53594A] outline-none focus:ring-2 focus:ring-[#8B9A6E]/50"
            >
              <option value="ALL">All payment methods</option>
              <option value="CASH">Cash</option>
              <option value="TRANSFER">Transfer</option>
              <option value="QRIS">QRIS</option>
            </select>

            <Button
              type="button"
              variant="outline"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="h-9 gap-1.5 border-[#E3DED5] px-2.5 text-xs text-[#65695D] hover:bg-[#F5F2EC] disabled:opacity-50"
            >
              <X size={13} />
              Reset
            </Button>
          </div>

          {hasActiveFilters && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-[#858579]">
                Active filters:
              </span>

              {search.trim() && (
                <Badge
                  variant="outline"
                  className="rounded-md border-[#E3DED5] bg-[#F8F6F1] px-2 py-0.5 text-[10px] font-normal text-[#65695D]"
                >
                  Search: {search.trim()}
                </Badge>
              )}

              {methodFilter !== "ALL" && (
                <Badge
                  variant="outline"
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${methodClasses[methodFilter]}`}
                >
                  {methodLabels[methodFilter]}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#EBD6D3] bg-[#FAEFED] px-3 py-2.5">
          <p className="text-xs text-[#AC665C]">{error}</p>

          <Button
            type="button"
            onClick={handleRefresh}
            variant="outline"
            className="h-7 gap-1.5 border-[#EBD6D3] bg-white px-2.5 text-[11px] text-[#AC665C] hover:bg-[#F9E5E1]"
          >
            <RefreshCw size={12} />
            Retry
          </Button>
        </div>
      )}

      <Card className="overflow-hidden rounded-xl border-[#E7E0D6] bg-white shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-[#EEE9E1] px-3.5 py-3 sm:px-4">
          <div>
            <CardTitle className="font-heading text-sm font-semibold text-[#34382D]">
              Payment history
            </CardTitle>

            <p className="mt-1 text-[11px] text-[#858579]">
              Showing {filteredPayments.length} of {payments.length} transactions
            </p>
          </div>

          <Badge
            variant="outline"
            className="rounded-md border-[#D7DCCF] bg-[#F0F3EB] px-2 py-1 text-[10px] font-medium text-[#59694A]"
          >
            <CheckCircle2 size={11} className="mr-1" />
            Recorded
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          {filteredPayments.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-4 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3F0E9] text-[#858B75]">
                <Receipt size={20} />
              </div>

              <h3 className="mt-3 font-heading text-sm font-semibold text-[#454B3A]">
                {hasActiveFilters
                  ? "No matching transactions"
                  : "No payments yet"}
              </h3>

              <p className="mt-1.5 max-w-sm text-xs leading-5 text-[#858579]">
                {hasActiveFilters
                  ? "Try changing your search or payment method filter."
                  : "Recorded payments will appear here once transactions are available."}
              </p>

              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetFilters}
                  className="mt-3 h-8 gap-1.5 border-[#E3DED5] px-2.5 text-xs text-[#53594A] hover:bg-[#F5F2EC]"
                >
                  <X size={13} />
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="bg-[#FAF9F6]">
                    <th className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579] sm:px-4">
                      Transaction
                    </th>

                    <th className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579]">
                      Customer
                    </th>

                    <th className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579]">
                      Payment date
                    </th>

                    <th className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579]">
                      Method
                    </th>

                    <th className="whitespace-nowrap px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579] sm:px-4">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-t border-[#F0ECE5] transition-colors hover:bg-[#FCFBF8]"
                    >
                      <td className="px-3 py-3 sm:px-4">
                        <p className="whitespace-nowrap text-xs font-semibold text-[#454B3A]">
                          {getOrderCode(payment)}
                        </p>

                        <p className="mt-0.5 text-[10px] text-[#96968C]">
                          Transaction #{payment.id}
                        </p>
                      </td>

                      <td className="px-3 py-3">
                        <p className="max-w-[180px] truncate text-xs font-medium text-[#53594A]">
                          {getCustomerName(payment)}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3">
                        <p className="text-xs text-[#53594A]">
                          {formatDateTime(payment.paidAt)}
                        </p>
                      </td>

                      <td className="px-3 py-3">
                        <Badge
                          variant="outline"
                          className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-medium ${methodClasses[payment.method]}`}
                        >
                          {payment.method === "CASH" ? (
                            <Wallet size={11} className="mr-1" />
                          ) : payment.method === "TRANSFER" ? (
                            <CreditCard size={11} className="mr-1" />
                          ) : (
                            <ArrowDownUp size={11} className="mr-1" />
                          )}

                          {methodLabels[payment.method]}
                        </Badge>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-right sm:px-4">
                        <span className="text-xs font-semibold tabular-nums text-[#34382D]">
                          {formatCurrency(payment.amount)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredPayments.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEE9E1] px-3.5 py-2.5 sm:px-4">
              <p className="text-[10px] text-[#96968C]">
                {filteredPayments.length}{" "}
                {filteredPayments.length === 1
                  ? "transaction"
                  : "transactions"}{" "}
                displayed
              </p>

              <p className="text-[10px] text-[#96968C]">
                Sorted by most recent
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsPage;
