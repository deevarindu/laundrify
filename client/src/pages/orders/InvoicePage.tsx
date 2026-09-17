import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import type {
  Order,
  PaymentMethod,
} from "@/types";
import { Button } from "@/components/ui/button";

type CustomerDetail = {
  id: number;
  name: string;
  phone: string;
  address?: string | null;
};

type PaymentDetail = {
  id: number;
  amount: number | string;
  method: PaymentMethod;
  paidAt: string;
};

type OrderItemDetail = {
  id: number;
  quantity: number;
  priceSnapshot: number | string;
  subtotal: number | string;
  service?: {
    id: number;
    name: string;
    unit: string;
  };
};

type InvoiceOrder = Order & {
  customer?: CustomerDetail;
  orderItems?: OrderItemDetail[];
  payment?: PaymentDetail | null;
};

const InvoicePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const orderId = Number(id);

  const validOrderId =
    Number.isInteger(orderId) && orderId > 0;

  const [order, setOrder] =
    useState<InvoiceOrder | null>(null);

  const [loading, setLoading] =
    useState(validOrderId);

  const [error, setError] = useState(
    validOrderId
      ? ""
      : "Invalid order ID."
  );

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
          "Failed to load invoice."
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
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F2EB]">
        <p className="text-sm text-[#73776D]">
          Loading invoice...
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F2EB] px-5">
        <div className="w-full max-w-md rounded-3xl border border-[#DED8CF] bg-white p-6 text-center">
          <p className="text-sm text-[#B85C5C]">
            {error ||
              "Order not found."}
          </p>

          <Button
            type="button"
            onClick={() =>
              navigate("/orders")
            }
            className="mt-5 bg-[#8B9A6E] text-white hover:bg-[#7D8C62]"
          >
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F2EB] px-4 py-8 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-5 flex items-center justify-between print:hidden">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate(
                `/orders/${order.id}`
              )
            }
            className="border-[#D8D2C9] bg-white text-[#4B5141] hover:bg-[#EAE2D6]"
          >
            Back
          </Button>

          <Button
            type="button"
            onClick={handlePrint}
            className="bg-[#8B9A6E] text-white hover:bg-[#7D8C62]"
          >
            Print / Save PDF
          </Button>
        </div>

        <div className="rounded-[28px] border border-[#DED8CF] bg-white p-7 shadow-sm sm:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <div className="flex flex-col gap-6 border-b border-[#EAE2D6] pb-7 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-2xl font-semibold tracking-tight text-[#30352A]">
                Laundrify
              </p>

              <p className="mt-1 text-sm text-[#73776D]">
                Laundry Management System
              </p>
            </div>

            <div className="sm:text-right">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8B9A6E]">
                Invoice
              </p>

              <p className="mt-1 text-xl font-semibold text-[#30352A]">
                {order.orderCode}
              </p>

              <p className="mt-2 text-sm text-[#73776D]">
                {formatDate(
                  order.createdAt
                )}
              </p>
            </div>
          </div>

          <div className="grid gap-6 border-b border-[#EAE2D6] py-7 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                Customer
              </p>

              <p className="mt-2 text-base font-semibold text-[#30352A]">
                {order.customer?.name ??
                  "-"}
              </p>

              <p className="mt-1 text-sm text-[#4B5141]">
                {order.customer?.phone ??
                  "-"}
              </p>

              {order.customer?.address && (
                <p className="mt-1 text-sm leading-6 text-[#73776D]">
                  {order.customer.address}
                </p>
              )}
            </div>

            <div sm:text-right="">
              <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                Order Information
              </p>

              <p className="mt-2 text-sm text-[#4B5141]">
                Created:{" "}
                {formatDateTime(
                  order.createdAt
                )}
              </p>

              <p className="mt-1 text-sm text-[#4B5141]">
                Due:{" "}
                {order.dueAt
                  ? formatDateTime(
                      order.dueAt
                    )
                  : "-"}
              </p>

              <p className="mt-1 text-sm text-[#4B5141]">
                Status:{" "}
                {order.orderStatus}
              </p>
            </div>
          </div>

          <div className="py-7">
            <div className="overflow-hidden rounded-2xl border border-[#E2DDD5]">
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 bg-[#FAF8F4] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#73776D] sm:grid-cols-[1fr_auto_auto_auto]">
                <span>Service</span>
                <span>Qty</span>
                <span>Price</span>
                <span className="hidden sm:block">
                  Amount
                </span>
              </div>

              {(order.orderItems ??
                []).map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_auto_auto] gap-4 border-t border-[#E2DDD5] px-4 py-4 text-sm sm:grid-cols-[1fr_auto_auto_auto]"
                >
                  <div>
                    <p className="font-medium text-[#30352A]">
                      {item.service
                        ?.name ??
                        "Unknown Service"}
                    </p>

                    <p className="mt-1 text-xs text-[#8A8D84]">
                      {item.service
                        ?.unit ===
                      "SATUAN"
                        ? "Satuan"
                        : "Kilogram"}
                    </p>
                  </div>

                  <span className="text-[#4B5141]">
                    {item.quantity}
                  </span>

                  <span className="text-[#4B5141]">
                    {formatCurrency(
                      item.priceSnapshot
                    )}
                  </span>

                  <span className="hidden font-medium text-[#30352A] sm:block">
                    {formatCurrency(
                      item.subtotal
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end border-b border-[#EAE2D6] pb-7">
            <div className="w-full max-w-sm space-y-3">
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

              <div className="flex justify-between rounded-xl bg-[#E7ECDD] px-4 py-4">
                <span className="font-semibold text-[#4B5141]">
                  Total
                </span>

                <span className="text-lg font-semibold text-[#30352A]">
                  {formatCurrency(
                    order.total
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 py-7 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                Payment Status
              </p>

              <p className="mt-2 text-sm font-semibold text-[#4B5141]">
                {order.payment
                  ? "PAID"
                  : "UNPAID"}
              </p>

              {order.payment && (
                <>
                  <p className="mt-2 text-sm text-[#73776D]">
                    Method:{" "}
                    {order.payment.method}
                  </p>

                  <p className="mt-1 text-sm text-[#73776D]">
                    Paid:{" "}
                    {formatDateTime(
                      order.payment
                        .paidAt
                    )}
                  </p>
                </>
              )}
            </div>

            <div className="sm:text-right">
              <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                Thank You
              </p>

              <p className="mt-2 text-sm leading-6 text-[#73776D]">
                Thank you for trusting Laundrify
                with your laundry.
              </p>
            </div>
          </div>

          <div className="border-t border-[#EAE2D6] pt-5 text-center">
            <p className="text-xs text-[#8A8D84]">
              Laundrify internal management system
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePage;