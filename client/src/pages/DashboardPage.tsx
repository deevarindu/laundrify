
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Package,
  Plus,
  RefreshCw,
  Shirt,
  Truck,
  WashingMachine,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

type DataRecord = Record<string, unknown>;

type DashboardStats = {
  activeOrders?: number;
  processingOrders?: number;
  readyOrders?: number;
  unpaidOrders?: number;
  todayRevenue?: number;
  [key: string]: unknown;
};

type SummaryCard = {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
};

type ServiceSummary = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  transactions: number;
  revenue: number;
};

const isRecord = (value: unknown): value is DataRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asRecord = (value: unknown): DataRecord =>
  isRecord(value) ? value : {};

const unwrapRecord = (value: unknown): DataRecord => {
  let current = asRecord(value);

  for (let index = 0; index < 5; index += 1) {
    if (!isRecord(current.data)) break;
    current = current.data;
  }

  return current;
};

const extractArray = (
  value: unknown,
  keys: string[],
): DataRecord[] => {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }

  const current = asRecord(value);

  for (const key of keys) {
    if (Array.isArray(current[key])) {
      return current[key].filter(isRecord);
    }
  }

  if (isRecord(current.data)) {
    const result = extractArray(current.data, keys);
    if (result.length > 0) return result;
  }

  if (isRecord(current.result)) {
    const result = extractArray(current.result, keys);
    if (result.length > 0) return result;
  }

  return [];
};

