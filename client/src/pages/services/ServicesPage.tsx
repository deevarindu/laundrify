import { useEffect, useState, type SubmitEvent } from "react";
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
  DialogTrigger,
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
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const ServicesPage = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("ALL");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] =
    useState(false);

  const [editingService, setEditingService] =
    useState<Service | null>(null);

  const [selectedService, setSelectedService] =
    useState<Service | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] =
    useState<ServiceCategory>("REGULER");
  const [unit, setUnit] =
    useState<ServiceUnit>("KG");
  const [price, setPrice] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const response = await api.get("/service");

        if (cancelled) {
          return;
        }

        setServices(response.data.data);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(error);
        setError("Failed to load services data.");
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
  }, []);

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
    event: SubmitEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const parsedPrice = Number(price);

    const result = serviceSchema.safeParse({
      name,
      category,
      unit,
      price: parsedPrice,
    });

    if (!result.success) {
      setActionError(
        result.error.issues[0]?.message ??
          "Invalid service data."
      );
      return;
    }

    try {
      setSubmitting(true);
      setActionError("");

      if (editingService) {
        const response = await api.patch(
          `/service/${editingService.id}`,
          result.data
        );

        setServices((currentServices) =>
          currentServices.map((service) =>
            service.id === editingService.id
              ? response.data.data
              : service
          )
        );
      } else {
        const response = await api.post(
          "/service",
          result.data
        );

        setServices((currentServices) => [
          response.data.data,
          ...currentServices,
        ]);
      }

      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      setActionError("Failed to save service.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (
    service: Service
  ) => {
    try {
      const response = await api.patch(
        `/service/${service.id}`,
        {
          isActive: !service.isActive,
        }
      );

      setServices((currentServices) =>
        currentServices.map((item) =>
          item.id === service.id
            ? response.data.data
            : item
        )
      );
    } catch (error) {
      console.error(error);
      setError("Failed to update service status.");
    }
  };

  const openDeleteDialog = (service: Service) => {
    setSelectedService(service);
    setActionError("");
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedService) {
      return;
    }

    try {
      setSubmitting(true);
      setActionError("");

      await api.delete(
        `/service/${selectedService.id}`
      );

      setServices((currentServices) =>
        currentServices.filter(
          (service) =>
            service.id !== selectedService.id
        )
      );

      setDeleteDialogOpen(false);
      setSelectedService(null);
    } catch (error) {
      console.error(error);
      setActionError(
        "Failed to delete service. This service may already be used by an order."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredServices = services.filter(
    (service) => {
      const matchesSearch = service.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" &&
          service.isActive) ||
        (statusFilter === "INACTIVE" &&
          !service.isActive);

      return matchesSearch && matchesStatus;
    }
  );

  const activeCount = services.filter(
    (service) => service.isActive
  ).length;

  const inactiveCount =
    services.length - activeCount;

  const categoryGroups: {
    category: ServiceCategory;
    label: string;
  }[] = [
    {
      category: "REGULER",
      label: "Regular",
    },
    {
      category: "EKSPRESS",
      label: "Express",
    },
    {
      category: "KHUSUS",
      label: "Another",
    },
  ];

  const formatCurrency = (
    value: number | string
  ) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value));
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#F7F2EB]">
        <p className="text-sm text-[#73776D]">
          Loading services...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#DED8CF] bg-white p-6">
        <p className="text-sm text-[#B85C5C]">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-8 bg-[#F7F2EB]">
      <section className="rounded-3xl bg-[#8B9A6E] px-6 py-7 text-white shadow-sm md:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">
              Services Management
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Services
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
              Manage laundry services, categories, units, and prices.
            </p>
          </div>

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);

              if (!open) {
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                onClick={openCreateDialog}
                className="bg-white text-[#4B5141] hover:bg-[#F7F2EB]"
              >
                Add Service
              </Button>
            </DialogTrigger>

            <DialogContent className="border-[#DED8CF] bg-[#FAF8F4]">
              <DialogHeader>
                <DialogTitle className="text-[#30352A]">
                  {editingService
                    ? "Edit Service"
                    : "Add Service"}
                </DialogTitle>
              </DialogHeader>

              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label
                    htmlFor="service-name"
                    className="text-sm font-medium text-[#4B5141]"
                  >
                    Service Name
                  </label>

                  <Input
                    id="service-name"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    placeholder="Cuci Kering (2 hari)"
                    className="border-[#D8D2C9] bg-white focus-visible:ring-[#8B9A6E]"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="service-category"
                    className="text-sm font-medium text-[#4B5141]"
                  >
                    Category
                  </label>

                  <select
                    id="service-category"
                    value={category}
                    onChange={(event) =>
                      setCategory(
                        event.target.value as ServiceCategory
                      )
                    }
                    className="flex h-10 w-full rounded-md border border-[#D8D2C9] bg-white px-3 py-2 text-sm text-[#4B5141] outline-none focus:ring-2 focus:ring-[#8B9A6E]"
                  >
                    <option value="REGULER">
                      Reguler
                    </option>

                    <option value="EKSPRESS">
                      Ekspress
                    </option>

                    <option value="KHUSUS">
                      Khusus
                    </option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="service-unit"
                    className="text-sm font-medium text-[#4B5141]"
                  >
                    Unit
                  </label>

                  <select
                    id="service-unit"
                    value={unit}
                    onChange={(event) =>
                      setUnit(
                        event.target.value as ServiceUnit
                      )
                    }
                    className="flex h-10 w-full rounded-md border border-[#D8D2C9] bg-white px-3 py-2 text-sm text-[#4B5141] outline-none focus:ring-2 focus:ring-[#8B9A6E]"
                  >
                    <option value="KG">
                      KG
                    </option>

                    <option value="SATUAN">
                      Satuan
                    </option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="service-price"
                    className="text-sm font-medium text-[#4B5141]"
                  >
                    Price
                  </label>

                  <Input
                    id="service-price"
                    type="number"
                    min="1"
                    step="0.01"
                    value={price}
                    onChange={(event) =>
                      setPrice(event.target.value)
                    }
                    placeholder="8000"
                    className="border-[#D8D2C9] bg-white focus-visible:ring-[#8B9A6E]"
                  />
                </div>

                {actionError && (
                  <p className="rounded-lg bg-[#F4E7E3] px-3 py-2 text-sm text-[#B85C5C]">
                    {actionError}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#8B9A6E] text-white hover:bg-[#7D8C62]"
                >
                  {submitting
                    ? "Saving..."
                    : editingService
                      ? "Update Service"
                      : "Create Service"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="border-[#DED8CF] bg-white shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-[#73776D]">
              Total Services
            </p>

            <p className="mt-3 text-3xl font-semibold text-[#4B5141]">
              {services.length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#DED8CF] bg-[#E7ECDD] shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-[#73776D]">
              Active
            </p>

            <p className="mt-3 text-3xl font-semibold text-[#4B5141]">
              {activeCount}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#DED8CF] bg-[#EAE2D6] shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-[#73776D]">
              Inactive
            </p>

            <p className="mt-3 text-3xl font-semibold text-[#4B5141]">
              {inactiveCount}
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-[#DED8CF] bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-col gap-3 md:flex-row">
              <Input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search service name..."
                className="border-[#D8D2C9] bg-[#FAF8F4] focus-visible:ring-[#8B9A6E]"
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as StatusFilter
                  )
                }
                className="h-10 rounded-md border border-[#D8D2C9] bg-[#FAF8F4] px-3 py-2 text-sm text-[#4B5141] outline-none focus:ring-2 focus:ring-[#8B9A6E] md:w-48"
              >
                <option value="ALL">
                  All Status
                </option>

                <option value="ACTIVE">
                  Active
                </option>

                <option value="INACTIVE">
                  Inactive
                </option>
              </select>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        {categoryGroups.map((group) => {
          const categoryServices =
            filteredServices.filter(
              (service) =>
                service.category === group.category
            );

          return (
            <div key={group.category}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#30352A]">
                    {group.label}
                  </h2>

                  <p className="mt-0.5 text-xs text-[#73776D]">
                    {categoryServices.length} service
                    {categoryServices.length !== 1
                      ? "s"
                      : ""}
                  </p>
                </div>
              </div>

              {categoryServices.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#D8D2C9] bg-white px-4 py-5 text-center">
                  <p className="text-xs text-[#73776D]">
                    No {group.label.toLowerCase()} services found.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {categoryServices.map((service) => (
                    <Card
                      key={service.id}
                      className="border-[#DED8CF] bg-white shadow-sm transition-colors hover:border-[#C8D0B7]"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#30352A]">
                              {service.name}
                            </p>

                            <div className="mt-1.5 flex items-center gap-2">
                              <span className="text-xs text-[#73776D]">
                                {service.unit}
                              </span>

                              <span className="text-[#D0CBC2]">
                                •
                              </span>

                              <span className="text-sm font-semibold text-[#4B5141]">
                                {formatCurrency(
                                  service.price
                                )}
                              </span>
                            </div>
                          </div>

                          <Badge
                            className={
                              service.isActive
                                ? "shrink-0 border-0 bg-[#8B9A6E] px-2 py-0.5 text-[11px] text-white hover:bg-[#8B9A6E]"
                                : "shrink-0 border-0 bg-[#EEEEEE] px-2 py-0.5 text-[11px] text-[#73776D] hover:bg-[#EEEEEE]"
                            }
                          >
                            {service.isActive
                              ? "Active"
                              : "Inactive"}
                          </Badge>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openEditDialog(service)
                            }
                            className="h-8 border-[#D8D2C9] bg-white px-3 text-xs text-[#4B5141] hover:bg-[#EAE2D6]"
                          >
                            Edit
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleToggleStatus(service)
                            }
                            className="h-8 border-[#C8D0B7] bg-[#F0F2E9] px-3 text-xs text-[#4B5141] hover:bg-[#E0E7D5]"
                          >
                            {service.isActive
                              ? "Deactivate"
                              : "Activate"}
                          </Button>

                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              openDeleteDialog(service)
                            }
                            className="h-8 px-3 text-xs"
                          >
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialogContent className="border-[#DED8CF] bg-[#FAF8F4]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#30352A]">
              Delete {selectedService?.name}?
            </AlertDialogTitle>
          </AlertDialogHeader>

          <p className="text-sm leading-6 text-[#73776D]">
            Services already used by existing orders
            may not be deletable.
          </p>

          {actionError && (
            <p className="rounded-lg bg-[#F4E7E3] px-3 py-2 text-sm text-[#B85C5C]">
              {actionError}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={submitting}
              className="border-[#D8D2C9] bg-white text-[#4B5141] hover:bg-[#EAE2D6]"
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={submitting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              className="bg-[#B85C5C] text-white hover:bg-[#A64F4F]"
            >
              {submitting
                ? "Deleting..."
                : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ServicesPage;