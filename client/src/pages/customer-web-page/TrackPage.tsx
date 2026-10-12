import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "@/lib/api";
import socket from "@/lib/socket";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type RequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";
type RequestType = "PICKUP" | "DELIVERY";
type OrderStatus =
  | "PESANAN_DITERIMA"
  | "DICUCI"
  | "DIKERINGKAN"
  | "DISETRIKA"
  | "SIAP_DIAMBIL"
  | "SELESAI"
  | "DIBATALKAN";
type PaymentStatus = "BELUM_DIBAYAR" | "SUDAH_DIBAYAR";
type PaymentMethod = "CASH" | "TRANSFER" | "QRIS";

type TrackedOrderItem = {
  id: number;
  quantity: number;
  priceSnapshot: number | string;
  subtotal: number | string;
  service?: { name: string; unit?: string };
};

type TrackedPayment = {
  amount: number | string;
  method: PaymentMethod;
  cashReceived?: number | string | null;
  paidAt?: string | null;
};

type TrackedOrderHistory = {
  id: number;
  orderStatus: OrderStatus;
  changedAt: string;
  note?: string | null;
};

type TrackedDeliveryRequest = {
  id: number;
  requestCode: string;
  type: RequestType;
  address: string;
  status: RequestStatus;
  scheduledDate?: string | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  createdAt: string;
  updatedAt?: string;
  processedAt?: string | null;
};

type TrackedOrder = {
  id: number;
  orderCode: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number | string;
  discount: number | string;
  total: number | string;
  dueAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  customer?: { name: string; phone?: string; address?: string | null };
  payment?: TrackedPayment | null;
  orderItems?: TrackedOrderItem[];
  orderStatusHistories?: TrackedOrderHistory[];
  deliveryRequest?: TrackedDeliveryRequest | null;
};

type TrackedRequest = {
  id: number;
  requestCode: string;
  name: string;
  phone: string;
  address: string;
  type: RequestType;
  status: RequestStatus;
  createdAt: string;
  updatedAt?: string;
  service?: { name: string; category?: string; unit?: string; price?: number | string };
  scheduledDate?: string | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  order?: TrackedOrder | null;
  requestedForOrder?: TrackedOrder | null;
};

type TrackingResult =
  | { type: "ORDER"; order: TrackedOrder }
  | { type: "REQUEST"; request: TrackedRequest };

type TrackLocationState = { requestCode?: string };
type SnapResult = Record<string, unknown>;
type SnapPayCallbacks = {
  onSuccess: (result: SnapResult) => void;
  onPending: (result: SnapResult) => void;
  onError: (result: SnapResult) => void;
  onClose: () => void;
};
type MidtransSnap = { pay: (token: string, callbacks: SnapPayCallbacks) => void };

declare global {
  interface Window {
    snap?: MidtransSnap;
  }
}

const inputClassName =
  "h-12 w-full min-w-0 rounded-xl border border-[#D8D5C8] bg-white px-4 text-sm text-[#34382D] outline-none transition placeholder:text-[#A0A093] focus:border-[#8B9A6E] focus:ring-2 focus:ring-[#8B9A6E]/20 disabled:cursor-not-allowed disabled:opacity-60";
const textareaClassName =
  "min-h-24 w-full min-w-0 resize-y rounded-xl border border-[#D8D5C8] bg-white px-4 py-3 text-sm text-[#34382D] outline-none transition placeholder:text-[#A0A093] focus:border-[#8B9A6E] focus:ring-2 focus:ring-[#8B9A6E]/20 disabled:cursor-not-allowed disabled:opacity-60";

const statusLabels: Record<RequestStatus, string> = {
  PENDING: "Menunggu konfirmasi",
  ACCEPTED: "Request diterima",
  REJECTED: "Request ditolak",
};
const statusDescriptions: Record<RequestStatus, string> = {
  PENDING: "Request kamu sudah masuk. Silakan tunggu staf menentukan jadwal.",
  ACCEPTED: "Request kamu sudah diterima. Periksa jadwal yang telah ditentukan.",
  REJECTED: "Maaf, request kamu belum dapat kami proses.",
};
const orderStatusLabels: Record<OrderStatus, string> = {
  PESANAN_DITERIMA: "Cucian diterima",
  DICUCI: "Sedang dicuci",
  DIKERINGKAN: "Sedang dikeringkan",
  DISETRIKA: "Sedang disetrika",
  SIAP_DIAMBIL: "Siap diambil",
  SELESAI: "Laundry selesai",
  DIBATALKAN: "Order dibatalkan",
};
const orderStatusDescriptions: Record<OrderStatus, string> = {
  PESANAN_DITERIMA: "Cucian sudah diterima oleh staf dan order laundry kamu telah dibuat.",
  DICUCI: "Cucian kamu sedang dalam proses pencucian.",
  DIKERINGKAN: "Cucian kamu sedang dalam proses pengeringan.",
  DISETRIKA: "Cucian kamu sedang disetrika dan dirapikan.",
  SIAP_DIAMBIL: "Laundry kamu sudah siap. Kamu bisa mengajukan delivery jika pembayaran sudah lunas.",
  SELESAI: "Proses laundry telah selesai.",
  DIBATALKAN: "Order laundry ini telah dibatalkan. Hubungi staf untuk informasi lebih lanjut.",
};
const orderStatusSteps: OrderStatus[] = [
  "PESANAN_DITERIMA",
  "DICUCI",
  "DIKERINGKAN",
  "DISETRIKA",
  "SIAP_DIAMBIL",
  "SELESAI",
];

const isRequestStatus = (value: unknown): value is RequestStatus =>
  typeof value === "string" && ["PENDING", "ACCEPTED", "REJECTED"].includes(value);
const isRequestType = (value: unknown): value is RequestType =>
  typeof value === "string" && ["PICKUP", "DELIVERY"].includes(value);
const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(orderStatusLabels, value);
const isPaymentStatus = (value: unknown): value is PaymentStatus =>
  typeof value === "string" && ["BELUM_DIBAYAR", "SUDAH_DIBAYAR"].includes(value);
const isTrackedOrder = (value: unknown): value is TrackedOrder => {
  if (!value || typeof value !== "object") return false;
  const order = value as Partial<TrackedOrder>;
  return typeof order.orderCode === "string" && isOrderStatus(order.orderStatus) && isPaymentStatus(order.paymentStatus);
};
const isTrackedRequest = (value: unknown): value is TrackedRequest => {
  if (!value || typeof value !== "object") return false;
  const request = value as Partial<TrackedRequest>;
  return (
    typeof request.requestCode === "string" &&
    typeof request.name === "string" &&
    typeof request.phone === "string" &&
    typeof request.address === "string" &&
    isRequestStatus(request.status) &&
    isRequestType(request.type)
  );
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};
const formatScheduleDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value.slice(0, 10)
  ) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};
const formatCurrency = (value: number | string) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
};
const formatQuantity = (value: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
const getErrorMessage = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return "Gagal memeriksa data tracking. Silakan coba lagi.";
  }
  if ("response" in error) {
    const response = (error as { response?: { status?: number; data?: { message?: string } } }).response;
    if (response?.status === 404) return "Data tracking tidak ditemukan. Periksa kembali kode dan nomor telepon.";
    if (response?.data?.message) return response.data.message;
  }
  if (error instanceof Error && error.message.startsWith("Format data")) return error.message;
  return "Gagal memeriksa data tracking. Periksa koneksi dan coba lagi.";
};
const getRequestBadgeClass = (status: RequestStatus) => {
  if (status === "PENDING") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "ACCEPTED") return "border-green-200 bg-green-50 text-green-800";
  return "border-red-200 bg-red-50 text-red-800";
};
const getOrderBadgeClass = (status: OrderStatus) => {
  if (status === "DIBATALKAN") return "border-red-200 bg-red-50 text-red-800";
  if (status === "SELESAI") return "border-green-200 bg-green-50 text-green-800";
  if (status === "SIAP_DIAMBIL") return "border-blue-200 bg-blue-50 text-blue-800";
  return "border-[#D8D5C8] bg-[#F8F7F2] text-[#4B5141]";
};
const getInvoiceUnit = (unit?: string) => {
  if (unit === "KG") return "Kilogram";
  if (unit === "SATUAN") return "Satuan";
  return unit || "Unit";
};
const getPaymentMethodLabel = (method?: string) => {
  if (method === "CASH") return "Tunai";
  if (method === "TRANSFER") return "Transfer Bank";
  if (method === "QRIS") return "QRIS";
  return method || "-";
};
const getCashChange = (payment?: TrackedPayment | null) => {
  if (payment?.method !== "CASH" || payment.cashReceived == null || payment.amount == null) return null;
  const received = Number(payment.cashReceived);
  const amount = Number(payment.amount);
  if (!Number.isFinite(received) || !Number.isFinite(amount) || received < amount) return null;
  return received - amount;
};

const loadMidtransSnap = async (): Promise<MidtransSnap> => {
  if (window.snap) return window.snap;
  const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY as string | undefined;
  const isProduction = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === "true";
  if (!clientKey) throw new Error("VITE_MIDTRANS_CLIENT_KEY belum diatur di file .env frontend.");

  const scriptUrl = isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
  let script = document.querySelector<HTMLScriptElement>("script[data-laundrify-midtrans='true']");

  if (!script) {
    script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.dataset.clientKey = clientKey;
    script.dataset.laundrifyMidtrans = "true";
    document.head.appendChild(script);
  }

  if (!window.snap) {
    await new Promise<void>((resolve, reject) => {
      const currentScript = script as HTMLScriptElement;
      const onLoad = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("Gagal memuat halaman pembayaran Midtrans."));
      };
      const cleanup = () => {
        currentScript.removeEventListener("load", onLoad);
        currentScript.removeEventListener("error", onError);
      };
      currentScript.addEventListener("load", onLoad, { once: true });
      currentScript.addEventListener("error", onError, { once: true });
    });
  }

  if (!window.snap) throw new Error("Midtrans Snap belum siap. Silakan coba lagi.");
  return window.snap;
};

const printInvoice = (order: TrackedOrder) => {
  const invoiceWindow = window.open("", "_blank", "width=1000,height=800");
  if (!invoiceWindow) {
    window.alert("Invoice tidak dapat dibuka. Izinkan pop-up untuk situs Laundrify, lalu coba lagi.");
    return;
  }

  const customerName = order.customer?.name || "Customer";
  const customerPhone = order.customer?.phone || "-";
  const customerAddress = order.customer?.address || "-";
  const itemRows = (order.orderItems ?? []).map((item) => `
    <tr>
      <td><p class="service-name">${escapeHtml(item.service?.name ?? "Layanan Laundry")}</p><p class="service-unit">${escapeHtml(getInvoiceUnit(item.service?.unit))}</p></td>
      <td class="number">${escapeHtml(formatQuantity(item.quantity))}</td>
      <td class="number">${escapeHtml(formatCurrency(item.priceSnapshot))}</td>
      <td class="number amount">${escapeHtml(formatCurrency(item.subtotal))}</td>
    </tr>
  `).join("");
  const isPaid = order.paymentStatus === "SUDAH_DIBAYAR";
  const payment = order.payment;
  const cashChange = getCashChange(payment);
  const paymentDetails = payment ? `
    <div class="pay-row"><span>Metode Pembayaran</span><strong>${escapeHtml(getPaymentMethodLabel(payment.method))}</strong></div>
    <div class="pay-row"><span>Jumlah Dibayar</span><strong>${escapeHtml(formatCurrency(payment.amount))}</strong></div>
    ${payment.paidAt ? `<div class="pay-row"><span>Tanggal Pembayaran</span><strong>${escapeHtml(formatDate(payment.paidAt))}</strong></div>` : ""}
    ${payment.method === "CASH" && payment.cashReceived != null ? `<div class="pay-row"><span>Uang Tunai Diterima</span><strong>${escapeHtml(formatCurrency(payment.cashReceived))}</strong></div>` : ""}
    ${cashChange !== null ? `<div class="pay-row change"><span>Kembalian</span><strong>${escapeHtml(formatCurrency(cashChange))}</strong></div>` : ""}
  ` : `<p class="muted">${isPaid ? "Detail transaksi pembayaran belum tersedia." : "Belum ada data transaksi pembayaran."}</p>`;

  const invoiceHtml = `<!doctype html>
  <html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Invoice ${escapeHtml(order.orderCode)} - Laundrify</title>
  <style>
    *{box-sizing:border-box}html,body{margin:0;background:#F7F2EB;color:#30352A;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6}body{padding:32px 16px}.page{max-width:900px;width:100%;margin:auto}.toolbar{display:flex;justify-content:flex-end;margin-bottom:20px}.print-button{padding:11px 18px;border:0;border-radius:10px;color:#fff;background:#8B9A6E;font-weight:600;cursor:pointer}.invoice{padding:40px;border:1px solid #DED8CF;border-radius:28px;background:#fff;box-shadow:0 2px 8px rgb(48 53 42 / 4%)}.header{display:flex;flex-direction:column;justify-content:space-between;gap:24px;padding-bottom:28px;border-bottom:1px solid #EAE2D6}.brand{margin:0;font-size:26px;font-weight:600;letter-spacing:-.5px}.subtitle,.invoice-date{margin:4px 0 0;color:#73776D}.invoice-label,.label{margin:0;color:#8B9A6E;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}.invoice-code{margin:4px 0 0;overflow-wrap:anywhere;font-size:21px;font-weight:600}.metadata{display:grid;grid-template-columns:minmax(0,1fr);gap:24px;padding:28px 0;border-bottom:1px solid #EAE2D6}.label{color:#8A8D84;letter-spacing:.08em}.customer-name{margin:8px 0 0;font-size:15px;font-weight:600;overflow-wrap:anywhere}.detail{margin:5px 0 0;color:#4B5141;overflow-wrap:anywhere}.muted{color:#73776D}.items-section{padding:28px 0}.table-wrapper{overflow:hidden;border:1px solid #E2DDD5;border-radius:16px}table{width:100%;border-collapse:collapse}thead{background:#FAF8F4}th{padding:12px 10px;color:#73776D;font-size:10px;text-align:left;text-transform:uppercase;letter-spacing:.06em}td{padding:14px 10px;border-top:1px solid #E2DDD5;color:#4B5141;font-size:12px;vertical-align:top}th:first-child,td:first-child{padding-left:14px}th:last-child,td:last-child{padding-right:14px}.number{text-align:right;white-space:nowrap}.service-name{margin:0;font-weight:600;overflow-wrap:anywhere}.service-unit{margin:4px 0 0;color:#8A8D84;font-size:11px}.amount{font-weight:600;color:#30352A}.totals-section{display:flex;justify-content:flex-end;padding-bottom:28px;border-bottom:1px solid #EAE2D6}.totals{width:100%;max-width:360px}.total-row{display:flex;justify-content:space-between;gap:16px;padding:5px 0}.total-label{color:#73776D}.total-value{text-align:right;color:#4B5141;font-weight:500}.grand-total{margin-top:10px;padding:14px 16px;border-radius:12px;background:#E7ECDD}.grand-total .total-label{font-weight:600;color:#4B5141}.grand-total .total-value{font-size:18px;font-weight:600;color:#30352A}.bottom-section{display:grid;grid-template-columns:minmax(0,1fr);gap:28px;padding:28px 0}.payment-status{display:inline-block;margin-top:10px;padding:5px 10px;border:1px solid ${isPaid ? "#BBE0C4" : "#F3D79A"};border-radius:999px;color:${isPaid ? "#166534" : "#92400E"};background:${isPaid ? "#F0FDF4" : "#FFFBEB"};font-size:11px;font-weight:700}.payment-details{display:grid;gap:10px;margin-top:16px}.pay-row{display:flex;justify-content:space-between;gap:16px;font-size:12px}.pay-row span{color:#73776D}.pay-row strong{text-align:right;overflow-wrap:anywhere}.pay-row.change{margin-top:4px;padding-top:10px;border-top:1px solid #EAE2D6}.thank-you{margin:8px 0 0;color:#73776D;line-height:1.7}.footer{padding-top:18px;border-top:1px solid #EAE2D6;color:#8A8D84;font-size:11px;text-align:center}.footer p{margin:0}@media(min-width:600px){.header{flex-direction:row;align-items:flex-start}.invoice-meta,.order-information,.thank-you-section{text-align:right}.metadata,.bottom-section{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}@media(max-width:520px){body{padding:12px}.invoice{padding:22px 16px;border-radius:20px}.table-wrapper{overflow-x:auto}table{min-width:540px}}@page{size:A4;margin:14mm}@media print{html,body{padding:0;background:#fff;print-color-adjust:exact;-webkit-print-color-adjust:exact}.page{max-width:none}.toolbar{display:none!important}.invoice{padding:0;border:0;border-radius:0;box-shadow:none}.table-wrapper{overflow:visible}table{min-width:0}thead{display:table-header-group}tr,.totals-section,.bottom-section{break-inside:avoid;page-break-inside:avoid}}
  </style></head><body><main class="page"><div class="toolbar"><button class="print-button" type="button" onclick="window.print()">Print / Save PDF</button></div><article class="invoice"><header class="header"><div><p class="brand">Laundrify</p><p class="subtitle">Laundry Management System</p></div><div class="invoice-meta"><p class="invoice-label">Invoice</p><p class="invoice-code">${escapeHtml(order.orderCode)}</p><p class="invoice-date">${escapeHtml(formatDate(order.createdAt))}</p></div></header>
  <section class="metadata"><div><p class="label">Customer</p><p class="customer-name">${escapeHtml(customerName)}</p><p class="detail">${escapeHtml(customerPhone)}</p>${customerAddress !== "-" ? `<p class="detail muted">${escapeHtml(customerAddress)}</p>` : ""}</div><div class="order-information"><p class="label">Order Information</p><p class="detail">Created: ${escapeHtml(formatDate(order.createdAt))}</p><p class="detail">Due: ${escapeHtml(order.dueAt ? formatDate(order.dueAt) : "-")}</p><p class="detail">Status: ${escapeHtml(orderStatusLabels[order.orderStatus])}</p></div></section>
  <section class="items-section"><div class="table-wrapper"><table><thead><tr><th>Service</th><th class="number">Qty</th><th class="number">Price</th><th class="number">Amount</th></tr></thead><tbody>${itemRows || '<tr><td colspan="4">Rincian layanan belum tersedia.</td></tr>'}</tbody></table></div></section>
  <section class="totals-section"><div class="totals"><div class="total-row"><span class="total-label">Subtotal</span><span class="total-value">${escapeHtml(formatCurrency(order.subtotal))}</span></div><div class="total-row"><span class="total-label">Discount</span><span class="total-value">- ${escapeHtml(formatCurrency(order.discount))}</span></div><div class="total-row grand-total"><span class="total-label">Total</span><span class="total-value">${escapeHtml(formatCurrency(order.total))}</span></div></div></section>
  <section class="bottom-section"><div><p class="label">Payment Status</p><p class="payment-status">${isPaid ? "LUNAS" : "BELUM DIBAYAR"}</p><div class="payment-details">${paymentDetails}</div></div><div class="thank-you-section"><p class="label">Thank You</p><p class="thank-you">Thank you for trusting Laundrify with your laundry.</p></div></section><footer class="footer"><p>Laundrify internal management system</p></footer></article></main></body></html>`;

  invoiceWindow.document.open();
  invoiceWindow.document.write(invoiceHtml);
  invoiceWindow.document.close();
  invoiceWindow.focus();
};

function DeliveryDetails({ request }: { request: TrackedDeliveryRequest }) {
  return (
    <section className="space-y-3 rounded-xl border border-[#E7E2D7] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Status Delivery</h2>
        <Badge variant="outline" className={getRequestBadgeClass(request.status)}>{statusLabels[request.status]}</Badge>
      </div>
      <p className="text-sm leading-6 text-[#77796D]">{statusDescriptions[request.status]}</p>
      <div><p className="text-xs text-[#77796D]">Alamat pengantaran</p><p className="mt-1 break-words text-sm font-medium">{request.address}</p></div>
      {request.status === "ACCEPTED" && <div className="rounded-lg border border-green-200 bg-green-50 p-3"><p className="text-sm font-semibold text-green-900">Jadwal pengantaran</p><p className="mt-2 text-sm text-green-900">{formatScheduleDate(request.scheduledDate)}</p><p className="mt-1 text-sm text-green-900">{request.scheduledStartTime ?? "-"}–{request.scheduledEndTime ?? "-"} WIB</p></div>}
      <p className="text-xs text-[#8A8B80]">Request dibuat: {formatDate(request.createdAt)}</p>
    </section>
  );
}

function OrderDetails({ order }: { order: TrackedOrder }) {
  const cashChange = getCashChange(order.payment);
  return (
    <section className="space-y-5">
      {order.orderStatus === "DIBATALKAN" ? <div className="rounded-xl border border-red-200 bg-red-50 p-4"><h2 className="font-semibold text-red-900">Order dibatalkan</h2><p className="mt-2 text-sm leading-6 text-red-800">Silakan hubungi staf Laundrify untuk mendapatkan informasi mengenai pembatalan ini.</p></div> : <section><h2 className="mb-4 text-sm font-semibold">Progres Laundry</h2><div className="space-y-0">{orderStatusSteps.map((status, index) => {
        const currentStepIndex = orderStatusSteps.indexOf(order.orderStatus);
        const isCompleted = currentStepIndex >= 0 && index <= currentStepIndex;
        const isCurrent = status === order.orderStatus;
        const historyEntry = order.orderStatusHistories?.filter((history) => history.orderStatus === status).sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())[0];
        return <div key={status} className="flex gap-3"><div className="flex w-6 shrink-0 flex-col items-center"><div className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${isCompleted ? "border-[#8B9A6E] bg-[#8B9A6E] text-white" : "border-[#D8D5C8] bg-white text-[#A0A093]"}`}>{isCompleted ? "✓" : index + 1}</div>{index < orderStatusSteps.length - 1 && <div className={`my-1 min-h-8 w-0.5 flex-1 ${isCompleted && index < currentStepIndex ? "bg-[#8B9A6E]" : "bg-[#E7E2D7]"}`} />}</div><div className={`min-w-0 flex-1 pb-5 ${isCurrent ? "font-semibold" : ""}`}><p className={`text-sm ${isCompleted ? "text-[#34382D]" : "text-[#8A8B80]"}`}>{orderStatusLabels[status]}{isCurrent ? " · Saat ini" : ""}</p>{historyEntry && <p className="mt-1 text-xs text-[#77796D]">{formatDate(historyEntry.changedAt)}</p>}{historyEntry?.note && <p className="mt-1 break-words text-xs leading-5 text-[#77796D]">{historyEntry.note}</p>}</div></div>;
      })}</div></section>}

      <section className="space-y-3 rounded-xl bg-[#F8F7F2] p-4"><h2 className="text-sm font-semibold">Rincian Order</h2>{order.orderItems?.length ? <div className="space-y-3">{order.orderItems.map((item) => <div key={item.id} className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-medium">{item.service?.name ?? "Layanan Laundry"}</p><p className="mt-1 text-xs text-[#77796D]">{formatQuantity(item.quantity)}{item.service?.unit === "KG" ? " kg" : item.service?.unit === "SATUAN" ? " pcs" : " unit"}{" × "}{formatCurrency(item.priceSnapshot)}</p></div><p className="shrink-0 text-sm font-medium">{formatCurrency(item.subtotal)}</p></div>)}</div> : <p className="text-sm text-[#77796D]">Rincian item belum tersedia.</p>}<div className="space-y-2 border-t border-[#E7E2D7] pt-3 text-sm"><div className="flex justify-between gap-3"><span className="text-[#77796D]">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div><div className="flex justify-between gap-3"><span className="text-[#77796D]">Diskon</span><span>-{formatCurrency(order.discount)}</span></div><div className="flex justify-between gap-3 border-t border-[#E7E2D7] pt-3 font-bold"><span>Total</span><span>{formatCurrency(order.total)}</span></div></div></section>

      <section className="space-y-4 rounded-xl border border-[#E7E2D7] p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm text-[#77796D]">Status Pembayaran</span><Badge variant="outline" className={order.paymentStatus === "SUDAH_DIBAYAR" ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"}>{order.paymentStatus === "SUDAH_DIBAYAR" ? "Sudah dibayar" : "Belum dibayar"}</Badge></div>{order.payment && <div className="space-y-3 border-t border-[#E7E2D7] pt-3"><div className="flex justify-between gap-3 text-sm"><span className="text-[#77796D]">Metode Pembayaran</span><span className="text-right font-medium">{getPaymentMethodLabel(order.payment.method)}</span></div><div className="flex justify-between gap-3 text-sm"><span className="text-[#77796D]">Jumlah Dibayar</span><span className="text-right font-medium">{formatCurrency(order.payment.amount)}</span></div>{order.payment.paidAt && <div className="flex justify-between gap-3 text-sm"><span className="text-[#77796D]">Tanggal Pembayaran</span><span className="text-right font-medium">{formatDate(order.payment.paidAt)}</span></div>}{order.payment.method === "CASH" && order.payment.cashReceived != null && <div className="flex justify-between gap-3 text-sm"><span className="text-[#77796D]">Uang Tunai Diterima</span><span className="text-right font-medium">{formatCurrency(order.payment.cashReceived)}</span></div>}{cashChange !== null && <div className="flex justify-between gap-3 border-t border-[#E7E2D7] pt-3 text-sm font-semibold"><span>Kembalian</span><span>{formatCurrency(cashChange)}</span></div>}</div>}{order.paymentStatus === "SUDAH_DIBAYAR" && !order.payment && <p className="border-t border-[#E7E2D7] pt-3 text-sm leading-6 text-[#77796D]">Detail transaksi pembayaran belum tersedia.</p>}{order.dueAt && <div className="border-t border-[#E7E2D7] pt-3"><p className="text-xs text-[#77796D]">Estimasi selesai</p><p className="mt-1 text-sm font-medium">{formatDate(order.dueAt)}</p></div>}<div><p className="text-xs text-[#77796D]">Order dibuat</p><p className="mt-1 text-sm font-medium">{formatDate(order.createdAt)}</p></div></section>
    </section>
  );
}

export default function TrackPage() {
  const location = useLocation();
  const locationState = location.state as TrackLocationState | null;
  const [trackingCode, setTrackingCode] = useState(locationState?.requestCode ?? "");
  const [phone, setPhone] = useState("");
  const [trackedRequest, setTrackedRequest] = useState<TrackedRequest | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [paying, setPaying] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");

  const trackingCodeRef = useRef(trackingCode);
  const phoneRef = useRef(phone);
  const loadingRef = useRef(false);
  const deliveryLoadingRef = useRef(false);
  const searchSequenceRef = useRef(0);
  const paymentFlowRef = useRef(false);
  const snapTokenRef = useRef<{ orderCode: string; token: string } | null>(null);

  useEffect(() => { trackingCodeRef.current = trackingCode; }, [trackingCode]);
  useEffect(() => { phoneRef.current = phone; }, [phone]);

  const lookupTracking = useCallback(async () => {
    const normalizedCode = trackingCodeRef.current.trim();
    const normalizedPhone = phoneRef.current.trim();
    if (!normalizedCode || !normalizedPhone) {
      setErrorMessage("Masukkan kode order dan nomor telepon.");
      setTrackedRequest(null);
      setTrackedOrder(null);
      return;
    }
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setErrorMessage("");
    const currentSequence = ++searchSequenceRef.current;
    try {
      const response = await api.post("/tracking", { orderCode: normalizedCode, phone: normalizedPhone });
      if (currentSequence !== searchSequenceRef.current) return;
      const result = response.data?.data as TrackingResult | undefined;
      if (result?.type === "ORDER" && isTrackedOrder(result.order)) {
        setTrackedOrder(result.order);
        setTrackedRequest(null);
      } else if (result?.type === "REQUEST" && isTrackedRequest(result.request)) {
        setTrackedRequest(result.request);
        setTrackedOrder(null);
      } else {
        throw new Error("Format data tracking tidak valid.");
      }
      setLastUpdated(new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()));
    } catch (error: unknown) {
      if (currentSequence !== searchSequenceRef.current) return;
      setTrackedRequest(null);
      setTrackedOrder(null);
      setErrorMessage(getErrorMessage(error));
    } finally {
      if (currentSequence === searchSequenceRef.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const handleStatusChanged = () => {
      if (!trackingCodeRef.current.trim() || !phoneRef.current.trim()) return;
      void lookupTracking();
    };
    socket.on("pickup_delivery:status_changed", handleStatusChanged);
    socket.on("order:status_changed", handleStatusChanged);
    socket.on("payment:status_changed", handleStatusChanged);
    return () => {
      socket.off("pickup_delivery:status_changed", handleStatusChanged);
      socket.off("order:status_changed", handleStatusChanged);
      socket.off("payment:status_changed", handleStatusChanged);
    };
  }, [lookupTracking]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDeliveryMessage("");
    setPaymentMessage("");
    void lookupTracking();
  };

  const orderToDisplay = trackedRequest?.requestedForOrder ?? trackedRequest?.order ?? trackedOrder;
  const canRequestDelivery = trackedOrder?.orderStatus === "SIAP_DIAMBIL" && trackedOrder.paymentStatus === "SUDAH_DIBAYAR" && !trackedOrder.deliveryRequest;
  const deliveryRequest = orderToDisplay?.deliveryRequest ?? (trackedRequest?.type === "DELIVERY" && trackedRequest.requestedForOrder ? {
    id: trackedRequest.id,
    requestCode: trackedRequest.requestCode,
    type: trackedRequest.type,
    address: trackedRequest.address,
    status: trackedRequest.status,
    scheduledDate: trackedRequest.scheduledDate,
    scheduledStartTime: trackedRequest.scheduledStartTime,
    scheduledEndTime: trackedRequest.scheduledEndTime,
    createdAt: trackedRequest.createdAt,
    updatedAt: trackedRequest.updatedAt,
  } : null);

  const verifyPaymentStatus = useCallback(async (orderCode: string, messageIfUnpaid: string) => {
    try {
      const response = await api.post("/midtrans/customer/status", {
        orderCode,
        phone: phoneRef.current.trim(),
      });
      const data = response.data?.data as { paymentStatus?: PaymentStatus; transactionStatus?: string } | undefined;
      if (data?.paymentStatus === "SUDAH_DIBAYAR") {
        snapTokenRef.current = null;
        setPaymentMessage("Pembayaran berhasil diverifikasi. Status order sudah diperbarui.");
      } else {
        setPaymentMessage(messageIfUnpaid);
      }
      await lookupTracking();
    } catch {
      setPaymentMessage("Status pembayaran belum dapat diverifikasi. Gunakan tombol Perbarui Status untuk mencoba lagi.");
      await lookupTracking();
    } finally {
      paymentFlowRef.current = false;
      setPaying(false);
    }
  }, [lookupTracking]);

  const handlePayNow = async () => {
    if (paymentFlowRef.current || paying) return;
    if (!orderToDisplay || !phoneRef.current.trim()) {
      setPaymentMessage("Lacak order terlebih dahulu dengan nomor telepon terdaftar.");
      return;
    }
    if (orderToDisplay.paymentStatus === "SUDAH_DIBAYAR") {
      setPaymentMessage("Order ini sudah dibayar.");
      return;
    }
    if (orderToDisplay.orderStatus === "DIBATALKAN") {
      setPaymentMessage("Order yang dibatalkan tidak bisa dibayar.");
      return;
    }

    paymentFlowRef.current = true;
    setPaying(true);
    setPaymentMessage("");

    try {
      const snapClient = await loadMidtransSnap();
      let token =
        snapTokenRef.current?.orderCode === orderToDisplay.orderCode
          ? snapTokenRef.current.token
          : null;

      if (!token) {
        const response = await api.post("/midtrans/customer/create", {
          orderCode: orderToDisplay.orderCode,
          phone: phoneRef.current.trim(),
        });
        const transactionData = response.data?.data as
          | { token?: string; paymentStatus?: PaymentStatus }
          | undefined;

        if (transactionData?.paymentStatus === "SUDAH_DIBAYAR") {
          snapTokenRef.current = null;
          setPaymentMessage("Order ini sudah dibayar. Status tracking sedang diperbarui.");
          paymentFlowRef.current = false;
          setPaying(false);
          await lookupTracking();
          return;
        }

        if (typeof transactionData?.token !== "string" || !transactionData.token) {
          throw new Error("Token pembayaran Midtrans tidak ditemukan.");
        }

        token = transactionData.token;
        snapTokenRef.current = {
          orderCode: orderToDisplay.orderCode,
          token,
        };
      }

      snapClient.pay(token, {
        onSuccess: () => {
          setPaymentMessage("Pembayaran diterima oleh Midtrans. Memverifikasi status...");
          void verifyPaymentStatus(orderToDisplay.orderCode, "Pembayaran sudah dikirim, tetapi statusnya masih menunggu konfirmasi. Coba perbarui status beberapa saat lagi.");
        },
        onPending: () => {
          setPaymentMessage("Pembayaran masih menunggu penyelesaian. Status order belum dianggap lunas.");
          void verifyPaymentStatus(orderToDisplay.orderCode, "Pembayaran masih pending. Selesaikan pembayaran sesuai instruksi Midtrans, lalu perbarui status.");
        },
        onError: () => {
          void verifyPaymentStatus(orderToDisplay.orderCode, "Pembayaran belum berhasil dikonfirmasi. Kamu bisa mencoba kembali jika transaksi belum dibayar.");
        },
        onClose: () => {
          if (paymentFlowRef.current) {
            setPaymentMessage("Halaman pembayaran ditutup. Jika kamu sudah membayar, periksa status order kembali.");
            void verifyPaymentStatus(orderToDisplay.orderCode, "Halaman pembayaran ditutup. Order masih belum terkonfirmasi lunas.");
          }
        },
      });
    } catch (error: unknown) {
      paymentFlowRef.current = false;
      setPaying(false);
      setPaymentMessage(error instanceof Error ? error.message : getErrorMessage(error));
    }
  };

  const handleRequestDelivery = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (deliveryLoadingRef.current) return;
    if (!trackedOrder || !canRequestDelivery) {
      setDeliveryMessage("Order harus berstatus siap diambil, sudah dibayar, dan belum memiliki request delivery aktif.");
      return;
    }
    const normalizedAddress = deliveryAddress.trim();
    if (!normalizedAddress) {
      setDeliveryMessage("Alamat delivery wajib diisi.");
      return;
    }
    deliveryLoadingRef.current = true;
    setDeliveryLoading(true);
    setDeliveryMessage("");
    try {
      const response = await api.post("/pickup-delivery/delivery-from-order", {
        orderCode: trackedOrder.orderCode,
        phone: phoneRef.current.trim(),
        address: normalizedAddress,
      });
      const request = response.data?.data as TrackedRequest | undefined;
      if (!request || typeof request.requestCode !== "string" || !isRequestStatus(request.status) || request.type !== "DELIVERY") {
        throw new Error("Format data request delivery tidak valid.");
      }
      setDeliveryMessage(response.data?.message ?? "Request delivery berhasil dikirim. Lacak kembali menggunakan kode order yang sama.");
      setDeliveryAddress("");
      await lookupTracking();
    } catch (error: unknown) {
      setDeliveryMessage(getErrorMessage(error));
    } finally {
      deliveryLoadingRef.current = false;
      setDeliveryLoading(false);
    }
  };

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#F7F2EB] px-4 py-6 text-[#34382D] sm:py-10">
      <div className="mx-auto w-full max-w-[480px] space-y-5">
        <header className="space-y-2 pb-2">
          <Link
            to="/"
            className="inline-block text-lg font-semibold tracking-tight"
          >
            laundrify
          </Link>

          <h1 className="pt-5 text-3xl font-semibold tracking-tight">
            Lacak Laundry
          </h1>

          <p className="text-sm leading-6 text-[#77796D]">
            Pantau progres laundry dan status pembayaran menggunakan kode
            order serta nomor telepon terdaftar.
          </p>
        </header>

        <Card className="rounded-2xl border-[#E7E2D7] bg-white shadow-sm">
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Kode Order</span>
                <input
                  className={inputClassName}
                  value={trackingCode}
                  onChange={(event) => {
                    const value = event.target.value;
                    trackingCodeRef.current = value;
                    setTrackingCode(value);
                    setErrorMessage("");
                    setTrackedRequest(null);
                    setTrackedOrder(null);
                    setPaymentMessage("");
                  }}
                  placeholder="Masukkan kode order"
                  autoComplete="off"
                  maxLength={100}
                  required
                  disabled={loading || deliveryLoading || paying}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Nomor Telepon</span>
                <input
                  className={inputClassName}
                  value={phone}
                  onChange={(event) => {
                    const value = event.target.value;
                    phoneRef.current = value;
                    setPhone(value);
                    setErrorMessage("");
                    setTrackedRequest(null);
                    setTrackedOrder(null);
                    setPaymentMessage("");
                  }}
                  placeholder="Nomor telepon terdaftar"
                  type="tel"
                  autoComplete="tel"
                  maxLength={30}
                  required
                  disabled={loading || deliveryLoading || paying}
                />
              </label>

              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-xl bg-red-50 px-3 py-3 text-sm leading-5 text-red-700"
                >
                  {errorMessage}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || deliveryLoading || paying}
                className="h-12 w-full rounded-xl bg-[#8B9A6E] font-semibold text-white hover:bg-[#74835A]"
              >
                {loading ? "Memeriksa..." : "Lacak Laundry"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {paymentMessage && (
          <div
            role="status"
            className="rounded-xl bg-white px-4 py-3 text-sm leading-6 text-[#4B5141]"
          >
            {paymentMessage}
          </div>
        )}

        {deliveryMessage && (
          <div
            role="status"
            className="rounded-xl bg-white px-4 py-3 text-sm leading-6 text-[#4B5141]"
          >
            {deliveryMessage}
          </div>
        )}

        {trackedRequest && (
          <Card className="rounded-2xl border-[#E7E2D7] bg-white shadow-sm">
            <CardContent className="space-y-5 p-5">
              <div className="space-y-2">
                <p className="text-xs text-[#77796D]">Kode Request</p>
                <p className="break-all text-lg font-semibold">
                  {trackedRequest.requestCode}
                </p>
                <p className="text-sm text-[#77796D]">
                  {trackedRequest.type === "PICKUP" ? "Pickup" : "Delivery"}
                </p>
                <Badge
                  variant="outline"
                  className={getRequestBadgeClass(trackedRequest.status)}
                >
                  {statusLabels[trackedRequest.status]}
                </Badge>
                <p className="text-sm leading-6 text-[#77796D]">
                  {statusDescriptions[trackedRequest.status]}
                </p>
              </div>

              <div className="space-y-4 border-t border-[#E7E2D7] pt-4">
                <div>
                  <p className="text-xs text-[#77796D]">Nama</p>
                  <p className="mt-1 break-words text-sm font-medium">
                    {trackedRequest.name}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[#77796D]">Nomor Telepon</p>
                  <p className="mt-1 break-all text-sm font-medium">
                    {trackedRequest.phone}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[#77796D]">Alamat</p>
                  <p className="mt-1 break-words text-sm font-medium">
                    {trackedRequest.address}
                  </p>
                </div>

                {trackedRequest.service && (
                  <div>
                    <p className="text-xs text-[#77796D]">Layanan</p>
                    <p className="mt-1 text-sm font-medium">
                      {trackedRequest.service.name}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-[#77796D]">Request Dibuat</p>
                  <p className="mt-1 text-sm font-medium">
                    {formatDate(trackedRequest.createdAt)}
                  </p>
                </div>
              </div>

              {trackedRequest.status === "ACCEPTED" &&
                trackedRequest.type === "PICKUP" && (
                  <div className="rounded-xl bg-[#F1F3EB] p-4">
                    <h2 className="font-semibold">Jadwal Pickup</h2>
                    <p className="mt-2 text-sm">
                      {formatScheduleDate(trackedRequest.scheduledDate)}
                    </p>
                    <p className="mt-1 text-sm">
                      {trackedRequest.scheduledStartTime ?? "-"}–
                      {trackedRequest.scheduledEndTime ?? "-"} WIB
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        {orderToDisplay && (
          <Card className="rounded-2xl border-[#E7E2D7] bg-white shadow-sm">
            <CardContent className="space-y-6 p-5">
              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#8A8B80]">
                  Proses Laundry
                </p>

                <div>
                  <p className="break-all text-xl font-semibold">
                    {orderToDisplay.orderCode}
                  </p>
                  {orderToDisplay.customer?.name && (
                    <p className="mt-1 text-sm text-[#77796D]">
                      {orderToDisplay.customer.name}
                    </p>
                  )}
                </div>

                <Badge
                  variant="outline"
                  className={getOrderBadgeClass(orderToDisplay.orderStatus)}
                >
                  {orderStatusLabels[orderToDisplay.orderStatus]}
                </Badge>

                <p className="text-sm leading-6 text-[#77796D]">
                  {orderStatusDescriptions[orderToDisplay.orderStatus]}
                </p>

                {orderToDisplay.paymentStatus === "BELUM_DIBAYAR" &&
                  orderToDisplay.orderStatus !== "DIBATALKAN" && (
                    <Button
                      type="button"
                      onClick={() => void handlePayNow()}
                      disabled={paying || loading || deliveryLoading}
                      className="h-12 w-full rounded-xl bg-[#8B9A6E] font-semibold text-white hover:bg-[#74835A]"
                    >
                      {paying
                        ? "Membuka pembayaran..."
                        : `Bayar Sekarang · ${formatCurrency(orderToDisplay.total)}`}
                    </Button>
                  )}

                <Button
                  type="button"
                  onClick={() => printInvoice(orderToDisplay)}
                  disabled={loading || deliveryLoading || paying}
                  variant="outline"
                  className="h-11 w-full rounded-xl border-[#D8D5C8] font-medium"
                >
                  Download Invoice / Simpan sebagai PDF
                </Button>
              </section>

              <div className="border-t border-[#E7E2D7]" />

              <OrderDetails order={orderToDisplay} />

              {deliveryRequest && <DeliveryDetails request={deliveryRequest} />}

              {trackedOrder &&
                !trackedOrder.deliveryRequest &&
                canRequestDelivery && (
                  <section className="space-y-4 border-t border-[#E7E2D7] pt-5">
                    <div>
                      <h2 className="font-semibold">Request Delivery</h2>
                      <p className="mt-2 text-sm leading-6 text-[#77796D]">
                        Laundry kamu sudah siap dan pembayaran sudah lunas.
                        Masukkan alamat tujuan untuk meminta pengantaran.
                      </p>
                    </div>

                    <form
                      onSubmit={handleRequestDelivery}
                      className="space-y-3"
                    >
                      <label className="block space-y-2">
                        <span className="text-sm font-medium">
                          Alamat Tujuan
                        </span>
                        <textarea
                          className={textareaClassName}
                          value={deliveryAddress}
                          onChange={(event) => {
                            setDeliveryAddress(event.target.value);
                            setDeliveryMessage("");
                          }}
                          placeholder="Masukkan alamat lengkap"
                          maxLength={500}
                          required
                          disabled={deliveryLoading}
                        />
                      </label>

                      <Button
                        type="submit"
                        disabled={deliveryLoading || !deliveryAddress.trim()}
                        className="h-12 w-full rounded-xl bg-[#8B9A6E] font-semibold text-white hover:bg-[#74835A]"
                      >
                        {deliveryLoading
                          ? "Mengirim Request..."
                          : "Ajukan Request Delivery"}
                      </Button>
                    </form>
                  </section>
                )}

              {trackedOrder &&
                trackedOrder.orderStatus === "SIAP_DIAMBIL" &&
                trackedOrder.paymentStatus !== "SUDAH_DIBAYAR" && (
                  <p className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    Request delivery tersedia setelah pembayaran order lunas.
                  </p>
                )}
            </CardContent>
          </Card>
        )}

        {(trackedRequest || trackedOrder) && (
          <section className="space-y-3">
            <Button
              type="button"
              variant="outline"
              disabled={loading || deliveryLoading || paying}
              onClick={() => void lookupTracking()}
              className="h-11 w-full rounded-xl border-[#D8D5C8] bg-white font-medium"
            >
              {loading ? "Memperbarui..." : "Perbarui Status"}
            </Button>

            {lastUpdated && (
              <p className="text-center text-xs text-[#8A8B80]">
                Terakhir diperbarui pukul {lastUpdated}
              </p>
            )}
          </section>
        )}

        <footer className="pb-3 pt-1 text-center text-xs leading-5 text-[#8A8B80]">
          Laundrify · Simple booking, easy tracking.
        </footer>
      </div>
    </main>
  );
}
