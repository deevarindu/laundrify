
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  FileText,
  MapPin,
  Package,
  RefreshCw,
  RotateCcw,
  UserRound,
  Wallet,
} from "lucide-react";
import api from "@/lib/api";
import type { Order, OrderStatus, PaymentMethod } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CustomerDetail = {
  id: number;
  name: string;
  phone: string;
  address?: string | null;
};

type PaymentDetail = {
  id: number;
  orderId: number;
  amount: number | string;
  cashReceived?: number | string | null;
  method: PaymentMethod;
  paidAt: string;
  receivedById: number | null;
  receivedBy?: {
    id: number;
    name: string;
    email: string;
  } | null;
};

type OrderItemDetail = {
  id: number;
  orderId: number;
  serviceId: number;
  quantity: number;
  priceSnapshot: number | string;
  subtotal: number | string;
  service?: {
    id: number;
    name: string;
    category: string;
    unit: string;
    price: number | string;
  };
};

type StatusHistoryDetail = {
  id: number;
  orderId: number;
  orderStatus: OrderStatus;
  changedById: number;
  changedAt: string;
  note?: string | null;
  user?: {
    id: number;
    name: string;
    email: string;
  };
};

type OrderDetail = Order & {
  customer?: CustomerDetail;
  orderItems?: OrderItemDetail[];
  payment?: PaymentDetail | null;
  orderStatusHistories?: StatusHistoryDetail[];
  user?: {
    id: number;
    name: string;
    email: string;
  };
};

const statusFlow: OrderStatus[] = [
  "PESANAN_DITERIMA",
  "DICUCI",
  "DIKERINGKAN",
  "DISETRIKA",
  "SIAP_DIAMBIL",
  "SELESAI",
];

const statusLabels: Record<OrderStatus, string> = {
  PESANAN_DITERIMA: "Received",
  DICUCI: "Washing",
  DIKERINGKAN: "Drying",
  DISETRIKA: "Ironing",
  SIAP_DIAMBIL: "Ready for pickup",
  SELESAI: "Completed",
  DIBATALKAN: "Cancelled",
};

const paymentMethods: PaymentMethod[] = ["CASH", "TRANSFER", "QRIS"];

