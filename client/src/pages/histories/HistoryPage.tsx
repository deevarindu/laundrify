import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import api from "../../lib/api";
import type { Customer, Order, Payment, PaymentMethod } from "../../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type HistoryStatus = "ALL" | "SELESAI" | "DIBATALKAN";
type HistoryPaymentMethod = "ALL" | PaymentMethod;

type StatCard = {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
};

const orderStatusLabels: Record<HistoryStatus, string> = {
  ALL: "Semua Status",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
};

const orderStatusNames: Record<Order["orderStatus"], string> = {
  PESANAN_DITERIMA: "Pesanan Diterima",
  DICUCI: "Dicuci",
  DIKERINGKAN: "Dikeringkan",
  DISETRIKA: "Disetrika",
  SIAP_DIAMBIL: "Siap Diambil",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Tunai",
  TRANSFER: "Transfer",
  QRIS: "QRIS",
};

const paymentMethodStyles: Record<PaymentMethod, string> = {
  CASH: "border-[#D9E8D8] bg-[#EFF6ED] text-[#53734F]",
  TRANSFER: "border-[#D9E3F0] bg-[#F0F4FA] text-[#526C91]",
  QRIS: "border-[#E6DAF0] bg-[#F6F0FA] text-[#80639A]",
};

function extractList<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value !== "object" || value === null) {
    return [];
  }

  const record = value as Record<string, unknown>;

  if (Array.isArray(record.data)) {
    return record.data as T[];
  }

  if (Array.isArray(record.items)) {
    return record.items as T[];
  }

  if (record.data && typeof record.data === "object") {
    return extractList<T>(record.data);
  }

  return [];
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: unknown;
          };
        };
      }
    ).response;

    if (typeof response?.data?.message === "string") {
      return response.data.message;
    }
  }

  return "Terjadi kesalahan saat memuat riwayat transaksi.";
}

