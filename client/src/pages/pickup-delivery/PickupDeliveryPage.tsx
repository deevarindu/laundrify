import { useEffect, useMemo, useState } from "react";

import api from "../../lib/api";
import socket from "../../lib/socket";

import type {
  PickupDeliveryRequest,
  PickupDeliveryStatus,
} from "@/types";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type StatusFilter = "ALL" | PickupDeliveryStatus;

type TypeFilter = "ALL" | "PICKUP" | "DELIVERY";

const PickupDeliveryPage = () => {
  const [requests, setRequests] = useState<PickupDeliveryRequest[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] =
    useState<TypeFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] =
    useState<number | null>(null);
  const [error, setError] = useState("");

  const loadRequests = async () => {
    try {
      setError("");

      const response = await api.get("/pickup-delivery");

      setRequests(response.data.data);
    } catch (error) {
      console.error(error);

      setError(
        "Failed to load pickup/delivery requests."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchRequests = async () => {
      await loadRequests();
    };

    fetchRequests();
  }, []);

  useEffect(() => {
    const handleNewRequest = () => {
      loadRequests();
    };

    const handleStatusChanged = () => {
      loadRequests();
    };

    socket.on(
      "pickup_delivery:new",
      handleNewRequest
    );

    socket.on(
      "pickup_delivery:status_changed",
      handleStatusChanged
    );

    return () => {
      socket.off(
        "pickup_delivery:new",
        handleNewRequest
      );

      socket.off(
        "pickup_delivery:status_changed",
        handleStatusChanged
      );
    };
  }, []);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search
      .toLowerCase()
      .trim();

    return requests.filter((request) => {
      const matchesSearch =
        request.name
          .toLowerCase()
          .includes(normalizedSearch) ||
        request.phone
          .toLowerCase()
          .includes(normalizedSearch) ||
        request.address
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" ||
        request.status === statusFilter;

      const matchesType =
        typeFilter === "ALL" ||
        request.type === typeFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType
      );
    });
  }, [
    requests,
    search,
    statusFilter,
    typeFilter,
  ]);

  const pendingCount = useMemo(() => {
    return requests.filter(
      (request) => request.status === "PENDING"
    ).length;
  }, [requests]);

  const acceptedCount = useMemo(() => {
    return requests.filter(
      (request) => request.status === "ACCEPTED"
    ).length;
  }, [requests]);

  const rejectedCount = useMemo(() => {
    return requests.filter(
      (request) => request.status === "REJECTED"
    ).length;
  }, [requests]);

  const updateStatus = async (
    id: number,
    status: "ACCEPTED" | "REJECTED"
  ) => {
    try {
      setProcessingId(id);
      setError("");

      await api.patch(
        `/pickup-delivery/${id}/status`,
        { status }
      );

      await loadRequests();
    } catch (error) {
      console.error(error);

      const message =
        (
          error as {
            response?: {
              data?: {
                message?: string;
              };
            };
          }
        )?.response?.data?.message ??
        "Failed to update request.";

      setError(message);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (value: string) => {
    return new Date(value).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeLabel = (
    type: PickupDeliveryRequest["type"]
  ) => {
    return type === "PICKUP"
      ? "Pickup"
      : "Delivery";
  };

  const getStatusLabel = (
    status: PickupDeliveryStatus
  ) => {
    const labels: Record<
      PickupDeliveryStatus,
      string
    > = {
      PENDING: "Pending",
      ACCEPTED: "Accepted",
      REJECTED: "Rejected",
    };

    return labels[status];
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#F7F2EB]">
        <p className="text-sm text-[#73776D]">
          Loading requests...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-8 bg-[#F7F2EB]">
      <section className="rounded-3xl bg-[#8B9A6E] px-6 py-7 text-white shadow-sm md:px-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">
            Request Management
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Pickup & Delivery
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
            Manage customer pickup and delivery requests.
          </p>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-[#E3B7B7] bg-[#FFF4F4] px-5 py-4">
          <p className="text-sm text-[#B85C5C]">
            {error}
          </p>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="border-[#DED8CF] bg-[#EAE2D6] shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-[#73776D]">
              Pending
            </p>

            <p className="mt-3 text-3xl font-semibold text-[#4B5141]">
              {pendingCount}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#DED8CF] bg-[#E7ECDD] shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-[#73776D]">
              Accepted
            </p>

            <p className="mt-3 text-3xl font-semibold text-[#4B5141]">
              {acceptedCount}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#DED8CF] bg-white shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-[#73776D]">
              Rejected
            </p>

            <p className="mt-3 text-3xl font-semibold text-[#4B5141]">
              {rejectedCount}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-[#DED8CF] bg-white shadow-sm">
        <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4]">
          <CardTitle className="text-base font-semibold text-[#4B5141]">
            Filters
          </CardTitle>
        </CardHeader>

        <CardContent className="p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search name, phone, or address..."
              className="border-[#D8D2C9] bg-[#FAF8F4] focus-visible:ring-[#8B9A6E]"
            />

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value as TypeFilter
                )
              }
              className="h-10 rounded-md border border-[#D8D2C9] bg-[#FAF8F4] px-3 py-2 text-sm text-[#4B5141] outline-none focus:ring-2 focus:ring-[#8B9A6E]"
            >
              <option value="ALL">
                All Request Types
              </option>

              <option value="PICKUP">
                Pickup
              </option>

              <option value="DELIVERY">
                Delivery
              </option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as StatusFilter
                )
              }
              className="h-10 rounded-md border border-[#D8D2C9] bg-[#FAF8F4] px-3 py-2 text-sm text-[#4B5141] outline-none focus:ring-2 focus:ring-[#8B9A6E]"
            >
              <option value="ALL">
                All Status
              </option>

              <option value="PENDING">
                Pending
              </option>

              <option value="ACCEPTED">
                Accepted
              </option>

              <option value="REJECTED">
                Rejected
              </option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-[#DED8CF] bg-white shadow-sm">
        <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4]">
          <CardTitle className="text-base font-semibold text-[#4B5141]">
            Requests
          </CardTitle>

          <p className="text-xs text-[#73776D]">
            {filteredRequests.length} request
            {filteredRequests.length !== 1
              ? "s"
              : ""}{" "}
            found
          </p>
        </CardHeader>

        <CardContent className="p-4 md:p-6">
          {filteredRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D8D2C9] bg-[#FAF8F4] px-6 py-10 text-center">
              <p className="text-sm text-[#73776D]">
                No pickup or delivery requests found.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-2xl border border-[#E2DDD5] bg-[#FDFCFA] p-4"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[#30352A]">
                          {request.name}
                        </p>

                        <Badge className="border-0 bg-[#EAE2D6] px-2 py-0.5 text-[11px] text-[#4B5141] hover:bg-[#EAE2D6]">
                          {getTypeLabel(request.type)}
                        </Badge>

                        <Badge
                          className={
                            request.status === "PENDING"
                              ? "border-0 bg-[#EAE2D6] px-2 py-0.5 text-[11px] text-[#4B5141] hover:bg-[#EAE2D6]"
                              : request.status === "ACCEPTED"
                                ? "border-0 bg-[#8B9A6E] px-2 py-0.5 text-[11px] text-white hover:bg-[#8B9A6E]"
                                : "border-0 bg-[#B85C5C] px-2 py-0.5 text-[11px] text-white hover:bg-[#B85C5C]"
                          }
                        >
                          {getStatusLabel(request.status)}
                        </Badge>
                      </div>

                      <div className="mt-3 space-y-1">
                        <p className="text-sm text-[#4B5141]">
                          {request.phone}
                        </p>

                        <p className="text-sm text-[#73776D]">
                          {request.address}
                        </p>

                        <p className="text-xs text-[#8A8D84]">
                          {formatDate(request.createdAt)}
                        </p>
                      </div>
                    </div>

                    {request.status === "PENDING" && (
                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={
                            processingId === request.id
                          }
                          onClick={() =>
                            updateStatus(
                              request.id,
                              "REJECTED"
                            )
                          }
                          variant="outline"
                          className="border-[#E3B7B7] bg-[#FFF4F4] text-[#B85C5C] hover:bg-[#FDE8E8]"
                        >
                          Reject
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          disabled={
                            processingId === request.id
                          }
                          onClick={() =>
                            updateStatus(
                              request.id,
                              "ACCEPTED"
                            )
                          }
                          className="bg-[#8B9A6E] text-white hover:bg-[#74835A]"
                        >
                          Accept
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PickupDeliveryPage;