const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value));

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = error.response;

    if (
      typeof response === "object" &&
      response !== null &&
      "data" in response
    ) {
      const data = response.data;

      if (
        typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof data.message === "string"
      ) {
        return data.message;
      }
    }
  }

  return fallback;
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  TRANSFER: "Bank transfer",
  QRIS: "QRIS",
};

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const orderId = Number(id);
  const validOrderId = Number.isInteger(orderId) && orderId > 0;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(validOrderId);
  const [error, setError] = useState(
    validOrderId ? "" : "Invalid order ID."
  );
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("CASH");
  const [paymentPaidAt, setPaymentPaidAt] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadOrder = useCallback(async () => {
    const response = await api.get(`/order/${orderId}`);
    return response.data.data as OrderDetail;
  }, [orderId]);

  const refreshOrder = useCallback(async () => {
    const updatedOrder = await loadOrder();
    setOrder(updatedOrder);
  }, [loadOrder]);

  useEffect(() => {
    if (!validOrderId) return;

    let cancelled = false;

    const timer = window.setTimeout(() => {
      const fetchOrder = async () => {
        try {
          const response = await api.get(`/order/${orderId}`);

          if (!cancelled) {
            setOrder(response.data.data as OrderDetail);
            setError("");
          }
        } catch (fetchError: unknown) {
          if (!cancelled) {
            setError(
              getErrorMessage(
                fetchError,
                "Failed to load order detail."
              )
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

      void fetchOrder();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [orderId, validOrderId]);

  const nextStatus = useMemo(() => {
    if (!order) return null;

    const currentIndex = statusFlow.indexOf(order.orderStatus);

    if (currentIndex < 0) return null;

    return statusFlow[currentIndex + 1] ?? null;
  }, [order]);

  const canAdvanceStatus =
    !!order &&
    !!nextStatus &&
    order.orderStatus !== "DIBATALKAN" &&
    order.orderStatus !== "SELESAI" &&
    !(
      order.orderStatus === "SIAP_DIAMBIL" &&
      order.paymentStatus !== "SUDAH_DIBAYAR"
    );

  const canRecordPayment =
    !!order &&
    order.paymentStatus === "BELUM_DIBAYAR" &&
    order.orderStatus !== "DIBATALKAN";

  const canCancelOrder =
    !!order && order.orderStatus === "PESANAN_DITERIMA";

  const totalAmount = Number(order?.total ?? 0);
  const receivedAmount =
    cashReceived.trim() === "" ? 0 : Number(cashReceived);

  const validCashAmount =
    Number.isFinite(receivedAmount) &&
    cashReceived.trim() !== "" &&
    receivedAmount >= totalAmount;

  const changeAmount = receivedAmount - totalAmount;
  const currentStatusIndex = order
    ? statusFlow.indexOf(order.orderStatus)
    : -1;

  const handleAdvanceStatus = async () => {
    if (!order || !nextStatus) return;

    try {
      setStatusSubmitting(true);
      setActionError("");

      await api.patch(`/order/${order.id}/status`, {
        status: nextStatus,
      });

      await refreshOrder();
    } catch (statusError: unknown) {
      setActionError(
        getErrorMessage(
          statusError,
          "Failed to update order status."
        )
      );
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || order.orderStatus !== "PESANAN_DITERIMA") return;

    try {
      setStatusSubmitting(true);
      setActionError("");

      await api.patch(`/order/${order.id}/status`, {
        status: "DIBATALKAN",
        note: "Order cancelled.",
      });

      await refreshOrder();
    } catch (statusError: unknown) {
      setActionError(
        getErrorMessage(
          statusError,
          "Order can only be cancelled before processing starts."
        )
      );
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleRecordPayment = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!order || !canRecordPayment) return;

    if (paymentMethod === "CASH" && !validCashAmount) {
      setActionError(
        "Cash received must be equal to or greater than the total."
      );
      return;
    }

    try {
      setPaymentSubmitting(true);
      setActionError("");

      await api.post("/payment", {
        orderId: order.id,
        amount: Number(order.total),
        method: paymentMethod,
        paidAt: paymentPaidAt || undefined,
        ...(paymentMethod === "CASH"
          ? { cashReceived: receivedAmount }
          : {}),
      });

      await refreshOrder();

      setPaymentDialogOpen(false);
      setPaymentMethod("CASH");
      setPaymentPaidAt("");
      setCashReceived("");
    } catch (paymentError: unknown) {
      setActionError(
        getErrorMessage(paymentError, "Failed to record payment.")
      );
    } finally {
      setPaymentSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-[#E8EDDF]">
          <RefreshCw className="size-5 animate-spin text-[#71815A]" />
        </div>
        <p className="text-sm text-[#777B70]">Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto flex min-h-[45vh] max-w-md flex-col items-center justify-center text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-[#F3E9E6]">
          <Package className="size-6 text-[#B56C60]" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-[#30352A]">
          Order unavailable
        </h1>
        <p className="mt-1 text-sm text-[#777B70]">
          {error || "We couldn't find this order."}
        </p>
        <Button
          type="button"
          onClick={() => navigate("/orders")}
          className="mt-5 bg-[#788663] text-white hover:bg-[#667451]"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to orders
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-8">
      <div className="flex flex-wrap items-center gap-2 text-sm text-[#85877F]">
        <button
          type="button"
          onClick={() => navigate("/orders")}
          className="transition hover:text-[#596548]"
        >
          Orders
        </button>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-[#454A3D]">Order details</span>
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-[#E6E4DA] bg-white">
        <div className="absolute right-0 top-0 h-44 w-44 translate-x-12 -translate-y-12 rounded-full bg-[#EDF1E6] sm:h-64 sm:w-64" />
        <div className="absolute right-20 top-20 size-20 rounded-full border-[18px] border-[#F5F6F0] sm:right-32 sm:top-16 sm:size-28" />

        <div className="relative flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EDF1E6] px-3 py-1.5 text-xs font-semibold text-[#59694A]">
                <span className="size-1.5 rounded-full bg-[#84966A]" />
                {statusLabels[order.orderStatus]}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  order.paymentStatus === "SUDAH_DIBAYAR"
                    ? "bg-[#E6F3E9] text-[#36754B]"
                    : "bg-[#FFF0DA] text-[#9A6824]"
                }`}
              >
                {order.paymentStatus === "SUDAH_DIBAYAR" ? (
                  <CheckCircle2 className="size-3.5" />
                ) : (
                  <Clock3 className="size-3.5" />
                )}
                {order.paymentStatus === "SUDAH_DIBAYAR"
                  ? "Payment complete"
                  : "Awaiting payment"}
              </span>
            </div>

            <p className="mt-5 text-xs font-medium uppercase tracking-[0.16em] text-[#85877F]">
              Order reference
            </p>
            <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight text-[#30352A] sm:text-3xl">
              {order.orderCode}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-[#85877F]">
              <CalendarDays className="size-4" />
              Created {formatDateTime(order.createdAt)}
            </p>
          </div>

          <div className="relative flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/orders")}
              className="border-[#E1DFD6] bg-white/90 text-[#454A3D] hover:bg-[#F7F7F2]"
            >
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Button>
            <Button
              type="button"
              onClick={() => navigate(`/invoices/${order.id}`)}
              className="bg-[#788663] text-white shadow-sm hover:bg-[#667451]"
            >
              <FileText className="mr-2 size-4" />
              View invoice
            </Button>
          </div>
        </div>
      </section>

      {actionError && (
        <div className="flex items-start gap-3 rounded-xl border border-[#E8D3CF] bg-[#FBF1EF] px-4 py-3.5 text-sm text-[#A94F45]">
          <div className="mt-0.5 size-2 shrink-0 rounded-full bg-[#B85C5C]" />
          <p className="flex-1">{actionError}</p>
          <button
            type="button"
            onClick={() => setActionError("")}
            className="text-xs font-medium underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
        <div className="min-w-0 space-y-5">
          <Card className="overflow-hidden rounded-2xl border-[#E6E4DA] bg-white shadow-none">
            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-[#F0EEE7] px-5 py-4">
              <div>
                <CardTitle className="text-base font-semibold text-[#30352A]">
                  Items & services
                </CardTitle>
                <p className="mt-1 text-xs text-[#85877F]">
                  {order.orderItems?.length ?? 0} service item(s) in this order
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#F0F2EA]">
                <Package className="size-5 text-[#788663]" />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead>
                    <tr className="bg-[#FAFAF7] text-[11px] font-semibold uppercase tracking-wider text-[#85877F]">
                      <th className="px-5 py-3">Service</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EEE7]">
                    {(order.orderItems ?? []).map((item) => (
                      <tr key={item.id} className="transition hover:bg-[#FCFCF9]">
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-[#30352A]">
                            {item.service?.name ?? "Unknown Service"}
                          </p>
                          <p className="mt-1 text-xs text-[#92948B]">
                            {item.service?.category ?? "Laundry service"}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-right text-sm text-[#64695B]">
                          {formatCurrency(item.priceSnapshot)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex min-w-8 justify-center rounded-md bg-[#F1F1EB] px-2 py-1 text-xs font-medium text-[#59604D]">
                            {item.quantity}
                          </span>
                          <p className="mt-1 text-[10px] text-[#92948B]">
                            {item.service?.unit ?? "unit"}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-right text-sm font-semibold text-[#30352A]">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                    {(order.orderItems ?? []).length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-12 text-center text-sm text-[#85877F]"
                        >
                          No items have been added to this order.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-[#F0EEE7] bg-[#FCFCF9] px-5 py-4">
                <div className="ml-auto max-w-xs space-y-3">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-[#85877F]">Subtotal</span>
                    <span className="font-medium text-[#454A3D]">
                      {formatCurrency(order.subtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-[#85877F]">Discount</span>
                    <span className="font-medium text-[#54815D]">
                      − {formatCurrency(order.discount)}
                    </span>
                  </div>
                  <div className="border-t border-dashed border-[#DEDDD3] pt-3">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs text-[#85877F]">Grand total</p>
                        <p className="mt-1 text-xs text-[#92948B]">
                          IDR
                        </p>
                      </div>
                      <p className="text-xl font-semibold tracking-tight text-[#30352A]">
                        {formatCurrency(order.total)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#E6E4DA] bg-white shadow-none">
            <CardHeader className="border-b border-[#F0EEE7] px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold text-[#30352A]">
                    Order progress
                  </CardTitle>
                  <p className="mt-1 text-xs text-[#85877F]">
                    Follow the laundry process from start to finish.
                  </p>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F0F2EA]">
                  <RefreshCw className="size-5 text-[#788663]" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5">
              {order.orderStatus === "DIBATALKAN" ? (
                <div className="flex items-start gap-3 rounded-xl bg-[#FBF0ED] p-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F4DCD7]">
                    <RotateCcw className="size-4 text-[#AC5D50]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#984C42]">
                      This order was cancelled
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#A56D64]">
                      The order workflow has been stopped.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-0">
                  {statusFlow.map((status, index) => {
                    const completed = currentStatusIndex >= index;
                    const active = order.orderStatus === status;
                    const last = index === statusFlow.length - 1;

                    return (
                      <div key={status} className="flex gap-3.5">
                        <div className="flex w-8 shrink-0 flex-col items-center">
                          <div
                            className={`z-10 flex size-8 items-center justify-center rounded-full border ${
                              completed
                                ? "border-[#788663] bg-[#788663] text-white"
                                : "border-[#E2E2D9] bg-white text-[#B2B4AA]"
                            }`}
                          >
                            {completed ? (
                              <Check className="size-4" />
                            ) : (
                              <span className="text-xs font-medium">
                                {index + 1}
                              </span>
                            )}
                          </div>
                          {!last && (
                            <div
                              className={`min-h-7 w-px flex-1 ${
                                currentStatusIndex > index
                                  ? "bg-[#AAB69A]"
                                  : "bg-[#E9E8E0]"
                              }`}
                            />
                          )}
                        </div>

                        <div className={`min-w-0 flex-1 ${last ? "pb-0" : "pb-5"}`}>
                          <div
                            className={`flex flex-wrap items-center gap-2 ${
                              active ? "pt-1" : "pt-1.5"
                            }`}
                          >
                            <p
                              className={`text-sm ${
                                active
                                  ? "font-semibold text-[#59694A]"
                                  : completed
                                    ? "font-medium text-[#454A3D]"
                                    : "text-[#92948B]"
                              }`}
                            >
                              {statusLabels[status]}
                            </p>
                            {active && (
                              <span className="rounded-full bg-[#EDF1E6] px-2 py-0.5 text-[10px] font-semibold text-[#59694A]">
                                Current
                              </span>
                            )}
                          </div>
                          {active && (
                            <p className="mt-1 text-xs leading-5 text-[#85877F]">
                              This is the current status of the order.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {order.orderStatus === "SIAP_DIAMBIL" &&
                order.paymentStatus !== "SUDAH_DIBAYAR" && (
                  <div className="mt-5 rounded-xl border border-[#F0E0C4] bg-[#FFFAF0] p-3.5">
                    <p className="text-xs leading-5 text-[#916C32]">
                      Payment is required before this order can be marked as completed.
                    </p>
                  </div>
                )}

              <div className="mt-5 flex flex-wrap gap-2 border-t border-[#F0EEE7] pt-4">
                {canAdvanceStatus && (
                  <Button
                    type="button"
                    onClick={handleAdvanceStatus}
                    disabled={statusSubmitting}
                    className="bg-[#788663] text-white hover:bg-[#667451]"
                  >
                    {statusSubmitting ? (
                      <>
                        <RefreshCw className="mr-2 size-4 animate-spin" />
                        Updating status
                      </>
                    ) : (
                      <>
                        Move to {statusLabels[nextStatus]}
                        <ArrowRight className="ml-2 size-4" />
                      </>
                    )}
                  </Button>
                )}

                {canCancelOrder && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelOrder}
                    disabled={statusSubmitting}
                    className="border-[#E8D3CF] text-[#AD5D51] hover:bg-[#FBF1EF] hover:text-[#984C42]"
                  >
                    Cancel order
                  </Button>
                )}

                {!canAdvanceStatus &&
                  !canCancelOrder &&
                  order.orderStatus !== "DIBATALKAN" && (
                    <p className="flex items-center gap-2 text-xs text-[#85877F]">
                      <CheckCircle2 className="size-4 text-[#788663]" />
                      {order.orderStatus === "SELESAI"
                        ? "This order is complete."
                        : "No further status actions available."}
                    </p>
                  )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#E6E4DA] bg-white shadow-none">
            <CardHeader className="border-b border-[#F0EEE7] px-5 py-4">
              <CardTitle className="text-base font-semibold text-[#30352A]">
                Activity history
              </CardTitle>
              <p className="mt-1 text-xs text-[#85877F]">
                A record of changes made to this order.
              </p>
            </CardHeader>

            <CardContent className="p-5">
              {(order.orderStatusHistories ?? []).length === 0 ? (
                <div className="py-6 text-center">
                  <Clock3 className="mx-auto size-6 text-[#B0B2A8]" />
                  <p className="mt-2 text-sm text-[#85877F]">
                    No activity has been recorded yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-0">
                  {(order.orderStatusHistories ?? []).map(
                    (history, index) => (
                      <div key={history.id} className="flex gap-3.5">
                        <div className="flex w-8 shrink-0 flex-col items-center">
                          <div className="flex size-8 items-center justify-center rounded-full bg-[#F0F2EA] text-[#788663]">
                            {index === 0 ? (
                              <CheckCircle2 className="size-4" />
                            ) : (
                              <Clock3 className="size-4" />
                            )}
                          </div>
                          {index <
                            (order.orderStatusHistories?.length ?? 0) - 1 && (
                            <div className="min-h-5 w-px flex-1 bg-[#E9E8E0]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 pb-5 last:pb-0">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <p className="text-sm font-medium text-[#454A3D]">
                              {statusLabels[history.orderStatus]}
                            </p>
                            <p className="text-[11px] text-[#92948B]">
                              {formatDateTime(history.changedAt)}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-[#85877F]">
                            Updated by {history.user?.name ?? "Unknown user"}
                          </p>
                          {history.note && (
                            <p className="mt-2 rounded-lg bg-[#FAFAF7] px-3 py-2 text-xs leading-5 text-[#64695B]">
                              {history.note}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="min-w-0 space-y-5">
          <Card className="overflow-hidden rounded-2xl border-[#DCE2D2] bg-[#F4F6EF] shadow-none">
            <CardHeader className="px-5 pb-2 pt-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-[#596548]">
                  Payment overview
                </CardTitle>
                <div className="flex size-9 items-center justify-center rounded-xl bg-white">
                  <Wallet className="size-4 text-[#788663]" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <p className="text-xs text-[#78816C]">Total amount</p>
              <p className="mt-1 break-words text-2xl font-semibold tracking-tight text-[#30352A] sm:text-3xl">
                {formatCurrency(order.total)}
              </p>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#DCE2D2] pt-4">
                <span className="text-xs text-[#78816C]">Payment status</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    order.paymentStatus === "SUDAH_DIBAYAR"
                      ? "bg-[#DCECDD] text-[#36754B]"
                      : "bg-[#F9E9CD] text-[#986723]"
                  }`}
                >
                  {order.paymentStatus === "SUDAH_DIBAYAR"
                    ? "Paid"
                    : "Unpaid"}
                </span>
              </div>

              {order.payment ? (
                <div className="mt-4 space-y-3 rounded-xl border border-[#E0E5D8] bg-white p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-[#EDF1E6]">
                      {order.payment.method === "CASH" ? (
                        <Banknote className="size-4 text-[#788663]" />
                      ) : (
                        <CreditCard className="size-4 text-[#788663]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#454A3D]">
                        {paymentMethodLabels[order.payment.method]}
                      </p>
                      <p className="text-xs text-[#92948B]">
                        Payment received
                      </p>
                    </div>
                    <CheckCircle2 className="ml-auto size-4 shrink-0 text-[#5E946A]" />
                  </div>

                  <div className="space-y-2 border-t border-[#F0EEE7] pt-3">
                    <div className="flex justify-between gap-3 text-xs">
                      <span className="text-[#85877F]">Amount paid</span>
                      <span className="font-medium text-[#454A3D]">
                        {formatCurrency(order.payment.amount)}
                      </span>
                    </div>

                    {order.payment.method === "CASH" &&
                      order.payment.cashReceived != null && (
                        <>
                          <div className="flex justify-between gap-3 text-xs">
                            <span className="text-[#85877F]">
                              Cash received
                            </span>
                            <span className="font-medium text-[#454A3D]">
                              {formatCurrency(order.payment.cashReceived)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3 text-xs">
                            <span className="text-[#85877F]">Change</span>
                            <span className="font-medium text-[#54815D]">
                              {formatCurrency(
                                Number(order.payment.cashReceived) -
                                  Number(order.payment.amount)
                              )}
                            </span>
                          </div>
                        </>
                      )}

                    <div className="flex justify-between gap-3 text-xs">
                      <span className="text-[#85877F]">Paid at</span>
                      <span className="text-right text-[#454A3D]">
                        {formatDateTime(order.payment.paidAt)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 text-xs">
                      <span className="text-[#85877F]">Received by</span>
                      <span className="text-right text-[#454A3D]">
                        {order.payment.receivedBy?.name ?? "-"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-[#CFD7C3] bg-white/70 p-4 text-center">
                  <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[#E8EDDF]">
                    <CreditCard className="size-5 text-[#788663]" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-[#454A3D]">
                    No payment recorded
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#85877F]">
                    Record the customer's payment once it has been received.
                  </p>
                  {canRecordPayment && (
                    <Button
                      type="button"
                      onClick={() => {
                        setActionError("");
                        setPaymentMethod("CASH");
                        setCashReceived("");
                        setPaymentPaidAt("");
                        setPaymentDialogOpen(true);
                      }}
                      className="mt-4 w-full bg-[#788663] text-white hover:bg-[#667451]"
                    >
                      <CreditCard className="mr-2 size-4" />
                      Record payment
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#E6E4DA] bg-white shadow-none">
            <CardHeader className="border-b border-[#F0EEE7] px-5 py-4">
              <CardTitle className="text-base font-semibold text-[#30352A]">
                Customer details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#F0F2EA]">
                  <UserRound className="size-5 text-[#788663]" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="break-words text-sm font-semibold text-[#30352A]">
                    {order.customer?.name ?? "Unknown customer"}
                  </p>
                  <p className="mt-1 text-xs text-[#85877F]">
                    Customer #{order.customer?.id ?? "-"}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4 border-t border-[#F0EEE7] pt-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-[#92948B]">
                    Phone number
                  </p>
                  <p className="mt-1.5 text-sm text-[#454A3D]">
                    {order.customer?.phone ?? "-"}
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#92948B]">
                    <MapPin className="size-3.5" />
                    Address
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-[#64695B]">
                    {order.customer?.address || "No address provided."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#E6E4DA] bg-white shadow-none">
            <CardHeader className="border-b border-[#F0EEE7] px-5 py-4">
              <CardTitle className="text-base font-semibold text-[#30352A]">
                Order information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#F5F3ED]">
                  <CalendarDays className="size-4 text-[#85877F]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#85877F]">Order created</p>
                  <p className="mt-1 text-sm font-medium text-[#454A3D]">
                    {formatDateTime(order.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#F5F3ED]">
                  <Clock3 className="size-4 text-[#85877F]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#85877F]">Due date</p>
                  <p className="mt-1 text-sm font-medium text-[#454A3D]">
                    {order.dueAt
                      ? formatDateTime(order.dueAt)
                      : "Not specified"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#F5F3ED]">
                  <UserRound className="size-4 text-[#85877F]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#85877F]">Processed by</p>
                  <p className="mt-1 break-words text-sm font-medium text-[#454A3D]">
                    {order.user?.name ?? "Not available"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <Dialog
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          setPaymentDialogOpen(open);

          if (!open) {
            setCashReceived("");
            setActionError("");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-[#E6E4DA] bg-[#FCFCF9] sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-[#E8EDDF]">
              <Wallet className="size-5 text-[#788663]" />
            </div>
            <DialogTitle className="text-lg font-semibold text-[#30352A]">
              Record payment
            </DialogTitle>
            <DialogDescription className="text-sm leading-5 text-[#85877F]">
              Confirm the payment details for order {order.orderCode}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordPayment} className="mt-2 space-y-4">
            <div className="rounded-xl border border-[#DCE2D2] bg-[#F0F3E9] p-4">
              <p className="text-xs text-[#78816C]">Amount due</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-[#30352A]">
                {formatCurrency(order.total)}
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="payment-method"
                className="text-sm font-medium text-[#454A3D]"
              >
                Payment method
              </label>
              <select
                id="payment-method"
                value={paymentMethod}
                onChange={(event) => {
                  setPaymentMethod(event.target.value as PaymentMethod);
                  setActionError("");
                  setCashReceived("");
                }}
                className="h-10 w-full rounded-lg border border-[#DFDED4] bg-white px-3 text-sm text-[#454A3D] outline-none transition focus:border-[#9AA789] focus:ring-2 focus:ring-[#E8EDDF]"
              >
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {paymentMethodLabels[method]}
                  </option>
                ))}
              </select>
            </div>

            {paymentMethod === "CASH" && (
              <div className="space-y-3 rounded-xl border border-[#E6E4DA] bg-white p-3.5">
                <div className="space-y-1.5">
                  <label
                    htmlFor="cash-received"
                    className="text-sm font-medium text-[#454A3D]"
                  >
                    Cash received (Rp)
                  </label>
                  <Input
                    id="cash-received"
                    type="number"
                    min={totalAmount}
                    step="1"
                    value={cashReceived}
                    onChange={(event) => {
                      setCashReceived(event.target.value);
                      setActionError("");
                    }}
                    placeholder="Enter amount received"
                    required
                    className="h-10 border-[#DFDED4] bg-white focus-visible:ring-[#A5B193]"
                  />
                </div>

                <div
                  className={`rounded-lg p-3 ${
                    validCashAmount ? "bg-[#EAF2E8]" : "bg-[#FAF0EB]"
                  }`}
                >
                  <p className="text-xs text-[#85877F]">
                    {validCashAmount ? "Change to return" : "Amount remaining"}
                  </p>
                  <p
                    className={`mt-1 text-lg font-semibold ${
                      validCashAmount ? "text-[#467552]" : "text-[#A94F45]"
                    }`}
                  >
                    {formatCurrency(
                      validCashAmount
                        ? changeAmount
                        : Math.max(totalAmount - receivedAmount, 0)
                    )}
                  </p>
                  {!validCashAmount && (
                    <p className="mt-1 text-xs leading-5 text-[#A94F45]">
                      Enter an amount equal to or greater than the total.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="payment-date"
                className="text-sm font-medium text-[#454A3D]"
              >
                Payment date
              </label>
              <Input
                id="payment-date"
                type="datetime-local"
                value={paymentPaidAt}
                onChange={(event) => setPaymentPaidAt(event.target.value)}
                className="h-10 border-[#DFDED4] bg-white focus-visible:ring-[#A5B193]"
              />
              <p className="text-[11px] leading-4 text-[#92948B]">
                Leave blank to use the server's default payment time.
              </p>
            </div>

            {actionError && (
              <div className="rounded-lg bg-[#FBF0ED] px-3 py-2.5 text-sm text-[#A94F45]">
                {actionError}
              </div>
            )}

            <div className="flex gap-2 border-t border-[#EAE8E0] pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentDialogOpen(false)}
                disabled={paymentSubmitting}
                className="flex-1 border-[#DFDED4] bg-white text-[#454A3D] hover:bg-[#F5F4EF]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  paymentSubmitting ||
                  (paymentMethod === "CASH" && !validCashAmount)
                }
                className="flex-1 bg-[#788663] text-white hover:bg-[#667451]"
              >
                {paymentSubmitting ? (
                  <>
                    <RefreshCw className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 size-4" />
                    Confirm payment
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderDetailPage;