function formatCurrency(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getDateValue(value: string | Date): number {
  const date = new Date(value);
  const timestamp = date.getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export default function HistoryPage() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<HistoryStatus>("ALL");
  const [methodFilter, setMethodFilter] =
    useState<HistoryPaymentMethod>("ALL");
  const [customerFilter, setCustomerFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [orderResponse, customerResponse, paymentResponse] =
        await Promise.all([
          api.get("/order"),
          api.get("/customer"),
          api.get("/payment"),
        ]);

      setOrders(extractList<Order>(orderResponse.data));
      setCustomers(extractList<Customer>(customerResponse.data));
      setPayments(extractList<Payment>(paymentResponse.data));
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
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
        customers.map((customer) => [customer.id, customer] as const),
      ),
    [customers],
  );

  const paymentMap = useMemo(
    () =>
      new Map(
        payments.map((payment) => [payment.orderId, payment] as const),
      ),
    [payments],
  );

  const historyOrders = useMemo(
    () =>
      orders
        .filter(
          (order) =>
            order.orderStatus === "SELESAI" ||
            order.orderStatus === "DIBATALKAN",
        )
        .sort(
          (a, b) =>
            getDateValue(b.createdAt) - getDateValue(a.createdAt),
        ),
    [orders],
  );

  const completedOrders = useMemo(
    () =>
      historyOrders.filter(
        (order) => order.orderStatus === "SELESAI",
      ),
    [historyOrders],
  );

  const cancelledOrders = useMemo(
    () =>
      historyOrders.filter(
        (order) => order.orderStatus === "DIBATALKAN",
      ),
    [historyOrders],
  );

  const completedRevenue = useMemo(
    () =>
      completedOrders.reduce(
        (total, order) => total + Number(order.total ?? 0),
        0,
      ),
    [completedOrders],
  );

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return historyOrders.filter((order) => {
      const customer = customerMap.get(order.customerId);
      const payment = paymentMap.get(order.id);

      const matchesSearch =
        keyword === "" ||
        order.orderCode.toLowerCase().includes(keyword) ||
        (customer?.name ?? "").toLowerCase().includes(keyword) ||
        (customer?.phone ?? "").toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" ||
        order.orderStatus === statusFilter;

      const matchesMethod =
        methodFilter === "ALL" ||
        payment?.method === methodFilter;

      const matchesCustomer =
        customerFilter === "ALL" ||
        String(order.customerId) === customerFilter;

      const orderDate = getDateValue(order.createdAt);
      const startTimestamp = startDate
        ? new Date(`${startDate}T00:00:00`).getTime()
        : null;
      const endTimestamp = endDate
        ? new Date(`${endDate}T23:59:59.999`).getTime()
        : null;

      const matchesStartDate =
        startTimestamp === null || orderDate >= startTimestamp;

      const matchesEndDate =
        endTimestamp === null || orderDate <= endTimestamp;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesMethod &&
        matchesCustomer &&
        matchesStartDate &&
        matchesEndDate
      );
    });
  }, [
    historyOrders,
    customerMap,
    paymentMap,
    search,
    statusFilter,
    methodFilter,
    customerFilter,
    startDate,
    endDate,
  ]);

  const stats: StatCard[] = [
    {
      label: "Total Riwayat",
      value: String(historyOrders.length),
      description: "Pesanan selesai dan dibatalkan",
      icon: ClipboardList,
    },
    {
      label: "Pesanan Selesai",
      value: String(completedOrders.length),
      description: "Transaksi berhasil diselesaikan",
      icon: CheckCircle2,
    },
    {
      label: "Total Pendapatan",
      value: formatCurrency(completedRevenue),
      description: "Dari pesanan yang selesai",
      icon: CircleDollarSign,
    },
    {
      label: "Pesanan Dibatalkan",
      value: String(cancelledOrders.length),
      description: "Pesanan yang tidak dilanjutkan",
      icon: X,
    },
  ];

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setMethodFilter("ALL");
    setCustomerFilter("ALL");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters =
    search !== "" ||
    statusFilter !== "ALL" ||
    methodFilter !== "ALL" ||
    customerFilter !== "ALL" ||
    startDate !== "" ||
    endDate !== "";

  return (
    <div className="space-y-5 pb-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-[#829078]">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Manajemen Transaksi</span>
          </div>

          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[#34382D]">
            Riwayat Transaksi
          </h1>

          <p className="mt-1 text-sm text-[#858779]">
            Lihat dan telusuri pesanan yang telah selesai atau dibatalkan.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => void loadData()}
          disabled={loading}
          className="h-9 w-fit rounded-lg border-[#E5E0D7] bg-white px-3 text-xs font-medium text-[#555B4D] hover:bg-[#F5F2EC]"
        >
          <RefreshCw
            className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card
              key={stat.label}
              className="rounded-xl border-[#EAE5DB] bg-white shadow-none"
            >
              <CardContent className="p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#858779]">
                      {stat.label}
                    </p>
                    <p className="mt-2 truncate text-xl font-semibold tracking-tight text-[#34382D]">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-[11px] text-[#969789]">
                      {stat.description}
                    </p>
                  </div>

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F0F3E9] text-[#778865]">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-xl border-[#EAE5DB] bg-white shadow-none">
        <CardContent className="space-y-3.5 p-3.5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#829078]" />
            <h2 className="text-sm font-semibold text-[#414638]">
              Filter Riwayat
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#969789]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari kode atau pelanggan..."
                className="h-9 rounded-lg border-[#E5E0D7] pl-9 text-xs placeholder:text-[#A6A698] focus-visible:ring-[#A6B394]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as HistoryStatus)
              }
              className="h-9 w-full rounded-lg border border-[#E5E0D7] bg-white px-3 text-xs text-[#555B4D] outline-none focus:border-[#A6B394] focus:ring-2 focus:ring-[#A6B394]/20"
            >
              {Object.entries(orderStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={methodFilter}
              onChange={(event) =>
                setMethodFilter(
                  event.target.value as HistoryPaymentMethod,
                )
              }
              className="h-9 w-full rounded-lg border border-[#E5E0D7] bg-white px-3 text-xs text-[#555B4D] outline-none focus:border-[#A6B394] focus:ring-2 focus:ring-[#A6B394]/20"
            >
              <option value="ALL">Semua Metode Pembayaran</option>
              {Object.entries(paymentMethodLabels).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>

            <select
              value={customerFilter}
              onChange={(event) => setCustomerFilter(event.target.value)}
              className="h-9 w-full rounded-lg border border-[#E5E0D7] bg-white px-3 text-xs text-[#555B4D] outline-none focus:border-[#A6B394] focus:ring-2 focus:ring-[#A6B394]/20"
            >
              <option value="ALL">Semua Pelanggan</option>
              {customers.map((customer) => (
                <option key={customer.id} value={String(customer.id)}>
                  {customer.name}
                </option>
              ))}
            </select>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] font-medium text-[#858779]">
                Dari tanggal
              </label>
              <Input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-9 rounded-lg border-[#E5E0D7] text-xs focus-visible:ring-[#A6B394]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] font-medium text-[#858779]">
                Sampai tanggal
              </label>
              <Input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-9 rounded-lg border-[#E5E0D7] text-xs focus-visible:ring-[#A6B394]"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={resetFilters}
                className="h-8 rounded-lg px-2.5 text-xs text-[#737967] hover:bg-[#F5F2EC]"
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Reset filter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-xl border-[#EAE5DB] bg-white shadow-none">
        <div className="flex flex-col justify-between gap-2 border-b border-[#EEE9E0] px-4 py-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold text-[#414638]">
              Daftar Riwayat
            </h2>
            <p className="mt-0.5 text-xs text-[#929385]">
              {filteredOrders.length} transaksi ditemukan
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#858779]">
            <Wallet className="h-3.5 w-3.5" />
            <span>Pesanan selesai dan dibatalkan</span>
          </div>
        </div>

        {error && (
          <div className="m-4 rounded-lg border border-[#F0D5D0] bg-[#FFF5F2] px-3.5 py-3 text-xs text-[#A65348]">
            <p>{error}</p>
            <Button
              variant="ghost"
              onClick={() => void loadData()}
              className="mt-1 h-7 px-2 text-xs text-[#A65348] hover:bg-[#FCE9E5]"
            >
              Coba lagi
            </Button>
          </div>
        )}

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#EEE9E0] bg-[#FAF9F6]">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#858779]">
                  Kode Pesanan
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#858779]">
                  Pelanggan
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#858779]">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#858779]">
                  Status
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#858779]">
                  Pembayaran
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-[#858779]">
                  Total
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-[#858779]">
                  Detail
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F0ECE5]">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-xs text-[#929385]"
                  >
                    Memuat riwayat transaksi...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4F2EC] text-[#969789]">
                        <ClipboardList className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-[#555B4D]">
                        Riwayat tidak ditemukan
                      </p>
                      <p className="text-xs text-[#929385]">
                        Coba ubah kata kunci atau filter yang digunakan.
                      </p>
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          onClick={resetFilters}
                          className="mt-1 h-8 rounded-lg border-[#E5E0D7] text-xs"
                        >
                          Reset filter
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const customer = customerMap.get(order.customerId);
                  const payment = paymentMap.get(order.id);
                  const isCompleted = order.orderStatus === "SELESAI";

                  return (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-[#FCFBF8]"
                    >
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-[#414638]">
                          {order.orderCode}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-[#414638]">
                          {customer?.name ?? "Pelanggan tidak ditemukan"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#929385]">
                          {customer?.phone ?? "-"}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-xs text-[#737967]">
                        {formatDate(order.createdAt)}
                      </td>

                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            isCompleted
                              ? "rounded-md border-[#D9E8D8] bg-[#EFF6ED] px-2 py-0.5 text-[10px] font-medium text-[#53734F]"
                              : "rounded-md border-[#F0DAD3] bg-[#FFF3EF] px-2 py-0.5 text-[10px] font-medium text-[#A96350]"
                          }
                        >
                          {orderStatusNames[order.orderStatus]}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        {payment?.method ? (
                          <Badge
                            variant="outline"
                            className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                              paymentMethodStyles[payment.method]
                            }`}
                          >
                            {paymentMethodLabels[payment.method]}
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-[#929385]">
                            Tidak tersedia
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums text-[#414638]">
                        {formatCurrency(order.total)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/order/${order.id}`)}
                          className="h-7 rounded-md border-[#E5E0D7] px-2.5 text-[11px] text-[#555B4D] hover:bg-[#F5F2EC]"
                        >
                          Detail
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col justify-between gap-1 border-t border-[#EEE9E0] px-4 py-3 sm:flex-row sm:items-center">
          <p className="text-[11px] text-[#929385]">
            Menampilkan {filteredOrders.length} dari {historyOrders.length} transaksi
          </p>
          <p className="text-[11px] text-[#929385]">
            Pendapatan dihitung dari pesanan berstatus selesai.
          </p>
        </div>
      </Card>
    </div>
  );
}
