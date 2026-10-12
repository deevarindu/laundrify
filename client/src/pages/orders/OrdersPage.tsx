import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownUp,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import api from "../../lib/api";
import type { Customer, Order } from "../../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type OrderStatusFilter = "ALL" | Order["orderStatus"];
type PaymentStatusFilter = "ALL" | Order["paymentStatus"];

type StatCard = {
  label: string;
  value: number;
  description: string;
  icon: typeof ClipboardList;
  iconClass: string;
};

const orderStatusLabels: Record<Order["orderStatus"], string> = {
  PESANAN_DITERIMA: "Received",
  DICUCI: "Washing",
  DIKERINGKAN: "Drying",
  DISETRIKA: "Ironing",
  SIAP_DIAMBIL: "Ready for pickup",
  SELESAI: "Completed",
  DIBATALKAN: "Cancelled",
};

const paymentStatusLabels: Record<Order["paymentStatus"], string> = {
  BELUM_DIBAYAR: "Unpaid",
  SUDAH_DIBAYAR: "Paid",
};

const orderStatusClasses: Record<Order["orderStatus"], string> = {
  PESANAN_DITERIMA: "border-[#E9DFC6] bg-[#F8F1E3] text-[#927441]",
  DICUCI: "border-[#D8E3F2] bg-[#EDF3FA] text-[#5474A2]",
  DIKERINGKAN: "border-[#F0DFC4] bg-[#FBF1E1] text-[#A47A39]",
  DISETRIKA: "border-[#E6DCEE] bg-[#F5EDF8] text-[#886C94]",
  SIAP_DIAMBIL: "border-[#D6E7D5] bg-[#EDF5EA] text-[#4D7954]",
  SELESAI: "border-[#D6E7D5] bg-[#EDF5EA] text-[#4D7954]",
  DIBATALKAN: "border-[#EBD6D3] bg-[#FAEFED] text-[#AC665C]",
};

const paymentStatusClasses: Record<Order["paymentStatus"], string> = {
  BELUM_DIBAYAR: "border-[#E9DFC6] bg-[#F8F1E3] text-[#927441]",
  SUDAH_DIBAYAR: "border-[#D6E7D5] bg-[#EDF5EA] text-[#4D7954]",
};

