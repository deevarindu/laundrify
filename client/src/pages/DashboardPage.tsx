import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Plus,
  RefreshCw,
  Shirt,
  Truck,
  UsersRound,
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
    .replace(/[\s-]+/g, "_");

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
    PROCESSING: "PROCESSING",
    IN_PROGRESS: "PROCESSING",
    SEDANG_DIPROSES: "PROCESSING",
  };

  return aliases[status] ?? status;
};

const getOrderStatus = (order: DataRecord): string =>
  normalizeOrderStatus(
    order.status ??
      order.orderStatus ??
      order.order_status,
  );

const normalizePaymentStatus = (value: unknown): string => {
  const status = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const aliases: Record<string, string> = {
    PAID: "PAID",
    LUNAS: "PAID",
    SUDAH_DIBAYAR: "PAID",
    SUCCESS: "PAID",
    SETTLED: "PAID",
    UNPAID: "UNPAID",
    NOT_PAID: "UNPAID",
    BELUM_BAYAR: "UNPAID",
    BELUM_DIBAYAR: "UNPAID",
    BELUM_LUNAS: "UNPAID",
    MENUNGGU_PEMBAYARAN: "UNPAID",
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
    order.paymentStatus ??
      order.payment_status ??
      payment.status,
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
  PROCESSING: "Processing",
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
      ["PROCESSING", "WASHING", "DRYING", "IRONING"].includes(
        getOrderStatus(order),
      ),
    ).length;

    const ready = orders.filter(
      (order) => getOrderStatus(order) === "READY",
    ).length;

    const unpaid = orders.filter((order) => {
      const paymentStatus = getPaymentStatus(order);
      const orderStatus = getOrderStatus(order);

      return (
        ["UNPAID", "PARTIALLY_PAID", "FAILED"].includes(paymentStatus) &&
        orderStatus !== "CANCELLED"
      );
    }).length;

    return { active, processing, ready, unpaid };
  }, [orders]);

  const summaryCards: SummaryCard[] = [
    {
      title: "Active orders",
      value: computedStats.active,
      description: "Orders in progress",
    },
    {
      title: "Processing",
      value: computedStats.processing,
      description: "Being processed",
    },
    {
      title: "Ready for pickup",
      value: computedStats.ready,
      description: "Waiting for collection",
    },
    {
      title: "Unpaid orders",
      value: computedStats.unpaid,
      description: "Awaiting payment",
    },
  ];

  if (isAdmin) {
    summaryCards.push({
      title: "Today's revenue",
      value: formatCurrency(dashboardStats?.todayRevenue ?? 0),
      description: "Payments recorded today",
    });
  }

  const workflow = useMemo(() => {
    const steps = [
      { key: "RECEIVED", label: "Received" },
      { key: "WASHING", label: "Washing" },
      { key: "DRYING", label: "Drying" },
      { key: "IRONING", label: "Ironing" },
      { key: "READY", label: "Ready" },
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
    <div className="space-y-6 pb-8">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#81906C]">
            Laundrify / Workspace
          </p>

          <h1 className="font-heading text-3xl font-medium tracking-[-1.5px] text-[#34382D] sm:text-[38px]">
            {isAdmin ? "Good morning, Admin." : "Good morning."}
          </h1>

          <p className="mt-2 max-w-lg text-sm leading-6 text-[#858579]">
            Here's what's happening with your laundry operations today.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex h-10 items-center gap-2 rounded-lg border border-[#E5DED3] bg-[#FBF9F5] px-3">
            <CalendarDays size={15} className="text-[#81906C]" />
            <span className="text-xs font-medium text-[#53594A]">
              {todayLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void fetchDashboard();
            }}
            aria-label="Refresh dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5DED3] bg-[#FBF9F5] text-[#53594A] transition hover:border-[#C9D2BD] hover:bg-white"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-2xl bg-[#34382D] p-5 text-[#FBF9F5] sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full border border-white/[0.08] sm:-right-10 sm:size-80" />
        <div className="pointer-events-none absolute -right-5 -top-12 size-48 rounded-full border border-white/[0.08] sm:size-64" />

        <div className="relative z-10 flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
          <div className="max-w-lg">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#BBC7A9]">
              {isAdmin ? "Business at a glance" : "Daily operations"}
            </p>

            <h2 className="mt-4 max-w-md font-heading text-2xl font-medium leading-tight tracking-[-0.8px] sm:text-[30px]">
              {isAdmin
                ? "Every order, taken care of."
                : "A smoother day starts here."}
            </h2>

            <p className="mt-3 max-w-sm text-sm leading-6 text-white/60">
              {isAdmin
                ? "Keep track of orders, payments, and the services that keep your business moving."
                : "Stay on top of laundry progress and keep every order moving forward."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/orders/create"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#DCE4CF] px-4 text-xs font-semibold text-[#34382D] transition hover:bg-white"
            >
              <Plus size={15} />
              New order
            </Link>

            <Link
              to="/orders"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/20 px-4 text-xs font-medium text-white transition hover:bg-white/[0.08]"
            >
              View orders
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        {isAdmin && (
          <div className="relative z-10 mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/15 pt-4 text-xs text-white/60">
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[#B8C9A2]" />
              Admin overview
            </span>
            <span>Operations and revenue</span>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-semibold tracking-tight text-[#34382D]">
              Operational overview
            </h2>
            <p className="mt-1 text-xs text-[#858579]">
              A snapshot of your current workload.
            </p>
          </div>

          <span className="hidden text-[10px] uppercase tracking-[0.14em] text-[#96968C] sm:block">
            Live totals
          </span>
        </div>

        <div
          className={`grid gap-3 sm:grid-cols-2 ${
            isAdmin ? "xl:grid-cols-5" : "xl:grid-cols-4"
          }`}
        >
          {summaryCards.map((card, index) => {
            const isRevenue = card.title === "Today's revenue";

            return (
              <article
                key={card.title}
                className={`relative min-w-0 overflow-hidden rounded-xl border p-4 transition-colors hover:border-[#D2D8C8] ${
                  isRevenue
                    ? "border-[#D6DECB] bg-[#E9EEDF]"
                    : "border-[#E7E0D6] bg-[#FBF9F5]"
                }`}
              >
                <p className="text-xs font-medium text-[#777B70]">
                  {card.title}
                </p>

                <p
                  className={`mt-5 break-words font-heading text-[27px] font-medium leading-tight tracking-[-1px] tabular-nums ${
                    isRevenue ? "text-[#536541]" : "text-[#34382D]"
                  }`}
                >
                  {card.value}
                </p>

                <div className="mt-4 flex items-center gap-2 border-t border-[#34382D]/[0.08] pt-3">
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${
                      index === 0 || isRevenue
                        ? "bg-[#81906C]"
                        : "bg-[#C7C6B9]"
                    }`}
                  />
                  <p className="text-[11px] leading-4 text-[#858579]">
                    {card.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <article className="min-w-0 rounded-xl border border-[#E7E0D6] bg-[#FBF9F5] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#81906C]">
                Production
              </p>

              <h2 className="mt-2 font-heading text-lg font-semibold tracking-tight text-[#34382D]">
                Order workflow
              </h2>

              <p className="mt-1 text-xs leading-5 text-[#858579]">
                Where your orders are in the process.
              </p>
            </div>

            <Link
              to="/orders"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#758760] transition hover:text-[#536541]"
            >
              All orders
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="mt-7 grid grid-cols-5 gap-2">
            {workflow.map((step, index) => {
              const stageColors = [
                "#A9B89A",
                "#8EA4C4",
                "#D3B16D",
                "#BA9BCB",
                "#87AC8A",
              ];

              const stageColor = stageColors[index] ?? "#A9B89A";

              return (
                <div key={step.key} className="min-w-0">
                  <div className="mb-3 flex h-9 items-end">
                    <span className="font-heading text-xl font-medium tabular-nums tracking-tight text-[#34382D] sm:text-2xl">
                      {step.count}
                    </span>
                  </div>

                  <div className="h-1.5 overflow-hidden rounded-full bg-[#EDE9E1]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${step.percentage}%`,
                        backgroundColor: stageColor,
                      }}
                    />
                  </div>

                  <p className="mt-2.5 break-words text-[10px] leading-4 text-[#777B70] sm:text-xs">
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-7 flex items-start gap-2 border-t border-[#EAE4DB] pt-4">
            <CheckCircle2
              size={14}
              className="mt-0.5 shrink-0 text-[#81906C]"
            />
            <p className="text-[11px] leading-5 text-[#858579]">
              Counts represent orders currently in each stage. Completed and
              cancelled orders are excluded.
            </p>
          </div>
        </article>

        <article className="min-w-0 rounded-xl border border-[#E7E0D6] bg-[#FBF9F5] p-5 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#81906C]">
            Shortcuts
          </p>

          <h2 className="mt-2 font-heading text-lg font-semibold tracking-tight text-[#34382D]">
            Get things done
          </h2>

          <p className="mt-1 text-xs leading-5 text-[#858579]">
            Jump straight into your everyday tasks.
          </p>

          <div className="mt-5 divide-y divide-[#EAE4DB]">
            <Link
              to="/orders/create"
              className="group flex items-center gap-3 py-3.5 first:pt-0"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#E8EEE0] text-[#65774D]">
                <Plus size={17} strokeWidth={1.8} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#454B3A] transition group-hover:text-[#758760]">
                  Create an order
                </p>
                <p className="mt-1 text-[11px] text-[#858579]">
                  Register a new laundry order
                </p>
              </div>

              <ArrowRight
                size={15}
                className="shrink-0 text-[#AAA99D] transition group-hover:translate-x-1 group-hover:text-[#758760]"
              />
            </Link>

            <Link
              to="/pickup-delivery"
              className="group flex items-center gap-3 py-3.5"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#E8EEE0] text-[#65774D]">
                <Truck size={16} strokeWidth={1.8} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#454B3A] transition group-hover:text-[#758760]">
                  Pickup & delivery
                </p>
                <p className="mt-1 text-[11px] text-[#858579]">
                  Review customer requests
                </p>
              </div>

              <ArrowRight
                size={15}
                className="shrink-0 text-[#AAA99D] transition group-hover:translate-x-1 group-hover:text-[#758760]"
              />
            </Link>

            <Link
              to="/customers"
              className="group flex items-center gap-3 py-3.5 last:pb-0"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#E8EEE0] text-[#65774D]">
                <UsersRound size={16} strokeWidth={1.8} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#454B3A] transition group-hover:text-[#758760]">
                  Manage customers
                </p>
                <p className="mt-1 text-[11px] text-[#858579]">
                  Browse your customer records
                </p>
              </div>

              <ArrowRight
                size={15}
                className="shrink-0 text-[#AAA99D] transition group-hover:translate-x-1 group-hover:text-[#758760]"
              />
            </Link>
          </div>
        </article>
      </section>

      <section className="grid min-w-0 gap-4 2xl:grid-cols-[1.35fr_0.85fr]">
        <article className="min-w-0 overflow-hidden rounded-xl border border-[#E7E0D6] bg-[#FBF9F5]">
          <div className="flex flex-wrap items-end justify-between gap-3 px-5 py-5 sm:px-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#81906C]">
                Latest activity
              </p>

              <h2 className="mt-2 font-heading text-lg font-semibold tracking-tight text-[#34382D]">
                Recent orders
              </h2>

              <p className="mt-1 text-xs leading-5 text-[#858579]">
                The latest orders recorded in your workspace.
              </p>
            </div>

            <Link
              to="/orders"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#758760] transition hover:text-[#536541]"
            >
              View all orders
              <ArrowRight size={14} />
            </Link>
          </div>

          {sortedOrders.length === 0 ? (
            <div className="flex min-h-44 flex-col items-center justify-center border-t border-[#EAE4DB] px-5 py-10 text-center">
              <ClipboardList
                size={22}
                strokeWidth={1.5}
                className="text-[#A4A697]"
              />
              <p className="mt-3 text-sm font-medium text-[#53594A]">
                No orders yet
              </p>
              <p className="mt-1 text-xs text-[#858579]">
                New orders will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border-t border-[#EAE4DB]">
              <table className="w-full min-w-[650px] border-collapse text-left">
                <thead>
                  <tr className="bg-[#F4F1EA]">
                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#858579] sm:px-5">
                      Order
                    </th>
                    <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#858579]">
                      Customer
                    </th>
                    <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#858579]">
                      Status
                    </th>
                    <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#858579]">
                      Payment
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-[#858579]">
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
                      RECEIVED: "bg-[#F5E8D5] text-[#9A713D]",
                      WASHING: "bg-[#E5EDF5] text-[#557797]",
                      DRYING: "bg-[#F8EBD5] text-[#A17C3D]",
                      IRONING: "bg-[#EEE7F5] text-[#80649F]",
                      READY: "bg-[#E8F2E8] text-[#4D7954]",
                      COMPLETED: "bg-[#E4E9DA] text-[#697851]",
                      CANCELLED: "bg-[#F5E5E2] text-[#A65F55]",
                      PROCESSING: "bg-[#E5EDF5] text-[#557797]",
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
                        className={`border-t border-[#EEE9E1] transition-colors ${
                          status === "COMPLETED"
                            ? "bg-[#F0F3E9] hover:bg-[#E9EEDF]"
                            : status === "CANCELLED"
                              ? "bg-[#FCF3F1] hover:bg-[#F9EAE7]"
                              : "hover:bg-white"
                        }`}
                      >
                        <td className="px-4 py-3.5 sm:px-5">
                          <Link
                            to={`/order/${orderId}`}
                            className="text-xs font-semibold text-[#454B3A] transition hover:text-[#758760]"
                          >
                            {getOrderCode(order)}
                          </Link>

                          <p className="mt-1 whitespace-nowrap text-[10px] text-[#96968C]">
                            {formatDateTime(getOrderCreatedAt(order))}
                          </p>
                        </td>

                        <td className="px-3 py-3.5">
                          <span className="block max-w-[130px] truncate text-xs font-medium text-[#53594A]">
                            {getCustomerName(order)}
                          </span>
                        </td>

                        <td className="px-3 py-3.5">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-medium ${
                              statusClasses[status] ??
                              "bg-[#F1EEE6] text-[#81765A]"
                            }`}
                          >
                            {orderStatusLabels[status] ?? status ?? "-"}
                          </span>
                        </td>

                        <td className="px-3 py-3.5">
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

                        <td className="whitespace-nowrap px-5 py-3.5 text-right text-xs font-semibold tabular-nums text-[#34382D]">
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
            <div className="border-t border-[#EAE4DB] px-5 py-3 text-[10px] text-[#96968C]">
              Showing {Math.min(sortedOrders.length, 6)} of{" "}
              {sortedOrders.length} loaded orders
            </div>
          )}
        </article>

        <article className="min-w-0 overflow-hidden rounded-xl border border-[#E7E0D6] bg-[#FBF9F5]">
          <div className="px-5 py-5 sm:px-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#81906C]">
              Service performance
            </p>

            <h2 className="mt-2 font-heading text-lg font-semibold tracking-tight text-[#34382D]">
              Best-selling services
            </h2>

            <p className="mt-1 text-xs leading-5 text-[#858579]">
              Ranked by quantity in loaded orders.
            </p>
          </div>

          {bestSellingServices.length === 0 ? (
            <div className="flex min-h-44 flex-col items-center justify-center border-t border-[#EAE4DB] px-5 py-10 text-center">
              <Shirt
                size={22}
                strokeWidth={1.5}
                className="text-[#A4A697]"
              />
              <p className="mt-3 text-sm font-medium text-[#53594A]">
                No service data yet
              </p>
              <p className="mt-1 max-w-[220px] text-xs leading-5 text-[#858579]">
                Service statistics will appear when order items are available.
              </p>
            </div>
          ) : (
            <div className="border-t border-[#EAE4DB]">
              {bestSellingServices.map((service, index) => {
                const maxQuantity = Math.max(
                  1,
                  ...bestSellingServices.map((item) => item.quantity),
                );

                const percentage = Math.min(
                  100,
                  (service.quantity / maxQuantity) * 100,
                );

                return (
                  <div
                    key={service.id}
                    className="border-b border-[#EEE9E1] px-5 py-4 last:border-b-0 sm:px-6"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="pt-0.5 font-heading text-xs font-medium tabular-nums text-[#9A9D8D]">
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-[#454B3A]">
                            {service.name}
                          </p>
                          <p className="mt-1 text-[10px] text-[#858579]">
                            {service.quantity} units · {service.transactions}{" "}
                            {service.transactions === 1
                              ? "order line"
                              : "order lines"}
                          </p>
                        </div>
                      </div>

                      <p className="shrink-0 text-xs font-semibold tabular-nums text-[#34382D]">
                        {formatCurrency(service.revenue)}
                      </p>
                    </div>

                    <div className="ml-7 mt-3 h-1 overflow-hidden rounded-full bg-[#EDE9E1]">
                      <div
                        className="h-full rounded-full bg-[#9EAD88] transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-[#EAE4DB] px-5 py-4 sm:px-6">
            <Link
              to="/services"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#758760] transition hover:text-[#536541]"
            >
              Manage services
              <ArrowRight size={14} />
            </Link>
          </div>
        </article>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E5DED3] pt-4 text-[10px] text-[#96968C]">
        <span>Laundrify workspace</span>
        <span>Care in every detail.</span>
      </footer>
    </div>
  );
};

export default DashboardPage;