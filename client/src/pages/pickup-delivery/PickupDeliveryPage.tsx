import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  Search,
  SlidersHorizontal,
  WashingMachine,
  X,
} from "lucide-react";
import api from "../../lib/api";
import socket from "../../lib/socket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";
type RequestType = "PICKUP" | "DELIVERY";

type LinkedOrder = {
  id: number;
  orderCode: string;
  orderStatus: string;
  paymentStatus: string;
  total: number | string;
};

type AdminRequest = {
  id: number;
  requestCode?: string;
  name: string;
  phone: string;
  address: string;
  type: RequestType;
  status: RequestStatus;
  createdAt: string;
  serviceId?: number;
  service?: {
    id?: number;
    name: string;
    category?: string;
    unit?: string;
    price?: number | string;
  };
  scheduledDate?: string | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  processedBy?: {
    id: number;
    name?: string;
  } | null;
  order?: LinkedOrder | null;
};

type Schedule = {
  date: string;
  startTime: string;
  endTime: string;
};

type StatusFilter = "ALL" | RequestStatus;
type TypeFilter = "ALL" | RequestType;

const emptySchedule: Schedule = {
  date: "",
  startTime: "",
  endTime: "",
};

const inputClassName =
  "h-9 w-full min-w-0 rounded-lg border border-[#E5DED3] bg-white px-3 text-xs text-[#34382D] outline-none transition placeholder:text-[#A6A698] focus-visible:border-[#A6B394] focus-visible:ring-2 focus-visible:ring-[#A6B394]/20";

const statusLabels: Record<RequestStatus, string> = {
  PENDING: "Menunggu",
  ACCEPTED: "Diterima",
  REJECTED: "Ditolak",
};

const statusClasses: Record<RequestStatus, string> = {
  PENDING: "bg-[#F5EBD8] text-[#A47A39]",
  ACCEPTED: "bg-[#E8F2E8] text-[#4D7954]",
  REJECTED: "bg-[#F5E4E1] text-[#AC665C]",
};

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatScheduleDate = (value: string) => {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

const formatRupiah = (value: number | string) => {
  const amount = Number(value);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
};

const getInitialSchedule = (request: AdminRequest): Schedule => ({
  date: request.scheduledDate ? request.scheduledDate.slice(0, 10) : "",
  startTime: request.scheduledStartTime ?? "",
  endTime: request.scheduledEndTime ?? "",
});

const getToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error !== "object" ||
    error === null ||
    !("response" in error)
  ) {
    return fallback;
  }

  const response = (
    error as {
      response?: {
        data?: {
          message?: string;
        };
      };
    }
  ).response;

  return response?.data?.message ?? fallback;
};

export default function PickupDeliveryPage() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [schedules, setSchedules] = useState<Record<number, Schedule>>({});
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const refreshRequests = useCallback(async () => {
    const response = await api.get("/pickup-delivery");
    const result = response.data.data;

    if (!Array.isArray(result)) {
      throw new Error("Format data request dari server tidak valid.");
    }

    const data = result as AdminRequest[];

    setRequests(data);

    setSchedules((previous) => {
      const next: Record<number, Schedule> = {};

      for (const request of data) {
        next[request.id] =
          previous[request.id] ?? getInitialSchedule(request);
      }

      return next;
    });

    setQuantities((previous) => {
      const next: Record<number, string> = {};

      for (const request of data) {
        next[request.id] = previous[request.id] ?? "1";
      }

      return next;
    });
  }, []);

  useEffect(() => {
    let active = true;

    const loadRequests = async () => {
      try {
        await refreshRequests();
      } catch {
        if (active) {
          setErrorMessage("Gagal mengambil data request.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadRequests();

    return () => {
      active = false;
    };
  }, [refreshRequests]);

  useEffect(() => {
    const handleNewRequest = () => {
      void refreshRequests().catch(() => {
        setErrorMessage("Gagal memperbarui daftar request.");
      });
    };

    const handleStatusChanged = () => {
      void refreshRequests().catch(() => {
        setErrorMessage("Gagal memperbarui daftar request.");
      });
    };

    const handleOrderStatusChanged = () => {
      void refreshRequests().catch(() => {
        setErrorMessage("Gagal memperbarui status order.");
      });
    };

    socket.on("pickup_delivery:new", handleNewRequest);
    socket.on("pickup_delivery:status_changed", handleStatusChanged);
    socket.on("order:status_changed", handleOrderStatusChanged);

    return () => {
      socket.off("pickup_delivery:new", handleNewRequest);
      socket.off("pickup_delivery:status_changed", handleStatusChanged);
      socket.off("order:status_changed", handleOrderStatusChanged);
    };
  }, [refreshRequests]);

  const filteredRequests = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesSearch =
        !keyword ||
        request.name.toLowerCase().includes(keyword) ||
        request.phone.toLowerCase().includes(keyword) ||
        request.address.toLowerCase().includes(keyword) ||
        (request.requestCode ?? "").toLowerCase().includes(keyword) ||
        (request.service?.name ?? "").toLowerCase().includes(keyword) ||
        (request.order?.orderCode ?? "").toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" || request.status === statusFilter;

      const matchesType =
        typeFilter === "ALL" || request.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [requests, search, statusFilter, typeFilter]);

  const stats = useMemo(
    () => [
      {
        label: "Total Requests",
        value: requests.length,
        description: "Semua permintaan yang tercatat",
      },
      {
        label: "Menunggu",
        value: requests.filter((item) => item.status === "PENDING").length,
        description: "Perlu ditindaklanjuti",
      },
      {
        label: "Diterima",
        value: requests.filter((item) => item.status === "ACCEPTED").length,
        description: "Jadwal telah dikonfirmasi",
      },
      {
        label: "Ditolak",
        value: requests.filter((item) => item.status === "REJECTED").length,
        description: "Permintaan yang ditolak",
      },
    ],
    [requests],
  );

  const updateSchedule = (
    requestId: number,
    field: keyof Schedule,
    value: string,
  ) => {
    setSchedules((previous) => ({
      ...previous,
      [requestId]: {
        ...(previous[requestId] ?? emptySchedule),
        [field]: value,
      },
    }));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setErrorMessage("");

    try {
      await refreshRequests();
    } catch {
      setErrorMessage("Gagal memperbarui daftar request.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleStatusUpdate = async (
    request: AdminRequest,
    status: Exclude<RequestStatus, "PENDING">,
  ) => {
    if (processingIds.has(request.id)) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    const schedule = schedules[request.id] ?? emptySchedule;

    if (status === "ACCEPTED") {
      if (!schedule.date || !schedule.startTime || !schedule.endTime) {
        setErrorMessage(
          `Lengkapi tanggal dan jam ${request.type === "PICKUP" ? "pickup" : "delivery"} untuk request ${request.name}.`,
        );
        return;
      }

      if (schedule.date < getToday()) {
        setErrorMessage("Tanggal jadwal tidak boleh di masa lalu.");
        return;
      }

      if (schedule.endTime <= schedule.startTime) {
        setErrorMessage("Jam selesai harus lebih akhir dari jam mulai.");
        return;
      }
    }

    setProcessingIds((previous) => new Set(previous).add(request.id));

    try {
      const payload =
        status === "ACCEPTED"
          ? {
              status,
              scheduledDate: schedule.date,
              scheduledStartTime: schedule.startTime,
              scheduledEndTime: schedule.endTime,
            }
          : { status };

      await api.patch(`/pickup-delivery/${request.id}/status`, payload);

      setSuccessMessage(
        status === "ACCEPTED"
          ? `Request ${request.name} berhasil diterima dan dijadwalkan.`
          : `Request ${request.name} berhasil ditolak.`,
      );

      await refreshRequests();
    } catch (error: unknown) {
      setErrorMessage(
        getErrorMessage(
          error,
          "Request gagal diproses. Silakan coba lagi.",
        ),
      );
    } finally {
      setProcessingIds((previous) => {
        const next = new Set(previous);
        next.delete(request.id);
        return next;
      });
    }
  };

  const handleReceiveLaundry = async (request: AdminRequest) => {
    if (processingIds.has(request.id)) {
      return;
    }

    if (request.type !== "PICKUP") {
      setErrorMessage(
        "Hanya request pickup yang dapat membuat order baru.",
      );
      return;
    }

    if (request.status !== "ACCEPTED") {
      setErrorMessage(
        "Hanya request yang sudah diterima yang bisa diproses.",
      );
      return;
    }

    if (request.order) {
      setErrorMessage("Order untuk request ini sudah dibuat.");
      return;
    }

    const rawQuantity = quantities[request.id] ?? "1";
    const quantity = Number(rawQuantity);

    if (
      !rawQuantity.trim() ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      setErrorMessage(
        "Masukkan jumlah cucian yang valid dan lebih dari 0.",
      );
      return;
    }

    if (
      request.service?.unit === "SATUAN" &&
      !Number.isInteger(quantity)
    ) {
      setErrorMessage(
        "Jumlah untuk layanan satuan harus berupa bilangan bulat.",
      );
      return;
    }

    const unitLabel =
      request.service?.unit === "SATUAN" ? "pcs" : "kg";

    const confirmed = window.confirm(
      `Konfirmasi cucian diterima?\n\nCustomer: ${request.name}\nLayanan: ${request.service?.name ?? "-"}\nJumlah: ${quantity} ${unitLabel}\n\nOrder akan dibuat dan mulai diproses.`,
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setProcessingIds((previous) => new Set(previous).add(request.id));

    try {
      const response = await api.post(
        `/pickup-delivery/${request.id}/receive`,
        { quantity },
      );

      const order = response.data.data as LinkedOrder;

      setSuccessMessage(
        `Cucian ${request.name} berhasil diterima. Order ${order.orderCode} berhasil dibuat.`,
      );

      await refreshRequests();
    } catch (error: unknown) {
      setErrorMessage(
        getErrorMessage(
          error,
          "Gagal menerima cucian dan membuat order. Silakan coba lagi.",
        ),
      );

      await refreshRequests().catch(() => undefined);
    } finally {
      setProcessingIds((previous) => {
        const next = new Set(previous);
        next.delete(request.id);
        return next;
      });
    }
  };

  const hasActiveFilters =
    search !== "" ||
    statusFilter !== "ALL" ||
    typeFilter !== "ALL";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
  };

  if (loading) {
    return (
      <div className="space-y-5 pb-6">
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-32 rounded-full bg-[#E5DED3]" />
          <div className="h-7 w-56 rounded-lg bg-[#E5DED3]" />
          <div className="h-4 w-80 max-w-full rounded-lg bg-[#EAE4DB]" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl border border-[#E7E0D6] bg-white"
            />
          ))}
        </div>

        <div className="h-24 animate-pulse rounded-xl border border-[#E7E0D6] bg-white" />
        <div className="h-64 animate-pulse rounded-xl border border-[#E7E0D6] bg-white" />
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
            Pickup & Delivery
          </h1>

          <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-[#858579]">
            Manage customer requests, schedules, and laundry intake.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => void handleRefresh()}
          disabled={refreshing}
          className="h-9 w-fit rounded-lg border-[#E5DED3] bg-white px-2.5 text-xs font-medium text-[#53594A] transition hover:bg-[#F4F0E9]"
        >
          <RefreshCw
            size={13}
            className={`mr-1.5 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-[#EED8D3] bg-[#FFF5F2] px-3.5 py-3 text-xs leading-5 text-[#AC665C]"
        >
          <p>{errorMessage}</p>
          <button
            type="button"
            aria-label="Tutup pesan error"
            onClick={() => setErrorMessage("")}
            className="shrink-0 rounded p-0.5 transition hover:bg-[#FCE9E5]"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-lg border border-[#D9E5D2] bg-[#F1F6ED] px-3.5 py-3 text-xs leading-5 text-[#53734F]"
        >
          <p>{successMessage}</p>
          <button
            type="button"
            aria-label="Tutup pesan sukses"
            onClick={() => setSuccessMessage("")}
            className="shrink-0 rounded p-0.5 transition hover:bg-[#E3EEDD]"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="min-w-0 rounded-xl border border-[#E7E0D6] bg-white p-3.5 shadow-[0_1px_5px_rgba(52,56,45,0.025)] sm:p-4"
          >
            <p className="text-xs font-medium text-[#777B70]">
              {stat.label}
            </p>

            <p className="mt-2 font-heading text-2xl font-semibold leading-tight tracking-tight text-[#34382D]">
              {stat.value}
            </p>

            <p className="mt-2.5 text-[11px] leading-4 text-[#94968C]">
              {stat.description}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-[#E7E0D6] bg-white p-3.5 sm:p-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-[#81906C]" />
          <h2 className="font-heading text-sm font-semibold text-[#34382D]">
            Search & filters
          </h2>
        </div>

        <div className="mt-3.5 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
          <div className="relative min-w-0">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#969789]"
            />
            <Input
              aria-label="Cari request"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, phone, code, service..."
              className="h-9 rounded-lg border-[#E5DED3] pl-9 text-xs placeholder:text-[#A6A698] focus-visible:ring-[#A6B394]"
            />
          </div>

          <select
            aria-label="Filter status"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
            className={inputClassName}
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Menunggu</option>
            <option value="ACCEPTED">Diterima</option>
            <option value="REJECTED">Ditolak</option>
          </select>

          <select
            aria-label="Filter jenis request"
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value as TypeFilter)
            }
            className={inputClassName}
          >
            <option value="ALL">All request types</option>
            <option value="PICKUP">Pickup</option>
            <option value="DELIVERY">Delivery</option>
          </select>
        </div>

        {hasActiveFilters && (
          <div className="mt-2.5 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={resetFilters}
              className="h-8 rounded-lg px-2.5 text-xs text-[#737967] hover:bg-[#F4F0E9]"
            >
              Reset filters
            </Button>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-heading text-sm font-semibold text-[#34382D]">
              Customer requests
            </h2>
            <p className="mt-1 text-[11px] text-[#858579]">
              Review and process incoming pickup and delivery requests.
            </p>
          </div>

          <p className="text-xs text-[#929385]">
            Showing {filteredRequests.length} of {requests.length} requests
          </p>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-[#E7E0D6] bg-white px-4 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4F0E9] text-[#969889]">
              <ClipboardList size={19} />
            </div>

            <p className="mt-3 text-xs font-semibold text-[#53594A]">
              No requests found
            </p>

            <p className="mt-1 max-w-sm text-[11px] leading-5 text-[#858579]">
              {hasActiveFilters
                ? "Try adjusting your search or filters."
                : "New customer requests will appear here."}
            </p>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                onClick={resetFilters}
                className="mt-3 h-8 rounded-lg border-[#E5DED3] px-3 text-xs"
              >
                Reset filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((request) => {
              const schedule = schedules[request.id] ?? emptySchedule;
              const isProcessing = processingIds.has(request.id);
              const quantity = quantities[request.id] ?? "1";
              const unitLabel =
                request.service?.unit === "SATUAN" ? "pcs" : "kg";

              return (
                <article
                  key={request.id}
                  className="min-w-0 overflow-hidden rounded-xl border border-[#E7E0D6] bg-white transition-colors hover:border-[#D7DCCF]"
                >
                  <div className="space-y-4 p-3.5 sm:p-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-[#34382D]">
                            {request.name}
                          </h3>

                          <span
                            className={`inline-flex rounded-md px-2 py-1 text-[10px] font-medium ${statusClasses[request.status]}`}
                          >
                            {statusLabels[request.status]}
                          </span>

                          <span className="inline-flex rounded-md bg-[#F1EEE6] px-2 py-1 text-[10px] font-medium text-[#81765A]">
                            {request.type === "PICKUP" ? "Pickup" : "Delivery"}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-col gap-1.5 text-xs leading-5 text-[#73776B] sm:flex-row sm:flex-wrap sm:gap-x-4">
                          <span className="break-all">{request.phone}</span>
                          <span className="break-words">{request.address}</span>
                        </div>
                      </div>

                      <div className="shrink-0 sm:text-right">
                        <p className="text-[10px] text-[#96968C]">
                          Request date
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-[#53594A]">
                          {formatDate(request.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 rounded-lg bg-[#FAF9F6] p-3 sm:grid-cols-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579]">
                          Request code
                        </p>
                        <p className="mt-1.5 break-all text-xs font-semibold text-[#454B3A]">
                          {request.requestCode ?? "-"}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579]">
                          Service
                        </p>
                        <p className="mt-1.5 break-words text-xs font-semibold text-[#454B3A]">
                          {request.service?.name ?? "Service unavailable"}
                        </p>

                        {(request.service?.category ||
                          request.service?.unit) && (
                          <p className="mt-1 text-[11px] text-[#858579]">
                            {request.service.category ?? ""}
                            {request.service.category && request.service.unit
                              ? " · "
                              : ""}
                            {request.service.unit ?? ""}
                          </p>
                        )}

                        {request.service?.price !== undefined && (
                          <p className="mt-1 text-[11px] text-[#73776B]">
                            {formatRupiah(request.service.price)}
                            {request.service.unit === "SATUAN"
                              ? " / pcs"
                              : " / kg"}
                          </p>
                        )}
                      </div>
                    </div>

                    {request.status === "PENDING" && (
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-xs font-semibold text-[#34382D]">
                            Schedule{" "}
                            {request.type === "PICKUP" ? "pickup" : "delivery"}
                          </h4>
                          <p className="mt-1 text-[11px] leading-5 text-[#858579]">
                            Set the date and time range before accepting this
                            request.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                          <label className="min-w-0 space-y-1">
                            <span className="block text-[11px] font-medium text-[#73776B]">
                              Date
                            </span>
                            <Input
                              type="date"
                              min={getToday()}
                              value={schedule.date}
                              disabled={isProcessing}
                              onChange={(event) =>
                                updateSchedule(
                                  request.id,
                                  "date",
                                  event.target.value,
                                )
                              }
                              className="h-9 rounded-lg border-[#E5DED3] text-xs focus-visible:ring-[#A6B394]"
                            />
                          </label>

                          <label className="min-w-0 space-y-1">
                            <span className="block text-[11px] font-medium text-[#73776B]">
                              Start time
                            </span>
                            <Input
                              type="time"
                              value={schedule.startTime}
                              disabled={isProcessing}
                              onChange={(event) =>
                                updateSchedule(
                                  request.id,
                                  "startTime",
                                  event.target.value,
                                )
                              }
                              className="h-9 rounded-lg border-[#E5DED3] text-xs focus-visible:ring-[#A6B394]"
                            />
                          </label>

                          <label className="min-w-0 space-y-1">
                            <span className="block text-[11px] font-medium text-[#73776B]">
                              End time
                            </span>
                            <Input
                              type="time"
                              value={schedule.endTime}
                              disabled={isProcessing}
                              onChange={(event) =>
                                updateSchedule(
                                  request.id,
                                  "endTime",
                                  event.target.value,
                                )
                              }
                              className="h-9 rounded-lg border-[#E5DED3] text-xs focus-visible:ring-[#A6B394]"
                            />
                          </label>
                        </div>

                        <div className="flex flex-col-reverse gap-2 border-t border-[#EEE9E1] pt-3 sm:flex-row sm:justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isProcessing}
                            className="h-9 rounded-lg border-[#E8D5D0] px-3 text-xs font-medium text-[#AC665C] hover:bg-[#FFF5F2]"
                            onClick={() =>
                              void handleStatusUpdate(request, "REJECTED")
                            }
                          >
                            Reject request
                          </Button>

                          <Button
                            type="button"
                            disabled={isProcessing}
                            className="h-9 rounded-lg bg-[#788A61] px-3 text-xs font-medium text-white hover:bg-[#64764F]"
                            onClick={() =>
                              void handleStatusUpdate(request, "ACCEPTED")
                            }
                          >
                            {isProcessing
                              ? "Processing..."
                              : "Accept & schedule"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {request.status === "ACCEPTED" && (
                      <div className="space-y-3">
                        <div className="flex flex-col justify-between gap-3 rounded-lg border border-[#DDE7D6] bg-[#F5F8F1] p-3 sm:flex-row sm:items-center">
                          <div>
                            <p className="text-xs font-semibold text-[#53734F]">
                              Confirmed schedule
                            </p>
                            <p className="mt-1.5 text-[11px] text-[#63765A]">
                              {formatScheduleDate(request.scheduledDate ?? "")}
                              {" · "}
                              {request.scheduledStartTime ?? "-"}–
                              {request.scheduledEndTime ?? "-"}
                            </p>
                          </div>

                          <Badge
                            variant="outline"
                            className="w-fit rounded-md border-[#D9E5D2] bg-white px-2 py-1 text-[10px] font-medium text-[#53734F]"
                          >
                            <CheckCircle2 size={12} className="mr-1" />
                            Confirmed
                          </Badge>
                        </div>

                        {request.type === "DELIVERY" ? (
                          <div className="rounded-lg border border-[#E7E0D6] p-3">
                            <p className="text-xs font-semibold text-[#34382D]">
                              Delivery confirmed
                            </p>
                            <p className="mt-1 text-[11px] leading-5 text-[#858579]">
                              Laundry is scheduled to be delivered to the
                              customer address.
                            </p>

                            {request.order && (
                              <div className="mt-3 flex flex-col justify-between gap-2 border-t border-[#EEE9E1] pt-3 sm:flex-row sm:items-center">
                                <div>
                                  <p className="text-[10px] text-[#858579]">
                                    Order code
                                  </p>
                                  <p className="mt-1 break-all text-xs font-semibold text-[#454B3A]">
                                    {request.order.orderCode}
                                  </p>
                                  <p className="mt-1 text-xs font-semibold text-[#34382D]">
                                    {formatRupiah(request.order.total)}
                                  </p>
                                </div>

                                <span className="w-fit rounded-md bg-[#E8F2E8] px-2 py-1 text-[10px] font-medium text-[#4D7954]">
                                  {request.order.orderStatus.replaceAll(
                                    "_",
                                    " ",
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : request.order ? (
                          <div className="rounded-lg border border-[#E7E0D6] p-3">
                            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                              <div>
                                <p className="text-xs font-semibold text-[#34382D]">
                                  Order created
                                </p>
                                <p className="mt-1 break-all text-xs font-semibold text-[#65774D]">
                                  {request.order.orderCode}
                                </p>
                                <p className="mt-1 text-xs text-[#73776B]">
                                  Total: {formatRupiah(request.order.total)}
                                </p>
                              </div>

                              <span className="w-fit rounded-md bg-[#E8F2E8] px-2 py-1 text-[10px] font-medium text-[#4D7954]">
                                {request.order.orderStatus.replaceAll(
                                  "_",
                                  " ",
                                )}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3 rounded-lg border border-[#E7E0D6] p-3">
                            <div>
                              <h4 className="text-xs font-semibold text-[#34382D]">
                                Receive laundry & create order
                              </h4>
                              <p className="mt-1 text-[11px] leading-5 text-[#858579]">
                                Enter the actual laundry quantity after the
                                clothes have been received. The order will be
                                created after confirmation.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                              <label className="min-w-0 space-y-1">
                                <span className="block text-[11px] font-medium text-[#73776B]">
                                  Laundry quantity ({unitLabel})
                                </span>
                                <Input
                                  type="number"
                                  min="0.01"
                                  step={
                                    request.service?.unit === "SATUAN"
                                      ? "1"
                                      : "0.01"
                                  }
                                  value={quantity}
                                  disabled={isProcessing}
                                  onChange={(event) =>
                                    setQuantities((previous) => ({
                                      ...previous,
                                      [request.id]: event.target.value,
                                    }))
                                  }
                                  className="h-9 rounded-lg border-[#E5DED3] text-xs focus-visible:ring-[#A6B394]"
                                />
                              </label>

                              <Button
                                type="button"
                                disabled={isProcessing}
                                className="h-9 rounded-lg bg-[#788A61] px-3 text-xs font-medium text-white hover:bg-[#64764F]"
                                onClick={() =>
                                  void handleReceiveLaundry(request)
                                }
                              >
                                {isProcessing
                                  ? "Processing..."
                                  : "Receive laundry & create order"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {request.status === "REJECTED" && (
                      <div className="rounded-lg border border-[#EED8D3] bg-[#FFF5F2] px-3 py-2.5 text-xs text-[#AC665C]">
                        This request has been rejected.
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {filteredRequests.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEE9E1] pt-3 text-[10px] text-[#96968C]">
          <span>{filteredRequests.length} requests displayed</span>
          <span className="flex items-center gap-1.5">
            <WashingMachine size={12} />
            Laundrify operations
          </span>
        </div>
      )}
    </div>
  );
}