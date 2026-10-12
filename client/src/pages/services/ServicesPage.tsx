import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Layers,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import api from "../../lib/api";
import type {
  Service,
  ServiceCategory,
  ServiceUnit,
} from "../../types";
import { serviceSchema } from "../../schemas/serviceSchema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

type StatCard = {
  label: string;
  value: number;
  description: string;
  icon: LucideIcon;
  iconClass: string;
};

const categoryLabels: Record<ServiceCategory, string> = {
  REGULER: "Regular",
  EKSPRESS: "Express",
  KHUSUS: "Special",
};

const categoryClasses: Record<ServiceCategory, string> = {
  REGULER: "border-[#E3DED5] bg-[#F3F0E9] text-[#77785F]",
  EKSPRESS: "border-[#D8E3F2] bg-[#EDF3FA] text-[#5474A2]",
  KHUSUS: "border-[#E6DCEE] bg-[#F5EDF8] text-[#886C94]",
};

const formatCurrency = (value: number | string): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const getErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    const response =
      typeof record.response === "object" && record.response !== null
        ? (record.response as Record<string, unknown>)
        : {};
    const data =
      typeof response.data === "object" && response.data !== null
        ? (response.data as Record<string, unknown>)
        : {};

    if (typeof data.message === "string") {
      return data.message;
    }

    if (typeof record.message === "string") {
      return record.message;
    }
  }

  return fallback;
};

