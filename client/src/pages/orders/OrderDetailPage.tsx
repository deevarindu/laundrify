import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import type {
  Order,
  PaymentMethod,
  OrderStatus,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
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
  method: PaymentMethod;
  paidAt: string;
  receivedById: number;
  receivedBy?: {
    id: number;
    name: string;
    email: string;
  };
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
  SIAP_DIAMBIL: "Ready",
  SELESAI: "Completed",
  DIBATALKAN: "Cancelled",
};

const paymentMethods: PaymentMethod[] = [
  "CASH",
  "TRANSFER",
  "QRIS",
];

const OrderDetailPage = () => {
  const { id } = useParams();

  const navigate = useNavigate();

  const orderId = Number(id);

  const validOrderId =
    Number.isInteger(orderId) && orderId > 0;

  const [order, setOrder] =
    useState<OrderDetail | null>(null);

  const [loading, setLoading] =
    useState(validOrderId);

  const [error, setError] = useState(
    validOrderId
      ? ""
      : "Invalid order ID."
  );

  const [statusSubmitting, setStatusSubmitting] =
    useState(false);

  const [paymentDialogOpen, setPaymentDialogOpen] =
    useState(false);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("CASH");

  const [paymentPaidAt, setPaymentPaidAt] =
    useState("");

  const [paymentSubmitting, setPaymentSubmitting] =
    useState(false);

  const [actionError, setActionError] =
    useState("");

  useEffect(() => {
    if (!validOrderId) {
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      try {
        const response = await api.get(
          `/order/${orderId}`
        );

        if (cancelled) {
          return;
        }

        setOrder(response.data.data);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(error);

        setError(
          "Failed to load order detail."
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
  }, [orderId, validOrderId]);

  const nextStatus = useMemo(() => {
    if (!order) {
      return null;
    }

    const currentIndex =
      statusFlow.indexOf(
        order.orderStatus
      );

    if (currentIndex === -1) {
      return null;
    }

    return (
      statusFlow[currentIndex + 1] ??
      null
    );
  }, [order]);

  const canAdvanceStatus =
    !!order &&
    !!nextStatus &&
    order.orderStatus !== "DIBATALKAN" &&
    order.orderStatus !== "SELESAI";

  const canRecordPayment =
    !!order &&
    order.paymentStatus === "BELUM_DIBAYAR" &&
    order.orderStatus !== "DIBATALKAN";

  const canCancelOrder =
    !!order &&
    order.orderStatus === "PESANAN_DITERIMA";

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
        month: "long",
        year: "numeric",
      }
    );
  };

  const formatDateTime = (
    value: string
  ) => {
    return new Date(
      value
    ).toLocaleString(
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

  const handleAdvanceStatus =
    async () => {
      if (!order || !nextStatus) {
        return;
      }

      try {
        setStatusSubmitting(true);
        setActionError("");

        const response =
          await api.patch(
            `/order/${order.id}/status`,
            {
              status: nextStatus,
            }
          );

        setOrder(response.data.data);
      } catch (error) {
        console.error(error);

        setActionError(
          "Failed to update order status."
        );
      } finally {
        setStatusSubmitting(false);
      }
    };

  const handleCancelOrder =
    async () => {
      if (
        !order ||
        order.orderStatus !==
          "PESANAN_DITERIMA"
      ) {
        return;
      }

      try {
        setStatusSubmitting(true);
        setActionError("");

        const response =
          await api.patch(
            `/order/${order.id}/status`,
            {
              status: "DIBATALKAN",
              note: "Order cancelled.",
            }
          );

        setOrder(response.data.data);
      } catch (error) {
        console.error(error);

        setActionError(
          "Order can only be cancelled before processing starts."
        );
      } finally {
        setStatusSubmitting(false);
      }
    };

  const handleRecordPayment =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (!order) {
        return;
      }

      try {
        setPaymentSubmitting(true);
        setActionError("");

        const response =
          await api.post(
            "/payment",
            {
              orderId: order.id,
              amount: Number(
                order.total
              ),
              method: paymentMethod,
              paidAt:
                paymentPaidAt ||
                undefined,
            }
          );

        const payment =
          response.data.data;

        setOrder(
          (currentOrder) => {
            if (!currentOrder) {
              return currentOrder;
            }

            return {
              ...currentOrder,
              payment,
              paymentStatus:
                "SUDAH_DIBAYAR",
            };
          }
        );

        setPaymentDialogOpen(false);
        setPaymentMethod("CASH");
        setPaymentPaidAt("");
      } catch (error) {
        console.error(error);

        setActionError(
          "Failed to record payment."
        );
      } finally {
        setPaymentSubmitting(false);
      }
    };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#F7F2EB]">
        <p className="text-sm text-[#73776D]">
          Loading order detail...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 rounded-3xl border border-[#DED8CF] bg-white p-6">
        <p className="text-sm text-[#B85C5C]">
          {error}
        </p>

        <Button
          type="button"
          onClick={() =>
            navigate("/orders")
          }
          className="bg-[#8B9A6E] text-white hover:bg-[#7D8C62]"
        >
          Back to Orders
        </Button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4 rounded-3xl border border-[#DED8CF] bg-white p-6">
        <p className="text-sm text-[#73776D]">
          Order not found.
        </p>

        <Button
          type="button"
          onClick={() =>
            navigate("/orders")
          }
          className="bg-[#8B9A6E] text-white hover:bg-[#7D8C62]"
        >
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-8 bg-[#F7F2EB]">
      <section className="rounded-3xl bg-[#8B9A6E] px-6 py-7 text-white shadow-sm md:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">
                Order Detail
              </p>

              <Badge className="border-0 bg-white/15 text-white hover:bg-white/15">
                {statusLabels[
                  order.orderStatus
                ]}
              </Badge>

              <Badge
                className={
                  order.paymentStatus ===
                  "SUDAH_DIBAYAR"
                    ? "border-0 bg-white text-[#4B5141] hover:bg-white"
                    : "border-0 bg-[#EAE2D6] text-[#4B5141] hover:bg-[#EAE2D6]"
                }
              >
                {order.paymentStatus ===
                "SUDAH_DIBAYAR"
                  ? "Paid"
                  : "Unpaid"}
              </Badge>
            </div>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {order.orderCode}
            </h1>

            <p className="mt-2 text-sm text-white/75">
              Created{" "}
              {formatDateTime(
                order.createdAt
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() =>
                navigate(
                  `/invoices/${order.id}`
                )
              }
              className="bg-white text-[#4B5141] hover:bg-[#F7F2EB]"
            >
              Print Invoice
            </Button>

            <Button
              type="button"
              onClick={() =>
                navigate("/orders")
              }
              className="bg-white text-[#4B5141] hover:bg-[#F7F2EB]"
            >
              Back to Orders
            </Button>
          </div>
        </div>
      </section>

      {actionError && (
        <div className="rounded-2xl border border-[#D8CACA] bg-[#F4E7E3] px-5 py-4 text-sm text-[#B85C5C]">
          {actionError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-[#DED8CF] bg-white shadow-sm">
          <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4]">
            <CardTitle className="text-base font-semibold text-[#4B5141]">
              Customer
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            <p className="text-lg font-semibold text-[#30352A]">
              {order.customer?.name ??
                "Unknown Customer"}
            </p>

            <p className="mt-2 text-sm text-[#4B5141]">
              {order.customer?.phone ??
                "-"}
            </p>

            <p className="mt-1 text-sm leading-6 text-[#73776D]">
              {order.customer?.address ??
                "-"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#DED8CF] bg-white shadow-sm">
          <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4]">
            <CardTitle className="text-base font-semibold text-[#4B5141]">
              Order Information
            </CardTitle>
          </CardHeader>

          <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                Order Code
              </p>

              <p className="mt-1 font-semibold text-[#30352A]">
                {order.orderCode}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                Created
              </p>

              <p className="mt-1 text-sm text-[#4B5141]">
                {formatDate(
                  order.createdAt
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                Due
              </p>

              <p className="mt-1 text-sm text-[#4B5141]">
                {order.dueAt
                  ? formatDateTime(
                      order.dueAt
                    )
                  : "-"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                Created By
              </p>

              <p className="mt-1 text-sm text-[#4B5141]">
                {order.user?.name ??
                  "-"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-[#DED8CF] bg-white shadow-sm">
        <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4]">
          <CardTitle className="text-base font-semibold text-[#4B5141]">
            Order Items
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 md:p-6">
          {(order.orderItems ?? [])
            .length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D8D2C9] bg-[#FAF8F4] px-6 py-8 text-center">
              <p className="text-sm text-[#73776D]">
                No order items found.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {(order.orderItems ?? []).map(
                (item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-xl border border-[#E2DDD5] bg-[#FDFCFA] px-4 py-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#30352A]">
                        {item.service
                          ?.name ??
                          "Unknown Service"}
                      </p>

                      <p className="mt-1 text-xs text-[#73776D]">
                        {item.quantity}{" "}
                        {item.service
                          ?.unit ===
                        "SATUAN"
                          ? "unit"
                          : "KG"}{" "}
                        ×{" "}
                        {formatCurrency(
                          item.priceSnapshot
                        )}
                      </p>
                    </div>

                    <p className="text-sm font-semibold text-[#4B5141]">
                      {formatCurrency(
                        item.subtotal
                      )}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-[#DED8CF] bg-white shadow-sm">
          <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4]">
            <CardTitle className="text-base font-semibold text-[#4B5141]">
              Order Summary
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 p-6">
            <div className="flex justify-between text-sm">
              <span className="text-[#73776D]">
                Subtotal
              </span>

              <span className="font-medium text-[#4B5141]">
                {formatCurrency(
                  order.subtotal
                )}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-[#73776D]">
                Discount
              </span>

              <span className="font-medium text-[#4B5141]">
                -{" "}
                {formatCurrency(
                  order.discount
                )}
              </span>
            </div>

            <div className="flex items-end justify-between rounded-2xl bg-[#E7ECDD] px-4 py-4">
              <span className="text-sm font-medium text-[#4B5141]">
                Total
              </span>

              <span className="text-xl font-semibold text-[#30352A]">
                {formatCurrency(
                  order.total
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#DED8CF] bg-white shadow-sm">
          <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4]">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base font-semibold text-[#4B5141]">
                Payment
              </CardTitle>

              <Badge
                className={
                  order.payment
                    ? "border-0 bg-[#8B9A6E] text-white hover:bg-[#8B9A6E]"
                    : "border-0 bg-[#EEEEEE] text-[#73776D] hover:bg-[#EEEEEE]"
                }
              >
                {order.payment
                  ? "Paid"
                  : "Unpaid"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {order.payment ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                    Amount
                  </p>

                  <p className="mt-1 font-semibold text-[#30352A]">
                    {formatCurrency(
                      order.payment
                        .amount
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                    Method
                  </p>

                  <p className="mt-1 text-sm font-medium text-[#4B5141]">
                    {order.payment.method}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                    Paid At
                  </p>

                  <p className="mt-1 text-sm text-[#4B5141]">
                    {formatDateTime(
                      order.payment
                        .paidAt
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                    Received By
                  </p>

                  <p className="mt-1 text-sm text-[#4B5141]">
                    {order.payment
                      .receivedBy
                      ?.name ??
                      "-"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 rounded-2xl bg-[#FAF8F4] p-5">
                <p className="text-sm leading-6 text-[#73776D]">
                  This order has not been paid yet.
                </p>

                {canRecordPayment && (
                  <Button
                    type="button"
                    onClick={() => {
                      setActionError("");
                      setPaymentDialogOpen(
                        true
                      );
                    }}
                    className="w-fit bg-[#8B9A6E] text-white hover:bg-[#7D8C62]"
                  >
                    Record Payment
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#DED8CF] bg-white shadow-sm">
        <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4]">
          <CardTitle className="text-base font-semibold text-[#4B5141]">
            Status Workflow
          </CardTitle>

          <p className="text-sm text-[#73776D]">
            Track the order from receiving to completion.
          </p>
        </CardHeader>

        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <div className="flex min-w-max items-center gap-2">
              {statusFlow.map(
                (status, index) => {
                  const currentIndex =
                    statusFlow.indexOf(
                      order.orderStatus
                    );

                  const completed =
                    currentIndex >=
                      index &&
                    order.orderStatus !==
                      "DIBATALKAN";

                  const active =
                    order.orderStatus ===
                    status;

                  return (
                    <div
                      key={status}
                      className="flex items-center gap-2"
                    >
                      <div
                        className={`rounded-xl px-3 py-2 text-xs font-medium ${
                          active
                            ? "bg-[#8B9A6E] text-white"
                            : completed
                              ? "bg-[#E7ECDD] text-[#4B5141]"
                              : "bg-[#EEEEEE] text-[#8A8D84]"
                        }`}
                      >
                        {statusLabels[
                          status
                        ]}
                      </div>

                      {index <
                        statusFlow.length -
                          1 && (
                        <span className="text-[#B7B8B1]">
                          →
                        </span>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {order.orderStatus ===
            "DIBATALKAN" && (
            <Badge className="mt-4 border-0 bg-[#B85C5C] text-white hover:bg-[#B85C5C]">
              Cancelled
            </Badge>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {canAdvanceStatus && (
              <Button
                type="button"
                onClick={
                  handleAdvanceStatus
                }
                disabled={statusSubmitting}
                className="bg-[#8B9A6E] text-white hover:bg-[#7D8C62]"
              >
                {statusSubmitting
                  ? "Updating..."
                  : `Move to ${statusLabels[nextStatus]}`}
              </Button>
            )}

            {canCancelOrder && (
              <Button
                type="button"
                variant="destructive"
                onClick={
                  handleCancelOrder
                }
                disabled={statusSubmitting}
                className="bg-[#B85C5C] text-white hover:bg-[#A64F4F]"
              >
                {statusSubmitting
                  ? "Cancelling..."
                  : "Cancel Order"}
              </Button>
            )}
          </div>

          {order.orderStatus ===
            "SIAP_DIAMBIL" &&
            order.paymentStatus !==
              "SUDAH_DIBAYAR" && (
              <p className="mt-4 rounded-xl bg-[#EAE2D6] px-4 py-3 text-sm leading-6 text-[#5D6253]">
                Order can only be completed after
                full payment is recorded.
              </p>
            )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-[#DED8CF] bg-white shadow-sm">
        <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4]">
          <CardTitle className="text-base font-semibold text-[#4B5141]">
            Status History
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 md:p-6">
          {(
            order.orderStatusHistories ??
            []
          ).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D8D2C9] bg-[#FAF8F4] px-6 py-8 text-center">
              <p className="text-sm text-[#73776D]">
                No status history found.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {(
                order.orderStatusHistories ??
                []
              ).map((history) => (
                <div
                  key={history.id}
                  className="rounded-xl border border-[#E2DDD5] bg-[#FDFCFA] px-4 py-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className="border-0 bg-[#EAE2D6] text-[#4B5141] hover:bg-[#EAE2D6]">
                        {
                          statusLabels[
                            history.orderStatus
                          ]
                        }
                      </Badge>

                      <p className="text-sm text-[#73776D]">
                        {history.user
                          ?.name ??
                          "Unknown User"}
                      </p>
                    </div>

                    <p className="text-xs text-[#8A8D84]">
                      {formatDateTime(
                        history.changedAt
                      )}
                    </p>
                  </div>

                  {history.note && (
                    <p className="mt-3 border-l-2 border-[#C8D0B7] pl-3 text-sm leading-6 text-[#73776D]">
                      {history.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={paymentDialogOpen}
        onOpenChange={
          setPaymentDialogOpen
        }
      >
        <DialogContent className="border-[#DED8CF] bg-[#FAF8F4]">
          <DialogHeader>
            <DialogTitle className="text-[#30352A]">
              Record Payment
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={
              handleRecordPayment
            }
            className="space-y-5"
          >
            <div className="rounded-2xl bg-[#EAE2D6] p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[#73776D]">
                Amount
              </p>

              <p className="mt-1 text-xl font-semibold text-[#4B5141]">
                {formatCurrency(
                  order.total
                )}
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="payment-method"
                className="text-sm font-medium text-[#4B5141]"
              >
                Payment Method
              </label>

              <select
                id="payment-method"
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(
                    event.target
                      .value as PaymentMethod
                  )
                }
                className="flex h-10 w-full rounded-md border border-[#D8D2C9] bg-white px-3 py-2 text-sm text-[#4B5141] outline-none focus:ring-2 focus:ring-[#8B9A6E]"
              >
                {paymentMethods.map(
                  (method) => (
                    <option
                      key={method}
                      value={method}
                    >
                      {method}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="payment-date"
                className="text-sm font-medium text-[#4B5141]"
              >
                Payment Date
              </label>

              <Input
                id="payment-date"
                type="datetime-local"
                value={paymentPaidAt}
                onChange={(event) =>
                  setPaymentPaidAt(
                    event.target.value
                  )
                }
                className="border-[#D8D2C9] bg-white focus-visible:ring-[#8B9A6E]"
              />
            </div>

            {actionError && (
              <p className="rounded-lg bg-[#F4E7E3] px-3 py-2 text-sm text-[#B85C5C]">
                {actionError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setPaymentDialogOpen(
                    false
                  )
                }
                disabled={
                  paymentSubmitting
                }
                className="border-[#D8D2C9] bg-white text-[#4B5141] hover:bg-[#EAE2D6]"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={
                  paymentSubmitting
                }
                className="bg-[#8B9A6E] text-white hover:bg-[#7D8C62]"
              >
                {paymentSubmitting
                  ? "Saving..."
                  : "Record Payment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderDetailPage;