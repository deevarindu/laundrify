import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Plus,
  Search,
  ArrowUpDown,
} from "lucide-react";
import api from "@/lib/api";

type UnknownRecord = Record<string, unknown>;

type Order = {
  id: string;
  orderCode?: string | null;
  code?: string | null;
  invoiceNumber?: string | null;
  customerId?: string | null;
  customer?: {
    id?: string;
    name?: string | null;
    fullName?: string | null;
    phone?: string | null;
  } | null;
  customerName?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  orderDate?: string | null;
  status?: unknown;
  orderStatus?: unknown;
  order_status?: unknown;
  paymentStatus?: unknown;
  payment_status?: unknown;
  payment?: unknown;
  total?: number | string | null;
  grandTotal?: number | string | null;
  amount?: number | string | null;
  subtotal?: number;
  discount?: number;
  dueAt?: string | null;
  items?: {
    id?: string;
    quantity?: number;
    service?: {
      name?: string;
    } | null;
  }[];
};

type Customer = {
  id: string;
  name: string;
  phone?: string | null;
};

type SortKey = "newest" | "oldest" | "highest" | "lowest";

const PAGE_SIZE = 8;

const statusLabels: Record<string, string> = {
  RECEIVED: "Received",
  PESANAN_DITERIMA: "Received",
  DITERIMA: "Received",
  ORDER_RECEIVED: "Received",
  WASHING: "Washing",
  DICUCI: "Washing",
  DRYING: "Drying",
  DIKERINGKAN: "Drying",
  IRONING: "Ironing",
  DISETRIKA: "Ironing",
  READY: "Ready",
  SIAP_DIAMBIL: "Ready",
  READY_FOR_PICKUP: "Ready",
  COMPLETED: "Completed",
  SELESAI: "Completed",
  CANCELLED: "Cancelled",
  CANCELED: "Cancelled",
  DIBATALKAN: "Cancelled",
  PROCESSING: "Processing",
  IN_PROGRESS: "Processing",
  SEDANG_DIPROSES: "Processing",
};

const paymentLabels: Record<string, string> = {
  PAID: "Paid",
  LUNAS: "Paid",
  SUDAH_DIBAYAR: "Paid",
  SUCCESS: "Paid",
  SETTLED: "Paid",
  UNPAID: "Unpaid",
  NOT_PAID: "Unpaid",
  BELUM_BAYAR: "Unpaid",
  BELUM_DIBAYAR: "Unpaid",
  BELUM_LUNAS: "Unpaid",
  MENUNGGU_PEMBAYARAN: "Unpaid",
  PENDING: "Pending",
  PARTIALLY_PAID: "Partially paid",
  FAILED: "Failed",
  EXPIRED: "Expired",
};

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }

    if (isRecord(value)) {
      const nested = readString(
        value.status,
        value.orderStatus,
        value.paymentStatus,
        value.value,
        value.name,
        value.label,
        value.code,
      );

      if (nested) return nested;
    }
  }

  return "";
};

const extractArray = <T,>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];

  if (!isRecord(data)) return [];

  for (const key of ["data", "orders", "customers", "results", "items"]) {
    const result = data[key];

    if (Array.isArray(result)) return result as T[];

    if (isRecord(result)) {
      for (const nestedKey of ["data", "orders", "customers", "results", "items"]) {
        if (Array.isArray(result[nestedKey])) {
          return result[nestedKey] as T[];
        }
      }
    }
  }

  return [];
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const getOrderCode = (order: Order) =>
  readString(order.orderCode, order.code, order.invoiceNumber, order.id) || "-";

const getOrderDate = (order: Order) =>
  readString(order.createdAt, order.created_at, order.orderDate);

const getOrderTotal = (order: Order) => {
  const total = Number(order.total ?? order.grandTotal ?? order.amount ?? 0);
  return Number.isFinite(total) ? total : 0;
};

const normalizeKey = (value: unknown) =>
  readString(value)
    .normalize("NFKC")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

const getOrderStatus = (order: Order) =>
  normalizeKey(order.status ?? order.orderStatus ?? order.order_status);

const normalizeStatus = (status: unknown) => {
  const value = normalizeKey(status);

  const aliases: Record<string, string> = {
    RECEIVED: "RECEIVED",
    PESANAN_DITERIMA: "RECEIVED",
    DITERIMA: "RECEIVED",
    ORDER_RECEIVED: "RECEIVED",
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

  return aliases[value] ?? value;
};

const getOrderPaymentStatus = (order: Order) => {
  const payment = isRecord(order.payment) ? order.payment : {};

  return normalizeKey(
    order.paymentStatus ??
      order.payment_status ??
      payment.status ??
      payment.paymentStatus,
  );
};

const normalizePaymentStatus = (status: unknown) => {
  const value = normalizeKey(status);

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
    PENDING: "PENDING",
    PARTIALLY_PAID: "PARTIALLY_PAID",
    FAILED: "FAILED",
    EXPIRED: "EXPIRED",
  };

  return aliases[value] ?? value;
};

const getStatusLabel = (status: unknown) => {
  const value = normalizeStatus(status);

  return (
    statusLabels[value] ??
    (value
      ? value
          .replaceAll("_", " ")
          .toLowerCase()
          .replace(/^\w/, (character) => character.toUpperCase())
      : "Unknown")
  );
};

const getPaymentLabel = (status: unknown) => {
  const value = normalizePaymentStatus(status);

  return (
    paymentLabels[value] ??
    (value
      ? value
          .replaceAll("_", " ")
          .toLowerCase()
          .replace(/^\w/, (character) => character.toUpperCase())
      : "Unknown")
  );
};

const getStatusStyle = (status: unknown) => {
  const styles: Record<string, string> = {
    RECEIVED: "bg-[#F5E8D5] text-[#9A713D]",
    WASHING: "bg-[#E5EDF5] text-[#557797]",
    DRYING: "bg-[#F8EBD5] text-[#A17C3D]",
    IRONING: "bg-[#EEE7F5] text-[#80649F]",
    READY: "bg-[#E8F2E8] text-[#4D7954]",
    COMPLETED: "bg-[#E4E9DA] text-[#697851]",
    CANCELLED: "bg-[#F5E5E2] text-[#A65F55]",
    PROCESSING: "bg-[#E5EDF5] text-[#557797]",
  };

  return (
    styles[normalizeStatus(status)] ??
    "bg-[#F1EEE6] text-[#81765A]"
  );
};

const getPaymentStyle = (status: unknown) => {
  const styles: Record<string, string> = {
    PAID: "bg-[#E8F2E8] text-[#4D7954]",
    UNPAID: "bg-[#F5EBD8] text-[#A47A39]",
    PENDING: "bg-[#F5EBD8] text-[#A47A39]",
    PARTIALLY_PAID: "bg-[#E7EDF7] text-[#5474A2]",
    FAILED: "bg-[#F5E4E1] text-[#AC665C]",
    EXPIRED: "bg-[#F5E4E1] text-[#AC665C]",
  };

  return (
    styles[normalizePaymentStatus(status)] ??
    "bg-[#F1EEE6] text-[#81765A]"
  );
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [ordersResponse, customersResponse] = await Promise.all([
          api.get("/order"),
          api.get("/customer"),
        ]);

        if (!active) return;

        setOrders(extractArray<Order>(ordersResponse.data));
        setCustomers(extractArray<Customer>(customersResponse.data));
      } catch (error) {
        console.error("Failed to load orders:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  const customerMap = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );

  const getCustomer = (order: Order) => {
    if (order.customer) return order.customer;

    return order.customerId
      ? customerMap.get(order.customerId) ?? null
      : null;
  };

  const getCustomerName = (order: Order) =>
    readString(
      getCustomer(order)?.name,
      getCustomer(order)?.phone,
      order.customerName,
    ) || "-";

  const getCustomerPhone = (order: Order) =>
    readString(getCustomer(order)?.phone);

  const summary = useMemo(() => {
    const total = orders.length;

    const completed = orders.filter(
      (order) => normalizeStatus(getOrderStatus(order)) === "COMPLETED",
    ).length;

    const cancelled = orders.filter(
      (order) => normalizeStatus(getOrderStatus(order)) === "CANCELLED",
    ).length;

    const active = total - completed - cancelled;

    const processing = orders.filter((order) =>
      ["WASHING", "DRYING", "IRONING"].includes(
        normalizeStatus(getOrderStatus(order)),
      ),
    ).length;

    const ready = orders.filter(
      (order) => normalizeStatus(getOrderStatus(order)) === "READY",
    ).length;

    const unpaid = orders.filter(
      (order) =>
        ["UNPAID", "PARTIALLY_PAID", "FAILED"].includes(
          normalizePaymentStatus(getOrderPaymentStatus(order)),
        ) &&
        normalizeStatus(getOrderStatus(order)) !== "CANCELLED",
    ).length;

    return { total, active, processing, ready, unpaid };
  }, [orders]);

  const summaryCards = [
    {
      title: "Total orders",
      value: summary.total,
      description: "Orders recorded",
      tone: "default",
    },
    {
      title: "Active orders",
      value: summary.active,
      description: "Currently in progress",
      tone: "default",
    },
    {
      title: "Processing",
      value: summary.processing,
      description: "Being processed",
      tone: "default",
    },
    {
      title: "Ready for pickup",
      value: summary.ready,
      description: "Waiting for pickup",
      tone: "sage",
    },
    {
      title: "Unpaid orders",
      value: summary.unpaid,
      description: "Payment outstanding",
      tone: "rose",
    },
  ];

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const result = orders.filter((order) => {
      const customerName = getCustomerName(order).toLowerCase();
      const customerPhone = getCustomerPhone(order).toLowerCase();
      const orderCode = getOrderCode(order).toLowerCase();

      const matchesSearch =
        !keyword ||
        orderCode.includes(keyword) ||
        customerName.includes(keyword) ||
        customerPhone.includes(keyword);

      const normalizedStatus = normalizeStatus(getOrderStatus(order));
      const normalizedPayment = normalizePaymentStatus(
        getOrderPaymentStatus(order),
      );

      const matchesStatus =
        statusFilter === "ALL" || normalizedStatus === statusFilter;

      const matchesPayment =
        paymentFilter === "ALL" || normalizedPayment === paymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });

    result.sort((a, b) => {
      const dateA = new Date(getOrderDate(a)).getTime() || 0;
      const dateB = new Date(getOrderDate(b)).getTime() || 0;

      if (sortKey === "newest") return dateB - dateA;
      if (sortKey === "oldest") return dateA - dateB;
      if (sortKey === "highest") return getOrderTotal(b) - getOrderTotal(a);
      if (sortKey === "lowest") return getOrderTotal(a) - getOrderTotal(b);

      return 0;
    });

    return result;
  }, [orders, customers, search, statusFilter, paymentFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedOrders = filteredOrders.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE,
  );

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (safeCurrentPage <= 3) {
      return [1, 2, 3, "...", totalPages] as const;
    }

    if (safeCurrentPage >= totalPages - 2) {
      return [1, "...", totalPages - 2, totalPages - 1, totalPages] as const;
    }

    return [
      1,
      "...",
      safeCurrentPage - 1,
      safeCurrentPage,
      safeCurrentPage + 1,
      "...",
      totalPages,
    ] as const;
  }, [safeCurrentPage, totalPages]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handlePaymentChange = (value: string) => {
    setPaymentFilter(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: SortKey) => {
    setSortKey(value);
    setCurrentPage(1);
  };

  const controlClass =
    "h-10 rounded-lg border border-[#E5DED3] bg-[#FBF9F5] px-3 text-xs text-[#53594A] outline-none transition-colors focus:border-[#81906C]";

  return (
    <div className="space-y-6 pb-8">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#81906C]">
            Laundrify / Workspace
          </p>

          <h1 className="font-heading text-3xl font-medium tracking-[-1.5px] text-[#34382D] sm:text-[38px]">
            Orders
          </h1>

          <p className="mt-2 max-w-lg text-sm leading-6 text-[#858579]">
            Manage and track all laundry orders in one place.
          </p>
        </div>

        <Link
          to="/orders/create"
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg bg-[#788A61] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#64764F]"
        >
          <Plus size={15} />
          Create order
        </Link>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-semibold tracking-tight text-[#34382D]">
              Operational overview
            </h2>
            <p className="mt-1 text-xs text-[#858579]">
              A snapshot of your current order workload.
            </p>
          </div>

          <span className="hidden text-[10px] uppercase tracking-[0.14em] text-[#96968C] sm:block">
            Live totals
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((card, index) => {
            const isSage = card.tone === "sage";
            const isRose = card.tone === "rose";

            return (
              <article
                key={card.title}
                className={`relative min-w-0 overflow-hidden rounded-xl border p-4 transition-colors hover:border-[#D2D8C8] ${
                  isSage
                    ? "border-[#D6DECB] bg-[#E9EEDF]"
                    : isRose
                      ? "border-[#EBD5D0] bg-[#F5E8E5]"
                      : "border-[#E7E0D6] bg-[#FBF9F5]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-[#777B70]">
                    {card.title}
                  </p>
                </div>

                <p
                  className={`mt-5 break-words font-heading text-[27px] font-medium leading-tight tracking-[-1px] tabular-nums ${
                    isSage
                      ? "text-[#536541]"
                      : isRose
                        ? "text-[#98645B]"
                        : "text-[#34382D]"
                  }`}
                >
                  {card.value}
                </p>

                <div className="mt-4 flex items-center gap-2 border-t border-[#34382D]/[0.08] pt-3">
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${
                      index === 0 || isSage
                        ? "bg-[#81906C]"
                        : isRose
                          ? "bg-[#B9796E]"
                          : "bg-[#C7C6B9]"
                    }`}
                  />
                  <span className="text-[11px] leading-4 text-[#858579]">
                    {card.description}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#E7E0D6] bg-[#FBF9F5]">
        <div className="flex flex-col gap-4 border-b border-[#EAE4DB] px-5 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#81906C]">
              Order management
            </p>

            <h2 className="mt-2 font-heading text-lg font-semibold tracking-tight text-[#34382D]">
              All orders
            </h2>

            <p className="mt-1 text-xs leading-5 text-[#858579]">
              {filteredOrders.length}{" "}
              {filteredOrders.length === 1 ? "order" : "orders"} found
            </p>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
            <div className="relative min-w-0 sm:col-span-2 lg:w-64">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#858579]"
              />
              <input
                type="text"
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search order or customer..."
                aria-label="Search orders"
                className={`${controlClass} w-full pl-9 pr-3 placeholder:text-[#A3A094]`}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => handleStatusChange(event.target.value)}
              aria-label="Filter by order status"
              className={controlClass}
            >
              <option value="ALL">All statuses</option>
              <option value="RECEIVED">Received</option>
              <option value="WASHING">Washing</option>
              <option value="DRYING">Drying</option>
              <option value="IRONING">Ironing</option>
              <option value="READY">Ready</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="PROCESSING">Processing</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(event) => handlePaymentChange(event.target.value)}
              aria-label="Filter by payment status"
              className={controlClass}
            >
              <option value="ALL">All payments</option>
              <option value="PAID">Paid</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PENDING">Pending</option>
              <option value="PARTIALLY_PAID">Partially paid</option>
              <option value="FAILED">Failed</option>
              <option value="EXPIRED">Expired</option>
            </select>

            <label className="relative flex min-w-0 items-center">
              <ArrowUpDown
                size={13}
                className="pointer-events-none absolute left-3 text-[#858579]"
              />
              <select
                value={sortKey}
                onChange={(event) =>
                  handleSortChange(event.target.value as SortKey)
                }
                aria-label="Sort orders"
                className={`${controlClass} w-full pl-8 lg:w-auto`}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highest">Highest amount</option>
                <option value="lowest">Lowest amount</option>
              </select>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto border-t border-[#EAE4DB]">
          <table className="w-full min-w-[850px] border-collapse text-left">
            <thead>
              <tr className="bg-[#F4F1EA]">
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#858579] sm:px-5">
                  Order
                </th>
                <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#858579]">
                  Customer
                </th>
                <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#858579]">
                  Order date
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
                <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-[#858579]">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 5 }, (_, index) => (
                  <tr key={index} className="border-t border-[#EEE9E1]">
                    {Array.from({ length: 7 }, (_, cellIndex) => (
                      <td key={cellIndex} className="px-3 py-3.5">
                        <div className="h-4 animate-pulse rounded bg-[#F0EDE5]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-14 text-center text-sm text-[#858579]"
                  >
                    <div className="flex flex-col items-center">
                      <ClipboardList
                        size={26}
                        strokeWidth={1.5}
                        className="mb-3 text-[#A4A697]"
                      />
                      <p className="text-sm font-medium text-[#53594A]">
                        No orders found
                      </p>
                      <p className="mt-1 text-xs text-[#858579]">
                        Try adjusting your search or filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const status = normalizeStatus(getOrderStatus(order));
                  const paymentStatus = normalizePaymentStatus(
                    getOrderPaymentStatus(order),
                  );

                  return (
                    <tr
                      key={order.id}
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
                          to={`/order/${order.id}`}
                          className="text-xs font-semibold text-[#454B3A] transition hover:text-[#758760]"
                        >
                          {getOrderCode(order)}
                        </Link>
                        <p className="mt-1 whitespace-nowrap text-[10px] text-[#96968C]">
                          {formatDate(getOrderDate(order))}
                        </p>
                        <p className="mt-1 text-[10px] text-[#858579]">
                          {order.items?.length ?? 0}{" "}
                          {(order.items?.length ?? 0) === 1 ? "item" : "items"}
                        </p>
                      </td>

                      <td className="px-3 py-3.5">
                        <span className="block max-w-[150px] truncate text-xs font-medium text-[#53594A]">
                          {getCustomerName(order)}
                        </span>
                        <p className="mt-1 text-[10px] text-[#96968C]">
                          {getCustomerPhone(order) || "No phone number"}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3.5 text-xs text-[#66685D]">
                        {formatDate(getOrderDate(order))}
                      </td>

                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-medium ${getStatusStyle(status)}`}
                        >
                          {getStatusLabel(status)}
                        </span>
                      </td>

                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-medium ${getPaymentStyle(paymentStatus)}`}
                        >
                          {getPaymentLabel(paymentStatus)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-3.5 text-right text-xs font-semibold tabular-nums text-[#34382D]">
                        {formatCurrency(getOrderTotal(order))}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/order/${order.id}`}
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-semibold text-[#758760] transition-colors hover:bg-[#E8EEE0] hover:text-[#536541]"
                        >
                          View details
                          <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredOrders.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-[#EAE4DB] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#858579]">
              Showing{" "}
              <span className="font-medium text-[#53594A]">
                {(safeCurrentPage - 1) * PAGE_SIZE + 1}
              </span>
              {"–"}
              <span className="font-medium text-[#53594A]">
                {Math.min(safeCurrentPage * PAGE_SIZE, filteredOrders.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-[#53594A]">
                {filteredOrders.length}
              </span>{" "}
              orders
            </p>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.max(1, page - 1))
                }
                disabled={safeCurrentPage === 1}
                aria-label="Previous page"
                className="flex size-9 items-center justify-center rounded-lg border border-[#E7E0D6] text-[#77786D] transition-colors hover:bg-[#F0EDE5] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>

              {pageNumbers.map((page, index) =>
                page === "..." ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="flex size-9 items-center justify-center text-xs text-[#858579]"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(Number(page))}
                    aria-current={safeCurrentPage === page ? "page" : undefined}
                    className={`flex size-9 items-center justify-center rounded-lg border text-xs transition-colors ${
                      safeCurrentPage === page
                        ? "border-[#81906C] bg-[#81906C] font-semibold text-white"
                        : "border-transparent text-[#77786D] hover:border-[#E7E0D6] hover:bg-[#F0EDE5]"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={safeCurrentPage === totalPages}
                aria-label="Next page"
                className="flex size-9 items-center justify-center rounded-lg border border-[#E7E0D6] text-[#77786D] transition-colors hover:bg-[#F0EDE5] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E5DED3] pt-4 text-[10px] text-[#96968C]">
        <span>Laundrify workspace</span>
        <span>Care in every detail.</span>
      </footer>
    </div>
  );
}