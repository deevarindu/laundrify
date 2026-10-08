import type { FormEvent } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import axios from "axios";

type TrackingOrder = {
  orderCode: string;
  customer: {
    name: string;
    phone: string;
  };
  orderStatus: string;
  paymentStatus: string;
  subtotal: number | string;
  discount: number | string;
  total: number | string;
  dueAt: string | null;
  createdAt: string;
};

const statusSteps = [
  "PESANAN_DITERIMA",
  "DICUCI",
  "DIKERINGKAN",
  "DISETRIKA",
  "SIAP_DIAMBIL",
  "SELESAI",
];

const statusLabels: Record<string, string> = {
  PESANAN_DITERIMA: "Order Received",
  DICUCI: "Washing",
  DIKERINGKAN: "Drying",
  DISETRIKA: "Ironing",
  SIAP_DIAMBIL: "Ready",
  SELESAI: "Completed",
  DIBATALKAN: "Cancelled",
};

const formatPrice = (price: number | string) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(price));
};

export default function TrackPage() {
  const [orderCode, setOrderCode] = useState("");
  const [phone, setPhone] = useState("");

  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setOrder(null);
    setError("");
    setIsLoading(true);

    try {
      const response = await api.post("/tracking", {
        orderCode: orderCode.trim(),
        phone: phone.trim(),
      });

      setOrder(response.data.data);
    } catch (error: unknown) {
      console.log(error);

      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.message ||
            "Order could not be found."
        );
      } else {
        setError("Order could not be found.");
      }
      
    } finally {
      setIsLoading(false);
    }
  };

  const currentStatusIndex = order
    ? statusSteps.indexOf(order.orderStatus)
    : -1;

  return (
    <div className="min-h-screen bg-[#F7F2EB] text-[#30352E]">
      <header className="border-b border-[#DED8CF]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link to="/" className="text-2xl font-bold">
            Laundrify
          </Link>

          <Link
            to="/"
            className="text-sm text-[#73776D] hover:text-[#30352E]"
          >
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B9A6E]">
            Track Order
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Where is your laundry?
          </h1>

          <p className="mt-3 text-[#73776D]">
            Enter your order code and phone number to see your
            laundry status.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-3xl border border-[#DED8CF] bg-white p-6 shadow-sm md:p-8"
        >
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Order Code
              </label>

              <input
                value={orderCode}
                onChange={(event) =>
                  setOrderCode(event.target.value)
                }
                required
                placeholder="ORD-123456"
                className="w-full rounded-xl border border-[#DED8CF] px-4 py-3 text-sm outline-none focus:border-[#8B9A6E]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Phone Number
              </label>

              <input
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value)
                }
                required
                placeholder="08xxxxxxxxxx"
                className="w-full rounded-xl border border-[#DED8CF] px-4 py-3 text-sm outline-none focus:border-[#8B9A6E]"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-[#FBECEC] p-4 text-sm text-[#B85C5C]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#8B9A6E] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Checking..." : "Track Order"}
            </button>
          </div>
        </form>

        {order && (
          <div className="mt-8 space-y-5">
            <div className="rounded-3xl border border-[#DED8CF] bg-white p-6 shadow-sm md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-[#73776D]">
                    Order Code
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {order.orderCode}
                  </p>
                </div>

                <div className="rounded-full bg-[#EEF1E7] px-4 py-2 text-sm font-semibold text-[#687653]">
                  {statusLabels[order.orderStatus] ||
                    order.orderStatus}
                </div>
              </div>

              <div className="mt-8">
                <p className="mb-5 text-sm font-semibold">
                  Order Progress
                </p>

                <div className="space-y-4">
                  {statusSteps.map((status, index) => {
                    const isCompleted =
                      currentStatusIndex >= index;
                    const isCurrent =
                      currentStatusIndex === index;
                    console.log("ORDER:", order);
                    console.log("TOTAL:", order.total);
                    console.log("TYPE:", typeof order.total);
                    return (
                      <div
                        key={status}
                        className="flex items-center gap-4"
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isCompleted
                              ? "bg-[#8B9A6E] text-white"
                              : "bg-[#EEEAE4] text-[#9A9C95]"
                          }`}
                        >
                          {index + 1}
                        </div>

                        <div>
                          <p
                            className={`text-sm font-medium ${
                              isCurrent
                                ? "text-[#8B9A6E]"
                                : isCompleted
                                  ? "text-[#30352E]"
                                  : "text-[#9A9C95]"
                            }`}
                          >
                            {statusLabels[status]}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-3xl border border-[#DED8CF] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#73776D]">
                  Customer
                </p>

                <p className="mt-2 font-semibold">
                  {order.customer.name}
                </p>

                <p className="mt-1 text-sm text-[#73776D]">
                  {order.customer.phone}
                </p>
              </div>

              <div className="rounded-3xl border border-[#DED8CF] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#73776D]">
                  Payment
                </p>

                <p className="mt-2 font-semibold">
                  {order.paymentStatus === "SUDAH_DIBAYAR"
                    ? "Paid"
                    : "Not Paid"}
                </p>

                <p className="mt-1 text-xl font-bold text-[#8B9A6E]">
                  {formatPrice(order.total)}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}