const ServicesPage = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("ALL");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [editingService, setEditingService] =
    useState<Service | null>(null);
  const [selectedService, setSelectedService] =
    useState<Service | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] =
    useState<ServiceCategory>("REGULER");
  const [unit, setUnit] = useState<ServiceUnit>("KG");
  const [price, setPrice] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [updatingServiceId, setUpdatingServiceId] =
    useState<Service["id"] | null>(null);

  const loadServices = useCallback(async () => {
    try {
      const response = await api.get("/service");
      const serviceData = response.data.data;

      setServices(Array.isArray(serviceData) ? serviceData : []);
      setError("");
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(
          requestError,
          "Failed to load services. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      if (!cancelled) {
        void loadServices();
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loadServices]);

  const activeCount = useMemo(
    () => services.filter((service) => service.isActive).length,
    [services],
  );

  const inactiveCount = services.length - activeCount;

  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return services
      .filter((service) => {
        const matchesSearch =
          service.name.toLowerCase().includes(query) ||
          categoryLabels[service.category].toLowerCase().includes(query);

        const matchesStatus =
          statusFilter === "ALL" ||
          (statusFilter === "ACTIVE" && service.isActive) ||
          (statusFilter === "INACTIVE" && !service.isActive);

        return matchesSearch && matchesStatus;
      })
      .sort((first, second) =>
        first.name.localeCompare(second.name),
      );
  }, [services, search, statusFilter]);

  const stats: StatCard[] = [
    {
      label: "Total services",
      value: services.length,
      description: "All available service records",
      icon: Layers,
      iconClass: "bg-[#F0EEE7] text-[#77785F]",
    },
    {
      label: "Active services",
      value: activeCount,
      description: "Available for new orders",
      icon: CheckCircle2,
      iconClass: "bg-[#E8F2E8] text-[#4D7954]",
    },
    {
      label: "Inactive services",
      value: inactiveCount,
      description: "Currently unavailable",
      icon: Power,
      iconClass: "bg-[#F8F0E1] text-[#A47A39]",
    },
  ];

  const resetForm = () => {
    setName("");
    setCategory("REGULER");
    setUnit("KG");
    setPrice("");
    setEditingService(null);
    setActionError("");
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (service: Service) => {
    setEditingService(service);
    setName(service.name);
    setCategory(service.category);
    setUnit(service.unit);
    setPrice(String(service.price));
    setActionError("");
    setDialogOpen(true);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const result = serviceSchema.safeParse({
      name,
      category,
      unit,
      price: Number(price),
    });

    if (!result.success) {
      setActionError(
        result.error.issues[0]?.message ?? "Invalid service data.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setActionError("");

      if (editingService) {
        const response = await api.patch(
          `/service/${editingService.id}`,
          result.data,
        );

        setServices((currentServices) =>
          currentServices.map((service) =>
            service.id === editingService.id
              ? response.data.data
              : service,
          ),
        );
      } else {
        const response = await api.post("/service", result.data);

        setServices((currentServices) => [
          response.data.data,
          ...currentServices,
        ]);
      }

      setDialogOpen(false);
      resetForm();
    } catch (requestError: unknown) {
      setActionError(
        getErrorMessage(requestError, "Failed to save service."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (service: Service) => {
    try {
      setUpdatingServiceId(service.id);
      setActionError("");

      const response = await api.patch(`/service/${service.id}`, {
        isActive: !service.isActive,
      });

      setServices((currentServices) =>
        currentServices.map((item) =>
          item.id === service.id ? response.data.data : item,
        ),
      );
    } catch (requestError: unknown) {
      setActionError(
        getErrorMessage(
          requestError,
          "Failed to update service status.",
        ),
      );
    } finally {
      setUpdatingServiceId(null);
    }
  };

  const openDeleteDialog = (service: Service) => {
    setSelectedService(service);
    setActionError("");
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedService) return;

    try {
      setSubmitting(true);
      setActionError("");

      await api.delete(`/service/${selectedService.id}`);

      setServices((currentServices) =>
        currentServices.filter(
          (service) => service.id !== selectedService.id,
        ),
      );

      setDeleteDialogOpen(false);
      setSelectedService(null);
    } catch (requestError: unknown) {
      setActionError(
        getErrorMessage(
          requestError,
          "Failed to delete service. This service may already be used by an order.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    void loadServices();
  };

  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "ALL";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-28 rounded-full bg-[#E5DED3]" />
          <div className="h-7 w-52 rounded-lg bg-[#E5DED3]" />
          <div className="h-4 w-72 max-w-full rounded-lg bg-[#EAE4DB]" />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl border border-[#E7E0D6] bg-white"
            />
          ))}
        </div>

        <div className="h-72 animate-pulse rounded-xl border border-[#E7E0D6] bg-white" />
      </div>
    );
  }

  if (error && services.length === 0) {
    return (
      <div className="flex min-h-[45vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#FAEFED] text-[#AC665C]">
          <Layers size={22} />
        </div>

        <h2 className="font-heading text-lg font-semibold text-[#34382D]">
          Unable to load services
        </h2>

        <p className="mt-2 max-w-md text-sm leading-5 text-[#858579]">
          {error}
        </p>

        <Button
          type="button"
          onClick={handleRefresh}
          className="mt-4 h-9 gap-2 rounded-lg bg-[#788A61] px-3 text-xs font-semibold text-white hover:bg-[#64764F]"
        >
          <RefreshCw size={14} />
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#81906C]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#81906C]" />
            Service management
          </div>

          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[#34382D]">
            Services
          </h1>

          <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-[#858579]">
            Manage laundry services, categories, units, and prices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E5DED3] bg-white px-2.5 text-xs text-[#727568]">
            <CalendarDays size={14} className="text-[#81906C]" />
            <span>
              {new Intl.DateTimeFormat("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(new Date())}
            </span>
          </div>

          <Button
            type="button"
            onClick={openCreateDialog}
            className="h-9 gap-1.5 rounded-lg bg-[#788A61] px-3 text-xs font-semibold text-white shadow-sm hover:bg-[#64764F]"
          >
            <Plus size={15} />
            Add service
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card
              key={stat.label}
              className="rounded-xl border-[#E7E0D6] bg-white shadow-[0_1px_5px_rgba(52,56,45,0.025)] transition-colors hover:border-[#D7DCCF]"
            >
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex items-start justify-between gap-2.5">
                  <div>
                    <p className="text-xs font-medium text-[#777B70]">
                      {stat.label}
                    </p>

                    <p className="mt-2 font-heading text-2xl font-semibold leading-tight text-[#34382D]">
                      {stat.value}
                    </p>
                  </div>

                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${stat.iconClass}`}
                  >
                    <Icon size={17} strokeWidth={1.8} />
                  </div>
                </div>

                <p className="mt-2.5 text-[11px] leading-4 text-[#94968C]">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card className="rounded-xl border-[#E7E0D6] bg-white shadow-sm">
        <CardContent className="p-3.5 sm:p-4">
          <div className="mb-3 flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-[#81906C]" />
            <h2 className="text-[13px] font-semibold text-[#454B3A]">
              Search and filters
            </h2>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-[minmax(180px,1fr)_190px_auto]">
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#96968C]"
              />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search service or category..."
                aria-label="Search services"
                className="h-9 border-[#E3DED5] bg-[#FCFBF8] pl-9 text-xs placeholder:text-[#A1A194] focus-visible:ring-[#8B9A6E]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              aria-label="Filter services by status"
              className="h-9 w-full rounded-md border border-[#E3DED5] bg-[#FCFBF8] px-2.5 text-xs text-[#53594A] outline-none focus:ring-2 focus:ring-[#8B9A6E]/50"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <Button
              type="button"
              variant="outline"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="h-9 gap-1.5 border-[#E3DED5] px-2.5 text-xs text-[#65695D] hover:bg-[#F5F2EC] disabled:opacity-50"
            >
              <X size={13} />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#EBD6D3] bg-[#FAEFED] px-3 py-2.5">
          <p className="text-xs text-[#AC665C]">{error}</p>

          <Button
            type="button"
            onClick={handleRefresh}
            variant="outline"
            className="h-7 gap-1.5 border-[#EBD6D3] bg-white px-2.5 text-[11px] text-[#AC665C] hover:bg-[#F9E5E1]"
          >
            <RefreshCw size={12} />
            Retry
          </Button>
        </div>
      )}

      {actionError && !dialogOpen && !deleteDialogOpen && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-[#EBD6D3] bg-[#FAEFED] px-3 py-2.5">
          <p className="text-xs leading-5 text-[#AC665C]">
            {actionError}
          </p>

          <button
            type="button"
            onClick={() => setActionError("")}
            aria-label="Dismiss error"
            className="shrink-0 rounded p-0.5 text-[#AC665C] hover:bg-[#F9E5E1]"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <Card className="overflow-hidden rounded-xl border-[#E7E0D6] bg-white shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-[#EEE9E1] px-3.5 py-3 sm:px-4">
          <div>
            <CardTitle className="font-heading text-sm font-semibold text-[#34382D]">
              Service list
            </CardTitle>

            <p className="mt-1 text-[11px] text-[#858579]">
              Showing {filteredServices.length} of {services.length} services
            </p>
          </div>

          <Badge
            variant="outline"
            className="rounded-md border-[#D7DCCF] bg-[#F0F3EB] px-2 py-1 text-[10px] font-medium text-[#59694A]"
          >
            {activeCount} active
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          {filteredServices.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-4 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3F0E9] text-[#858B75]">
                <Layers size={20} />
              </div>

              <h3 className="mt-3 font-heading text-sm font-semibold text-[#454B3A]">
                {hasActiveFilters ? "No matching services" : "No services yet"}
              </h3>

              <p className="mt-1.5 max-w-sm text-xs leading-5 text-[#858579]">
                {hasActiveFilters
                  ? "Try another search term or change the status filter."
                  : "Add a service to start managing your laundry price list."}
              </p>

              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetFilters}
                  className="mt-3 h-8 gap-1.5 border-[#E3DED5] px-2.5 text-xs text-[#53594A] hover:bg-[#F5F2EC]"
                >
                  <X size={13} />
                  Clear filters
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={openCreateDialog}
                  className="mt-3 h-8 gap-1.5 bg-[#788A61] px-2.5 text-xs text-white hover:bg-[#64764F]"
                >
                  <Plus size={14} />
                  Add service
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="bg-[#FAF9F6]">
                    <th className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579] sm:px-4">
                      Service
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579]">
                      Category
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579]">
                      Unit
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579]">
                      Price
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579]">
                      Status
                    </th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579] sm:px-4">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredServices.map((service) => (
                    <tr
                      key={service.id}
                      className="border-t border-[#F0ECE5] transition-colors hover:bg-[#FCFBF8]"
                    >
                      <td className="px-3 py-3 sm:px-4">
                        <p className="max-w-[210px] truncate text-xs font-semibold text-[#454B3A]">
                          {service.name}
                        </p>

                        <p className="mt-0.5 text-[10px] text-[#96968C]">
                          ID: {service.id}
                        </p>
                      </td>

                      <td className="px-3 py-3">
                        <Badge
                          variant="outline"
                          className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-medium ${categoryClasses[service.category]}`}
                        >
                          {categoryLabels[service.category]}
                        </Badge>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3">
                        <span className="text-xs text-[#53594A]">
                          {service.unit === "KG" ? "Per kg" : "Per item"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        <span className="text-xs font-semibold tabular-nums text-[#34382D]">
                          {formatCurrency(service.price)}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <Badge
                          variant="outline"
                          className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-medium ${
                            service.isActive
                              ? "border-[#D6E7D5] bg-[#EDF5EA] text-[#4D7954]"
                              : "border-[#E3DED5] bg-[#F3F0E9] text-[#858579]"
                          }`}
                        >
                          {service.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>

                      <td className="px-3 py-3 sm:px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label={`Edit ${service.name}`}
                            title="Edit service"
                            onClick={() => openEditDialog(service)}
                            className="h-7 w-7 rounded-md border-[#E3DED5] bg-white p-0 text-[#65695D] hover:bg-[#F5F2EC]"
                          >
                            <Pencil size={12} />
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            disabled={updatingServiceId === service.id}
                            onClick={() => void handleToggleStatus(service)}
                            className="h-7 gap-1 rounded-md border-[#DDE2D4] bg-white px-2 text-[10px] text-[#65774D] hover:bg-[#F1F4EC]"
                          >
                            <Power size={11} />
                            {updatingServiceId === service.id
                              ? "Saving..."
                              : service.isActive
                                ? "Deactivate"
                                : "Activate"}
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label={`Delete ${service.name}`}
                            title="Delete service"
                            onClick={() => openDeleteDialog(service)}
                            className="h-7 w-7 rounded-md border-[#EBD6D3] bg-white p-0 text-[#AC665C] hover:bg-[#FAEFED]"
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredServices.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEE9E1] px-3.5 py-2.5 sm:px-4">
              <p className="text-[10px] text-[#96968C]">
                {filteredServices.length}{" "}
                {filteredServices.length === 1 ? "service" : "services"} displayed
              </p>

              <p className="text-[10px] text-[#96968C]">
                Sorted alphabetically
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-[420px] rounded-xl border-[#DED8CF] bg-[#FAF8F4] p-5">
          <DialogHeader>
            <DialogTitle className="font-heading text-base text-[#30352A]">
              {editingService ? "Edit service" : "Add service"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <label
                htmlFor="service-name"
                className="text-xs font-medium text-[#4B5141]"
              >
                Service name
              </label>

              <Input
                id="service-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Regular wash"
                required
                className="h-9 border-[#D8D2C9] bg-white text-xs focus-visible:ring-[#8B9A6E]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="service-category"
                  className="text-xs font-medium text-[#4B5141]"
                >
                  Category
                </label>

                <select
                  id="service-category"
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as ServiceCategory)
                  }
                  className="h-9 w-full rounded-md border border-[#D8D2C9] bg-white px-2.5 text-xs text-[#4B5141] outline-none focus:ring-2 focus:ring-[#8B9A6E]/50"
                >
                  <option value="REGULER">Regular</option>
                  <option value="EKSPRESS">Express</option>
                  <option value="KHUSUS">Special</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="service-unit"
                  className="text-xs font-medium text-[#4B5141]"
                >
                  Unit
                </label>

                <select
                  id="service-unit"
                  value={unit}
                  onChange={(event) =>
                    setUnit(event.target.value as ServiceUnit)
                  }
                  className="h-9 w-full rounded-md border border-[#D8D2C9] bg-white px-2.5 text-xs text-[#4B5141] outline-none focus:ring-2 focus:ring-[#8B9A6E]/50"
                >
                  <option value="KG">Per kg</option>
                  <option value="SATUAN">Per item</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="service-price"
                className="text-xs font-medium text-[#4B5141]"
              >
                Price (IDR)
              </label>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#858579]">
                  Rp
                </span>

                <Input
                  id="service-price"
                  type="number"
                  min="1"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="8000"
                  required
                  className="h-9 border-[#D8D2C9] bg-white pl-9 text-xs focus-visible:ring-[#8B9A6E]"
                />
              </div>
            </div>

            {actionError && (
              <p className="rounded-lg border border-[#EBD6D3] bg-[#FAEFED] px-3 py-2 text-xs leading-5 text-[#AC665C]">
                {actionError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => setDialogOpen(false)}
                className="h-8 border-[#D8D2C9] bg-white px-3 text-xs text-[#53594A] hover:bg-[#F1EEE7]"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={submitting}
                className="h-8 gap-1.5 bg-[#788A61] px-3 text-xs text-white hover:bg-[#64764F]"
              >
                {submitting ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={13} />
                )}
                {submitting
                  ? "Saving..."
                  : editingService
                    ? "Save changes"
                    : "Create service"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setSelectedService(null);
            setActionError("");
          }
        }}
      >
        <AlertDialogContent className="max-w-[400px] rounded-xl border-[#DED8CF] bg-[#FAF8F4] p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-base text-[#30352A]">
              Delete service?
            </AlertDialogTitle>
          </AlertDialogHeader>

          <p className="text-sm leading-5 text-[#53594A]">
            Delete{" "}
            <span className="font-semibold">{selectedService?.name}</span>?
          </p>

          <p className="text-xs leading-5 text-[#858579]">
            A service that is already used by an order may not be deletable.
          </p>

          {actionError && (
            <p className="rounded-lg border border-[#EBD6D3] bg-[#FAEFED] px-3 py-2 text-xs leading-5 text-[#AC665C]">
              {actionError}
            </p>
          )}

          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={submitting}
              className="mt-0 h-8 border-[#D8D2C9] bg-white px-3 text-xs text-[#53594A] hover:bg-[#F1EEE7]"
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={submitting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              className="h-8 bg-[#B85C5C] px-3 text-xs text-white hover:bg-[#A64F4F]"
            >
              {submitting ? "Deleting..." : "Delete service"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ServicesPage;