const formatCurrency = (value: unknown): string =>
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
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getNumber = (
  source: DataRecord,
  keys: string[],
  fallback: number,
): number => {
  for (const key of keys) {
    const value = source[key];

    if (value !== undefined && value !== null && value !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return fallback;
};

const getOrderCode = (order: DataRecord): string =>
  String(
    order.orderCode ??
      order.code ??
      order.invoiceNumber ??
      order.id ??
      "-",
  );

const getCustomerName = (order: DataRecord): string => {
  const customer = asRecord(order.customer);

  return String(
    customer.name ??
      order.customerName ??
      customer.fullName ??
      "Customer",
  );
};

const getOrderTotal = (order: DataRecord): number =>
  getNumber(order, ["total", "grandTotal", "amount"], 0);

const getOrderCreatedAt = (order: DataRecord): unknown =>
  order.createdAt ?? order.created_at ?? order.orderDate;

const normalizeOrderStatus = (value: unknown): string => {
  const status = String(value ?? "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_");

  const aliases: Record<string, string> = {
    RECEIVED: "RECEIVED",
    PESANAN_DITERIMA: "RECEIVED",
    DITERIMA: "RECEIVED",
    WASHING: "WASHING",
    DICUCI: "WASHING",
    DRYING: "DRYING",
    DIKERINGKAN: "DRYING",
    IRONING: "IRONING",
    DISETRIKA: "IRONING",
    READY: "READY",
    SIAP_DIAMBIL: "READY",
    READY_FOR_PICKUP: "READY",
    COMPLETED: "COMPLETED",
    SELESAI: "COMPLETED",
    CANCELLED: "CANCELLED",
    CANCELED: "CANCELLED",
    DIBATALKAN: "CANCELLED",
  };

  return aliases[status] ?? status;
};

const getOrderStatus = (order: DataRecord): string =>
  normalizeOrderStatus(order.status ?? order.orderStatus);

const normalizePaymentStatus = (value: unknown): string => {
  const status = String(value ?? "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_");

  const aliases: Record<string, string> = {
    PAID: "PAID",
    LUNAS: "PAID",
    SUDAH_DIBAYAR: "PAID",
    SUCCESS: "PAID",
    SETTLED: "PAID",
    UNPAID: "UNPAID",
    BELUM_BAYAR: "UNPAID",
    BELUM_DIBAYAR: "UNPAID",
    PENDING: "UNPAID",
    PARTIALLY_PAID: "PARTIALLY_PAID",
    FAILED: "FAILED",
    EXPIRED: "FAILED",
  };

  return aliases[status] ?? status;
};

const getPaymentStatus = (order: DataRecord): string => {
  const payment = asRecord(order.payment);

  return normalizePaymentStatus(
    order.paymentStatus ?? payment.status,
  );
};

const orderStatusLabels: Record<string, string> = {
  RECEIVED: "Received",
  WASHING: "Washing",
  DRYING: "Drying",
  IRONING: "Ironing",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const paymentStatusLabels: Record<string, string> = {
  PAID: "Paid",
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially paid",
  FAILED: "Failed",
};

const getOrderItems = (order: DataRecord): DataRecord[] => {
  const items = order.items ?? order.orderItems ?? order.OrderItem;

  return Array.isArray(items) ? items.filter(isRecord) : [];
};

const getItemQuantity = (item: DataRecord): number =>
  getNumber(item, ["quantity", "qty", "amount"], 1);

const getItemRevenue = (item: DataRecord): number => {
  const explicitRevenue = item.subtotal ?? item.total;

  if (explicitRevenue !== undefined && explicitRevenue !== null) {
    return Number(explicitRevenue) || 0;
  }

  const service = asRecord(item.service);

  return (
    (Number(item.price ?? item.unitPrice ?? service.price) || 0) *
    getItemQuantity(item)
  );
};

const getItemServiceId = (item: DataRecord): string => {
  const service = asRecord(item.service);

  return String(item.serviceId ?? service.id ?? item.id ?? "");
};

const getItemServiceName = (item: DataRecord): string => {
  const service = asRecord(item.service);

  return String(
    item.serviceName ?? service.name ?? item.name ?? "Laundry service",
  );
};

const getServiceUnit = (service: DataRecord): string =>
  String(service.unit ?? service.category ?? "-");

const DashboardPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [dashboardStats, setDashboardStats] =
    useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<DataRecord[]>([]);
  const [services, setServices] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashboardResponse, ordersResponse, servicesResponse] =
        await Promise.all([
          api.get("/dashboard"),
          api.get("/order"),
          api.get("/service"),
        ]);

      const dashboardPayload = unwrapRecord(dashboardResponse.data);
      const nestedStats = asRecord(
        dashboardPayload.stats ?? dashboardPayload.dashboard,
      );

      const statsSource =
        Object.keys(nestedStats).length > 0
          ? nestedStats
          : dashboardPayload;

      setDashboardStats({
        ...statsSource,
        activeOrders: getNumber(
          statsSource,
          ["activeOrders", "totalActiveOrders", "activeOrderCount"],
          0,
        ),
        processingOrders: getNumber(
          statsSource,
          ["processingOrders", "totalProcessingOrders", "processingOrderCount"],
          0,
        ),
        readyOrders: getNumber(
          statsSource,
          ["readyOrders", "totalReadyOrders", "readyOrderCount"],
          0,
        ),
        unpaidOrders: getNumber(
          statsSource,
          ["unpaidOrders", "totalUnpaidOrders", "unpaidOrderCount"],
          0,
        ),
        todayRevenue: getNumber(
          statsSource,
          ["todayRevenue", "revenueToday", "today_revenue"],
          0,
        ),
      });

      setOrders(
        extractArray(ordersResponse.data, [
          "orders",
          "data",
          "results",
          "items",
        ]),
      );

      setServices(
        extractArray(servicesResponse.data, [
          "services",
          "data",
          "results",
          "items",
        ]),
      );

      setError("");
    } catch {
      setError(
        "Dashboard gagal dimuat. Periksa koneksi server, lalu coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      if (!cancelled) {
        void fetchDashboard();
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [fetchDashboard]);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const dateA = new Date(String(getOrderCreatedAt(a) ?? 0)).getTime();
        const dateB = new Date(String(getOrderCreatedAt(b) ?? 0)).getTime();

        return (
          (Number.isNaN(dateB) ? 0 : dateB) -
          (Number.isNaN(dateA) ? 0 : dateA)
        );
      }),
    [orders],
  );

  const computedStats = useMemo(() => {
    const active = orders.filter((order) => {
      const status = getOrderStatus(order);
      return status !== "COMPLETED" && status !== "CANCELLED";
    }).length;

    const processing = orders.filter((order) =>
      ["WASHING", "DRYING", "IRONING"].includes(getOrderStatus(order)),
    ).length;

    const ready = orders.filter(
      (order) => getOrderStatus(order) === "READY",
    ).length;

    const unpaid = orders.filter((order) => {
      const status = getPaymentStatus(order);

      return (
        status !== "PAID" &&
        getOrderStatus(order) !== "CANCELLED"
      );
    }).length;

    return { active, processing, ready, unpaid };
  }, [orders]);

  const summaryCards: SummaryCard[] = [
    {
      title: "Active orders",
      value: dashboardStats?.activeOrders ?? computedStats.active,
      description: "Orders in progress",
      icon: ClipboardList,
      iconClassName: "bg-[#E8EEE0] text-[#65774D]",
    },
    {
      title: "Processing",
      value: dashboardStats?.processingOrders ?? computedStats.processing,
      description: "Being processed",
      icon: WashingMachine,
      iconClassName: "bg-[#E7EDF7] text-[#5474A2]",
    },
    {
      title: "Ready for pickup",
      value: dashboardStats?.readyOrders ?? computedStats.ready,
      description: "Waiting for collection",
      icon: Package,
      iconClassName: "bg-[#F5EBD8] text-[#A47A39]",
    },
    {
      title: "Unpaid orders",
      value: dashboardStats?.unpaidOrders ?? computedStats.unpaid,
      description: "Awaiting payment",
      icon: Wallet,
      iconClassName: "bg-[#F5E4E1] text-[#AC665C]",
    },
  ];

  if (isAdmin) {
    summaryCards.push({
      title: "Today's revenue",
      value: formatCurrency(dashboardStats?.todayRevenue ?? 0),
      description: "Payments recorded today",
      icon: CircleDollarSign,
      iconClassName: "bg-[#E8F2E8] text-[#4D7954]",
    });
  }

  const workflow = useMemo(() => {
    const steps = [
      { key: "RECEIVED", label: "Received", color: "bg-[#A9B89A]" },
      { key: "WASHING", label: "Washing", color: "bg-[#8EA4C4]" },
      { key: "DRYING", label: "Drying", color: "bg-[#D3B16D]" },
      { key: "IRONING", label: "Ironing", color: "bg-[#BA9BCB]" },
      { key: "READY", label: "Ready", color: "bg-[#87AC8A]" },
    ];

    const counts = steps.map((step) => ({
      ...step,
      count: orders.filter(
        (order) => getOrderStatus(order) === step.key,
      ).length,
    }));

    const largestCount = Math.max(1, ...counts.map((step) => step.count));

    return counts.map((step) => ({
      ...step,
      percentage: Math.round((step.count / largestCount) * 100),
    }));
  }, [orders]);

  const bestSellingServices = useMemo(() => {
    const serviceMap = new Map<string, ServiceSummary>();

    services.forEach((service, index) => {
      const serviceId = String(service.id ?? `service-${index}`);

      serviceMap.set(serviceId, {
        id: serviceId,
        name: String(service.name ?? "Unnamed service"),
        unit: getServiceUnit(service),
        quantity: 0,
        transactions: 0,
        revenue: 0,
      });
    });

    orders.forEach((order) => {
      getOrderItems(order).forEach((item) => {
        const serviceId = getItemServiceId(item);
        const serviceName = getItemServiceName(item);

        const matchedService =
          serviceMap.get(serviceId) ?? serviceMap.get(serviceName);

        const serviceRecord = asRecord(item.service);

        const summary =
          matchedService ?? {
            id: serviceId || serviceName,
            name: serviceName,
            unit: getServiceUnit(serviceRecord),
            quantity: 0,
            transactions: 0,
            revenue: 0,
          };

        summary.quantity += getItemQuantity(item);
        summary.transactions += 1;
        summary.revenue += getItemRevenue(item);

        serviceMap.set(summary.id, summary);
      });
    });

    return Array.from(serviceMap.values())
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders, services]);

  const todayLabel = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-28 rounded-full bg-[#E5DED3]" />
          <div className="h-7 w-56 rounded-lg bg-[#E5DED3]" />
          <div className="h-4 w-72 max-w-full rounded-lg bg-[#EAE4DB]" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl border border-[#E7E0D6] bg-white"
            />
          ))}
        </div>

        <div className="h-56 animate-pulse rounded-xl border border-[#E7E0D6] bg-white" />
        <div className="h-72 animate-pulse rounded-xl border border-[#E7E0D6] bg-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[45vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5E4E1] text-[#AC665C]">
          <Activity size={22} />
        </div>

        <h2 className="font-heading text-lg font-semibold text-[#34382D]">
          Something went wrong
        </h2>

        <p className="mt-2 max-w-md text-sm leading-5 text-[#858579]">
          {error}
        </p>

        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void fetchDashboard();
          }}
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-[#788A61] px-3 text-xs font-semibold text-white transition hover:bg-[#64764F]"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#81906C]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#81906C]" />
            Laundrify workspace
          </div>

          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[#34382D]">
            Dashboard overview
          </h1>

          <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-[#858579]">
            Monitor your laundry operations, order progress, and daily activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E5DED3] bg-white px-2.5 text-xs text-[#727568]">
            <CalendarDays size={14} className="text-[#81906C]" />
            <span>{todayLabel}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void fetchDashboard();
            }}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#E5DED3] bg-white px-2.5 text-xs font-medium text-[#53594A] transition hover:bg-[#F4F0E9]"
            aria-label="Refresh dashboard"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </section>

      <section
        className={`grid gap-3 sm:grid-cols-2 ${
          isAdmin ? "xl:grid-cols-3 2xl:grid-cols-5" : "xl:grid-cols-4"
        }`}
      >
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.title}
              className="group min-w-0 rounded-xl border border-[#E7E0D6] bg-white p-3.5 shadow-[0_1px_5px_rgba(52,56,45,0.025)] transition-colors hover:border-[#D7DCCF] sm:p-4"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#777B70]">
                    {card.title}
                  </p>

                  <p className="mt-2 break-words font-heading text-2xl font-semibold leading-tight tracking-tight text-[#34382D]">
                    {card.value}
                  </p>
                </div>

                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.iconClassName}`}
                >
                  <Icon size={17} strokeWidth={1.8} />
                </div>
              </div>

              <p className="mt-2.5 text-[11px] leading-4 text-[#94968C]">
                {card.description}
              </p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <article className="min-w-0 rounded-xl border border-[#E7E0D6] bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8EEE0] text-[#65774D]">
                  <Activity size={16} />
                </div>

                <h2 className="font-heading text-sm font-semibold text-[#34382D]">
                  Order workflow
                </h2>
              </div>

              <p className="mt-1.5 text-xs text-[#858579]">
                Order count by processing stage.
              </p>
            </div>

            <Link
              to="/orders"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#758760] transition hover:text-[#536541]"
            >
              All orders
              <ArrowUpRight size={13} />
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            {workflow.map((step) => (
              <div key={step.key}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-[#55594E]">
                    {step.label}
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-[#34382D]">
                    {step.count}
                  </span>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-[#F0EDE7]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${step.color}`}
                    style={{ width: `${step.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-1.5 border-t border-[#EEE9E1] pt-3 text-[10px] leading-4 text-[#858579]">
            <CheckCircle2 size={13} className="shrink-0 text-[#81906C]" />
            Completed and cancelled orders are excluded.
          </div>
        </article>

        <article className="min-w-0 rounded-xl border border-[#E7E0D6] bg-white p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5EBD8] text-[#A47A39]">
              <Clock3 size={16} />
            </div>

            <h2 className="font-heading text-sm font-semibold text-[#34382D]">
              Quick actions
            </h2>
          </div>

          <p className="mt-1.5 text-xs leading-5 text-[#858579]">
            Shortcuts to common tasks.
          </p>

          <div className="mt-4 space-y-2.5">
            <Link
              to="/orders/create"
              className="group flex items-center gap-2.5 rounded-lg border border-[#E7E0D6] p-2.5 transition hover:border-[#C9D2BD] hover:bg-[#FAFBF8]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E8EEE0] text-[#65774D]">
                <Plus size={16} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#34382D]">
                  Create new order
                </p>
                <p className="mt-0.5 text-[10px] text-[#858579]">
                  Register a laundry order
                </p>
              </div>

              <ArrowRight
                size={14}
                className="shrink-0 text-[#A1A394] transition group-hover:translate-x-0.5 group-hover:text-[#65774D]"
              />
            </Link>

            <Link
              to="/pickup-delivery"
              className="group flex items-center gap-2.5 rounded-lg border border-[#E7E0D6] p-2.5 transition hover:border-[#C9D2BD] hover:bg-[#FAFBF8]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E7EDF7] text-[#5474A2]">
                <Truck size={16} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#34382D]">
                  Pickup & delivery
                </p>
                <p className="mt-0.5 text-[10px] text-[#858579]">
                  Review customer requests
                </p>
              </div>

              <ArrowRight
                size={14}
                className="shrink-0 text-[#A1A394] transition group-hover:translate-x-0.5 group-hover:text-[#65774D]"
              />
            </Link>

            <Link
              to="/customers"
              className="group flex items-center gap-2.5 rounded-lg border border-[#E7E0D6] p-2.5 transition hover:border-[#C9D2BD] hover:bg-[#FAFBF8]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F2E8F4] text-[#8A6C91]">
                <Shirt size={16} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#34382D]">
                  Manage customers
                </p>
                <p className="mt-0.5 text-[10px] text-[#858579]">
                  View registered customers
                </p>
              </div>

              <ArrowRight
                size={14}
                className="shrink-0 text-[#A1A394] transition group-hover:translate-x-0.5 group-hover:text-[#65774D]"
              />
            </Link>
          </div>
        </article>
      </section>

      <section className="grid min-w-0 gap-4 2xl:grid-cols-[1.4fr_1fr]">
        <article className="min-w-0 overflow-hidden rounded-xl border border-[#E7E0D6] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEE9E1] px-4 py-3.5">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardList size={16} className="text-[#81906C]" />
                <h2 className="font-heading text-sm font-semibold text-[#34382D]">
                  Recent orders
                </h2>
              </div>

              <p className="mt-1 text-[11px] text-[#858579]">
                Latest orders recorded in the system.
              </p>
            </div>

            <Link
              to="/orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#758760] transition hover:text-[#536541]"
            >
              View all
              <ArrowRight size={13} />
            </Link>
          </div>

          {sortedOrders.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center px-4 py-8 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F4F0E9] text-[#969889]">
                <ClipboardList size={18} />
              </div>

              <p className="mt-2.5 text-xs font-semibold text-[#53594A]">
                No orders yet
              </p>

              <p className="mt-1 text-[11px] text-[#858579]">
                New orders will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="bg-[#FAF9F6]">
                    <th className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579] sm:px-4">
                      Order
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579]">
                      Customer
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579]">
                      Status
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579]">
                      Payment
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579]">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sortedOrders.slice(0, 6).map((order, index) => {
                    const status = getOrderStatus(order);
                    const paymentStatus = getPaymentStatus(order);
                    const orderId = String(order.id ?? "");

                    const statusClasses: Record<string, string> = {
                      RECEIVED: "bg-[#F1EEE6] text-[#81765A]",
                      WASHING: "bg-[#E7EDF7] text-[#5474A2]",
                      DRYING: "bg-[#F5EBD8] text-[#A47A39]",
                      IRONING: "bg-[#F2E8F4] text-[#8A6C91]",
                      READY: "bg-[#E8F2E8] text-[#4D7954]",
                      COMPLETED: "bg-[#E8F2E8] text-[#4D7954]",
                      CANCELLED: "bg-[#F5E4E1] text-[#AC665C]",
                    };

                    const paymentClasses: Record<string, string> = {
                      PAID: "bg-[#E8F2E8] text-[#4D7954]",
                      UNPAID: "bg-[#F5EBD8] text-[#A47A39]",
                      PARTIALLY_PAID: "bg-[#E7EDF7] text-[#5474A2]",
                      FAILED: "bg-[#F5E4E1] text-[#AC665C]",
                    };

                    return (
                      <tr
                        key={orderId || getOrderCode(order) || index}
                        className="border-t border-[#F0ECE5] transition hover:bg-[#FCFBF8]"
                      >
                        <td className="px-3 py-3 sm:px-4">
                          <Link
                            to={`/order/${orderId}`}
                            className="text-xs font-semibold text-[#454B3A] transition hover:text-[#788A61]"
                          >
                            {getOrderCode(order)}
                          </Link>

                          <p className="mt-0.5 whitespace-nowrap text-[10px] text-[#96968C]">
                            {formatDateTime(getOrderCreatedAt(order))}
                          </p>
                        </td>

                        <td className="px-3 py-3">
                          <span className="block max-w-[130px] truncate text-xs font-medium text-[#53594A]">
                            {getCustomerName(order)}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-medium ${
                              statusClasses[status] ??
                              "bg-[#F1EEE6] text-[#81765A]"
                            }`}
                          >
                            {orderStatusLabels[status] ?? status ?? "-"}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-medium ${
                              paymentClasses[paymentStatus] ??
                              "bg-[#F1EEE6] text-[#81765A]"
                            }`}
                          >
                            {paymentStatusLabels[paymentStatus] ??
                              paymentStatus ??
                              "-"}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-semibold tabular-nums text-[#34382D]">
                          {formatCurrency(getOrderTotal(order))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {sortedOrders.length > 0 && (
            <div className="border-t border-[#EEE9E1] px-4 py-2.5 text-[10px] text-[#96968C]">
              Showing {Math.min(sortedOrders.length, 6)} of {sortedOrders.length}{" "}
              loaded orders
            </div>
          )}
        </article>

        <article className="min-w-0 overflow-hidden rounded-xl border border-[#E7E0D6] bg-white">
          <div className="border-b border-[#EEE9E1] px-4 py-3.5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8EEE0] text-[#65774D]">
                <Shirt size={16} />
              </div>

              <h2 className="font-heading text-sm font-semibold text-[#34382D]">
                Best-selling services
              </h2>
            </div>

            <p className="mt-1.5 text-[11px] text-[#858579]">
              Ranked by quantity in loaded orders.
            </p>
          </div>

          {bestSellingServices.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center px-4 py-8 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F4F0E9] text-[#969889]">
                <Shirt size={18} />
              </div>

              <p className="mt-2.5 text-xs font-semibold text-[#53594A]">
                No service data yet
              </p>

              <p className="mt-1 text-[11px] leading-4 text-[#858579]">
                Service statistics will appear when order items are available.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0ECE5]">
              {bestSellingServices.map((service, index) => (
                <div
                  key={service.id}
                  className="flex items-center gap-2.5 px-3.5 py-3 sm:px-4"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F4F0E9] font-heading text-xs font-semibold text-[#758760]">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[#454B3A]">
                      {service.name}
                    </p>

                    <p className="mt-0.5 text-[10px] text-[#96968C]">
                      {service.quantity} units · {service.transactions} order{" "}
                      {service.transactions === 1 ? "line" : "lines"}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold tabular-nums text-[#34382D]">
                      {formatCurrency(service.revenue)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#96968C]">
                      {service.unit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-[#EEE9E1] px-4 py-3">
            <Link
              to="/services"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#758760] transition hover:text-[#536541]"
            >
              Manage services
              <ArrowRight size={13} />
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
};

export default DashboardPage;