const formatCurrency = (value: number | string): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatDate = (value: string | Date): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatTime = (value: string | Date): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const OrdersPage = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<OrderStatusFilter>("ALL");
  const [paymentFilter, setPaymentFilter] =
    useState<PaymentStatusFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [ordersResponse, customersResponse] = await Promise.all([
        api.get("/order"),
        api.get("/customer"),
      ]);

      const loadedOrders = ordersResponse.data.data;
      const loadedCustomers = customersResponse.data.data;

      setOrders(Array.isArray(loadedOrders) ? loadedOrders : []);
      setCustomers(Array.isArray(loadedCustomers) ? loadedCustomers : []);
      setError("");
    } catch {
      setError("Failed to load orders. Please check your connection and try again.");
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

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders
      .filter((order) => {
        const customerName =
          customerMap.get(order.customerId) ?? "";

        const matchesSearch =
          order.orderCode.toLowerCase().includes(normalizedSearch) ||
          customerName.toLowerCase().includes(normalizedSearch);

        const matchesStatus =
          statusFilter === "ALL" ||
          order.orderStatus === statusFilter;

        const matchesPayment =
          paymentFilter === "ALL" ||
          order.paymentStatus === paymentFilter;

        return matchesSearch && matchesStatus && matchesPayment;
      })
      .sort(
        (first, second) =>
          new Date(second.createdAt).getTime() -
          new Date(first.createdAt).getTime(),
      );
  }, [orders, customerMap, search, statusFilter, paymentFilter]);

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.orderStatus !== "SELESAI" &&
          order.orderStatus !== "DIBATALKAN",
      ).length,
    [orders],
  );

  const unpaidOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.paymentStatus === "BELUM_DIBAYAR",
      ).length,
    [orders],
  );

  const readyOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.orderStatus === "SIAP_DIAMBIL",
      ).length,
    [orders],
  );

  const stats: StatCard[] = [
    {
      label: "Total orders",
      value: orders.length,
      description: "All orders recorded",
      icon: ClipboardList,
      iconClass: "bg-[#F0EEE7] text-[#77785F]",
    },
    {
      label: "Active orders",
      value: activeOrders,
      description: "Not yet completed",
      icon: Clock3,
      iconClass: "bg-[#E9EEF7] text-[#5474A2]",
    },
    {
      label: "Ready for pickup",
      value: readyOrders,
      description: "Waiting for collection",
      icon: CheckCircle2,
      iconClass: "bg-[#E8F2E8] text-[#4D7954]",
    },
    {
      label: "Unpaid orders",
      value: unpaidOrders,
      description: "Awaiting payment",
      icon: ArrowDownUp,
      iconClass: "bg-[#F8F0E1] text-[#A47A39]",
    },
  ];

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "ALL" ||
    paymentFilter !== "ALL";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setPaymentFilter("ALL");
  };

  const handleRefresh = () => {
    setLoading(true);
    void loadData();
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-28 rounded-full bg-[#E5DED3]" />
          <div className="h-7 w-52 rounded-lg bg-[#E5DED3]" />
          <div className="h-4 w-72 max-w-full rounded-lg bg-[#EAE4DB]" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl border border-[#E7E0D6] bg-white"
            />
          ))}
        </div>

        <div className="h-16 animate-pulse rounded-xl border border-[#E7E0D6] bg-white" />
        <div className="h-80 animate-pulse rounded-xl border border-[#E7E0D6] bg-white" />
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="flex min-h-[45vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#FAEFED] text-[#AC665C]">
          <ClipboardList size={22} />
        </div>

        <h2 className="font-heading text-lg font-semibold text-[#34382D]">
          Unable to load orders
        </h2>

        <p className="mt-2 max-w-md text-sm leading-6 text-[#858579]">
          {error}
        </p>

        <Button
          type="button"
          onClick={handleRefresh}
          className="mt-4 h-9 gap-2 rounded-lg bg-[#788A61] px-3 text-sm text-white hover:bg-[#64764F]"
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
            Order management
          </div>

          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[#34382D]">
            Orders
          </h1>

          <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-[#858579]">
            Manage laundry orders, track progress, and monitor payments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E5DED3] bg-white px-2.5 text-xs text-[#727568]">
            <CalendarDays size={14} className="text-[#81906C]" />
            <span>
              {new Intl.DateTimeFormat("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(new Date())}
            </span>
          </div>

          <Button
            type="button"
            onClick={() => navigate("/orders/create")}
            className="h-9 gap-1.5 rounded-lg bg-[#788A61] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#64764F]"
          >
            <Plus size={15} />
            Create order
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
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

                    <p className="mt-2 font-heading text-2xl font-semibold leading-none tracking-tight text-[#34382D]">
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

          <div className="grid gap-2.5 md:grid-cols-[minmax(180px,1fr)_190px_175px_auto]">
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#96968C]"
              />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order or customer..."
                aria-label="Search orders"
                className="h-9 border-[#E3DED5] bg-[#FCFBF8] pl-9 text-xs placeholder:text-[#A1A194] focus-visible:ring-[#8B9A6E]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as OrderStatusFilter)
              }
              aria-label="Filter by order status"
              className="h-9 w-full rounded-md border border-[#E3DED5] bg-[#FCFBF8] px-2.5 text-xs text-[#53594A] outline-none transition focus:ring-2 focus:ring-[#8B9A6E]/50"
            >
              <option value="ALL">All order statuses</option>
              <option value="PESANAN_DITERIMA">Received</option>
              <option value="DICUCI">Washing</option>
              <option value="DIKERINGKAN">Drying</option>
              <option value="DISETRIKA">Ironing</option>
              <option value="SIAP_DIAMBIL">Ready for pickup</option>
              <option value="SELESAI">Completed</option>
              <option value="DIBATALKAN">Cancelled</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(event) =>
                setPaymentFilter(event.target.value as PaymentStatusFilter)
              }
              aria-label="Filter by payment status"
              className="h-9 w-full rounded-md border border-[#E3DED5] bg-[#FCFBF8] px-2.5 text-xs text-[#53594A] outline-none transition focus:ring-2 focus:ring-[#8B9A6E]/50"
            >
              <option value="ALL">All payment statuses</option>
              <option value="BELUM_DIBAYAR">Unpaid</option>
              <option value="SUDAH_DIBAYAR">Paid</option>
            </select>

            <Button
              type="button"
              variant="outline"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="h-9 gap-1.5 border-[#E3DED5] bg-white px-2.5 text-xs text-[#65695D] hover:bg-[#F5F2EC] disabled:opacity-50"
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

              {statusFilter !== "ALL" && (
                <Badge
                  variant="outline"
                  className="rounded-md border-[#D7DCCF] bg-[#F0F3EB] px-2 py-0.5 text-[10px] font-normal text-[#59694A]"
                >
                  {orderStatusLabels[statusFilter]}
                </Badge>
              )}

              {paymentFilter !== "ALL" && (
                <Badge
                  variant="outline"
                  className="rounded-md border-[#D7DCCF] bg-[#F0F3EB] px-2 py-0.5 text-[10px] font-normal text-[#59694A]"
                >
                  {paymentStatusLabels[paymentFilter]}
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
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            className="h-7 gap-1.5 border-[#EBD6D3] bg-white px-2 text-[11px] text-[#AC665C] hover:bg-[#F9E5E1]"
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
              Order list
            </CardTitle>

            <p className="mt-1 text-[11px] text-[#858579]">
              Showing {filteredOrders.length} of {orders.length} orders
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleRefresh}
            className="h-8 gap-1.5 rounded-md border-[#E3DED5] bg-white px-2.5 text-[11px] font-medium text-[#65695D] hover:bg-[#F5F2EC]"
          >
            <RefreshCw size={12} />
            Refresh
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {filteredOrders.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-4 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3F0E9] text-[#858B75]">
                <ClipboardList size={21} strokeWidth={1.7} />
              </div>

              <h3 className="mt-3 font-heading text-sm font-semibold text-[#454B3A]">
                {hasActiveFilters ? "No matching orders" : "No orders yet"}
              </h3>

              <p className="mt-1.5 max-w-sm text-xs leading-5 text-[#858579]">
                {hasActiveFilters
                  ? "Try changing your search or filters."
                  : "Create your first laundry order to start tracking your operations."}
              </p>

              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetFilters}
                  className="mt-3 h-8 gap-1.5 border-[#E3DED5] px-2.5 text-xs text-[#53594A] hover:bg-[#F5F2EC]"
                >
                  <X size={13} />
                  Clear filters
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => navigate("/orders/create")}
                  className="mt-3 h-8 gap-1.5 rounded-lg bg-[#788A61] px-2.5 text-xs text-white hover:bg-[#64764F]"
                >
                  <Plus size={14} />
                  Create order
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[790px] border-collapse text-left">
                <thead>
                  <tr className="bg-[#FAF9F6]">
                    <th className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579] sm:px-4">
                      Order
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579]">
                      Customer
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579]">
                      Created
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579]">
                      Order status
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579]">
                      Payment
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579]">
                      Total
                    </th>
                    <th className="px-3 py-2.5 sm:px-4" />
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((order) => {
                    const customerName =
                      customerMap.get(order.customerId) ??
                      "Unknown customer";

                    return (
                      <tr
                        key={order.id}
                        className="border-t border-[#F0ECE5] transition-colors hover:bg-[#FCFBF8]"
                      >
                        <td className="px-3 py-3 sm:px-4">
                          <p className="whitespace-nowrap text-xs font-semibold text-[#454B3A]">
                            {order.orderCode}
                          </p>
                          <p className="mt-0.5 text-[10px] text-[#96968C]">
                            ID: {order.id}
                          </p>
                        </td>

                        <td className="px-3 py-3">
                          <p className="max-w-[145px] truncate text-xs font-medium text-[#53594A]">
                            {customerName}
                          </p>
                          <p className="mt-0.5 text-[10px] text-[#96968C]">
                            ID: {order.customerId}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-3 py-3">
                          <p className="text-xs text-[#53594A]">
                            {formatDate(order.createdAt)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-[#96968C]">
                            {formatTime(order.createdAt)}
                          </p>
                        </td>

                        <td className="px-3 py-3">
                          <Badge
                            variant="outline"
                            className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-medium ${orderStatusClasses[order.orderStatus]}`}
                          >
                            {orderStatusLabels[order.orderStatus]}
                          </Badge>
                        </td>

                        <td className="px-3 py-3">
                          <Badge
                            variant="outline"
                            className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-medium ${paymentStatusClasses[order.paymentStatus]}`}
                          >
                            {paymentStatusLabels[order.paymentStatus]}
                          </Badge>
                        </td>

                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          <span className="text-xs font-semibold tabular-nums text-[#34382D]">
                            {formatCurrency(order.total)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-3 py-3 text-right sm:px-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/order/${order.id}`)}
                            className="h-7 gap-1 rounded-md border-[#DDE2D4] bg-white px-2 text-[10px] font-medium text-[#65774D] transition hover:border-[#C9D2BD] hover:bg-[#F1F4EC]"
                          >
                            Details
                            <ArrowRight size={11} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredOrders.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEE9E1] px-3.5 py-2.5 sm:px-4">
              <p className="text-[10px] text-[#96968C]">
                {filteredOrders.length}{" "}
                {filteredOrders.length === 1 ? "order" : "orders"} displayed
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

export default OrdersPage;