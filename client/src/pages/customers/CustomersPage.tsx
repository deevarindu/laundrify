
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  Crown,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Users,
  UserRoundX,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import api from "../../lib/api";
import type { Customer, Membership } from "../../types";
import {
  customerSchema,
  membershipSchema,
} from "../../schemas/customerSchema";
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

type StatCard = {
  label: string;
  value: number;
  description: string;
  icon: LucideIcon;
  iconClass: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (isRecord(error)) {
    const response = isRecord(error.response) ? error.response : {};
    const data = isRecord(response.data) ? response.data : {};

    if (typeof data.message === "string") {
      return data.message;
    }

    if (typeof error.message === "string") {
      return error.message;
    }
  }

  return fallback;
};

// const formatDate = (value: string | Date): string => {
//   const date = new Date(value);

//   if (Number.isNaN(date.getTime())) {
//     return "-";
//   }

//   return new Intl.DateTimeFormat("id-ID", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//   }).format(date);
// };

const CustomersPage = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [search, setSearch] = useState("");

  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [membershipDialogOpen, setMembershipDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] =
    useState<Customer | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [membershipDiscount, setMembershipDiscount] = useState("10");

  const [submitting, setSubmitting] = useState(false);
  const [updatingMembershipId, setUpdatingMembershipId] =
    useState<Membership["id"] | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [customerResponse, membershipResponse] = await Promise.all([
        api.get("/customer"),
        api.get("/membership"),
      ]);

      const customerData = customerResponse.data.data;
      const membershipData = membershipResponse.data.data;

      setCustomers(Array.isArray(customerData) ? customerData : []);
      setMemberships(Array.isArray(membershipData) ? membershipData : []);
      setError("");
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(
          requestError,
          "Failed to load customer data. Please try again.",
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
        void loadData();
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loadData]);

  const membershipMap = useMemo(
    () =>
      new Map(
        memberships.map((membership) => [
          membership.customerId,
          membership,
        ]),
      ),
    [memberships],
  );

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...customers]
      .filter(
        (customer) =>
          customer.name.toLowerCase().includes(query) ||
          customer.phone.toLowerCase().includes(query) ||
          (customer.address ?? "").toLowerCase().includes(query),
      )
      .sort((first, second) => first.name.localeCompare(second.name));
  }, [customers, search]);

  const activeMemberships = useMemo(
    () => memberships.filter((membership) => membership.isActive).length,
    [memberships],
  );

  const inactiveMemberships = useMemo(
    () => memberships.filter((membership) => !membership.isActive).length,
    [memberships],
  );

  const customersWithoutMembership = Math.max(
    0,
    customers.length - memberships.length,
  );

  const stats: StatCard[] = [
    {
      label: "Total customers",
      value: customers.length,
      description: "Registered customers",
      icon: Users,
      iconClass: "bg-[#F0EEE7] text-[#77785F]",
    },
    {
      label: "Active members",
      value: activeMemberships,
      description: "Membership benefits active",
      icon: Crown,
      iconClass: "bg-[#E8F2E8] text-[#4D7954]",
    },
    {
      label: "Inactive members",
      value: inactiveMemberships,
      description: "Membership currently disabled",
      icon: UserRoundX,
      iconClass: "bg-[#F8F0E1] text-[#A47A39]",
    },
    {
      label: "Regular customers",
      value: customersWithoutMembership,
      description: "Without a membership record",
      icon: CircleUserRound,
      iconClass: "bg-[#E9EEF7] text-[#5474A2]",
    },
  ];

  const resetCustomerForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setEditingCustomer(null);
    setActionError("");
  };

  const openCreateDialog = () => {
    resetCustomerForm();
    setCustomerDialogOpen(true);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setCustomerAddress(customer.address ?? "");
    setActionError("");
    setCustomerDialogOpen(true);
  };

  const handleCustomerSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const result = customerSchema.safeParse({
      name: customerName,
      phone: customerPhone,
      address: customerAddress || undefined,
    });

    if (!result.success) {
      setActionError(
        result.error.issues[0]?.message ?? "Please check your customer details.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setActionError("");

      if (editingCustomer) {
        const response = await api.patch(
          `/customer/${editingCustomer.id}`,
          result.data,
        );

        setCustomers((currentCustomers) =>
          currentCustomers.map((customer) =>
            customer.id === editingCustomer.id
              ? response.data.data
              : customer,
          ),
        );
      } else {
        const response = await api.post("/customer", result.data);

        setCustomers((currentCustomers) => [
          response.data.data,
          ...currentCustomers,
        ]);
      }

      setCustomerDialogOpen(false);
      resetCustomerForm();
    } catch (requestError: unknown) {
      setActionError(
        getErrorMessage(requestError, "Failed to save customer."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteDialog = (customer: Customer) => {
    setDeletingCustomer(customer);
    setActionError("");
    setDeleteDialogOpen(true);
  };

  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return;

    try {
      setSubmitting(true);
      setActionError("");

      await api.delete(`/customer/${deletingCustomer.id}`);

      setCustomers((currentCustomers) =>
        currentCustomers.filter(
          (customer) => customer.id !== deletingCustomer.id,
        ),
      );

      setMemberships((currentMemberships) =>
        currentMemberships.filter(
          (membership) =>
            membership.customerId !== deletingCustomer.id,
        ),
      );

      setDeleteDialogOpen(false);
      setDeletingCustomer(null);
    } catch (requestError: unknown) {
      setActionError(
        getErrorMessage(requestError, "Failed to delete customer."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleMembership = async (membership: Membership) => {
    try {
      setUpdatingMembershipId(membership.id);
      setActionError("");

      const response = await api.patch(`/membership/${membership.id}`, {
        isActive: !membership.isActive,
      });

      setMemberships((currentMemberships) =>
        currentMemberships.map((item) =>
          item.id === membership.id ? response.data.data : item,
        ),
      );
    } catch (requestError: unknown) {
      setActionError(
        getErrorMessage(requestError, "Failed to update membership."),
      );
    } finally {
      setUpdatingMembershipId(null);
    }
  };

  const openMembershipDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setMembershipDiscount("10");
    setActionError("");
    setMembershipDialogOpen(true);
  };

  const handleCreateMembership = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!selectedCustomer) return;

    const result = membershipSchema.safeParse({
      customerId: selectedCustomer.id,
      discountPercent: Number(membershipDiscount),
    });

    if (!result.success) {
      setActionError(
        result.error.issues[0]?.message ?? "Please check the discount value.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setActionError("");

      const response = await api.post("/membership", result.data);

      setMemberships((currentMemberships) => [
        response.data.data,
        ...currentMemberships,
      ]);

      setMembershipDialogOpen(false);
      setSelectedCustomer(null);
    } catch (requestError: unknown) {
      setActionError(
        getErrorMessage(requestError, "Failed to create membership."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    void loadData();
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-28 rounded-full bg-[#E5DED3]" />
          <div className="h-7 w-56 rounded-lg bg-[#E5DED3]" />
          <div className="h-4 w-72 max-w-full rounded-lg bg-[#EAE4DB]" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl border border-[#E7E0D6] bg-white"
            />
          ))}
        </div>

        <div className="h-64 animate-pulse rounded-xl border border-[#E7E0D6] bg-white" />
      </div>
    );
  }

  if (error && customers.length === 0) {
    return (
      <div className="flex min-h-[45vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#FAEFED] text-[#AC665C]">
          <Users size={22} />
        </div>

        <h2 className="font-heading text-lg font-semibold text-[#34382D]">
          Unable to load customers
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
            Customer management
          </div>

          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[#34382D]">
            Customers
          </h1>

          <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-[#858579]">
            Manage customer details and membership benefits.
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
            Add customer
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card
              key={stat.label}
              className="rounded-xl border-[#E7E0D6] bg-white shadow-[0_1px_5px_rgba(52,56,45,0.025)] transition-colors hover:border-[#D7DCCF]"
            >
              <CardContent className="p-3.5 sm:p-4">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0">
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
              Search customers
            </h2>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#96968C]"
              />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, phone, or address..."
                aria-label="Search customers"
                className="h-9 border-[#E3DED5] bg-[#FCFBF8] pl-9 text-xs placeholder:text-[#A1A194] focus-visible:ring-[#8B9A6E]"
              />
            </div>

            {search && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setSearch("")}
                className="h-9 gap-1.5 border-[#E3DED5] px-3 text-xs text-[#65695D] hover:bg-[#F5F2EC]"
              >
                <X size={13} />
                Clear
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              className="h-9 gap-1.5 border-[#E3DED5] px-3 text-xs text-[#65695D] hover:bg-[#F5F2EC]"
            >
              <RefreshCw size={13} />
              Refresh
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

      {actionError && !customerDialogOpen && !membershipDialogOpen && !deleteDialogOpen && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-[#EBD6D3] bg-[#FAEFED] px-3 py-2.5">
          <p className="text-xs leading-5 text-[#AC665C]">{actionError}</p>
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
              Customer list
            </CardTitle>

            <p className="mt-1 text-[11px] text-[#858579]">
              Showing {filteredCustomers.length} of {customers.length} customers
            </p>
          </div>

          <Badge
            variant="outline"
            className="rounded-md border-[#D7DCCF] bg-[#F0F3EB] px-2 py-1 text-[10px] font-medium text-[#59694A]"
          >
            {activeMemberships} active members
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          {filteredCustomers.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-4 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3F0E9] text-[#858B75]">
                <Users size={20} />
              </div>

              <h3 className="mt-3 font-heading text-sm font-semibold text-[#454B3A]">
                {search.trim() ? "No matching customers" : "No customers yet"}
              </h3>

              <p className="mt-1.5 max-w-sm text-xs leading-5 text-[#858579]">
                {search.trim()
                  ? "Try another name, phone number, or address."
                  : "Add a customer to start managing their orders and membership."}
              </p>

              {search.trim() ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSearch("")}
                  className="mt-3 h-8 gap-1.5 border-[#E3DED5] px-2.5 text-xs text-[#53594A] hover:bg-[#F5F2EC]"
                >
                  <X size={13} />
                  Clear search
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={openCreateDialog}
                  className="mt-3 h-8 gap-1.5 rounded-lg bg-[#788A61] px-2.5 text-xs text-white hover:bg-[#64764F]"
                >
                  <Plus size={14} />
                  Add customer
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="bg-[#FAF9F6]">
                    <th className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579] sm:px-4">
                      Customer
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579]">
                      Contact
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579]">
                      Membership
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579]">
                      Discount
                    </th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.09em] text-[#858579] sm:px-4">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCustomers.map((customer) => {
                    const membership = membershipMap.get(customer.id);

                    return (
                      <tr
                        key={customer.id}
                        className="border-t border-[#F0ECE5] transition-colors hover:bg-[#FCFBF8]"
                      >
                        <td className="px-3 py-3 sm:px-4">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F0EEE7] font-heading text-xs font-semibold uppercase text-[#758760]">
                              {customer.name.trim().charAt(0) || "C"}
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-[165px] truncate text-xs font-semibold text-[#454B3A]">
                                {customer.name}
                              </p>
                              <p className="mt-0.5 text-[10px] text-[#96968C]">
                                ID: {customer.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <p className="whitespace-nowrap text-xs font-medium text-[#53594A]">
                            {customer.phone}
                          </p>
                          <p
                            className="mt-0.5 max-w-[170px] truncate text-[10px] text-[#96968C]"
                            title={customer.address ?? ""}
                          >
                            {customer.address || "No address provided"}
                          </p>
                        </td>

                        <td className="px-3 py-3">
                          {membership ? (
                            <Badge
                              variant="outline"
                              className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-medium ${
                                membership.isActive
                                  ? "border-[#D6E7D5] bg-[#EDF5EA] text-[#4D7954]"
                                  : "border-[#E3DED5] bg-[#F3F0E9] text-[#858579]"
                              }`}
                            >
                              {membership.isActive ? "Active member" : "Inactive"}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="whitespace-nowrap rounded-md border-[#E3DED5] bg-white px-2 py-0.5 text-[10px] font-normal text-[#858579]"
                            >
                              Regular
                            </Badge>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-3 py-3">
                          {membership ? (
                            <span className="text-xs font-semibold tabular-nums text-[#53594A]">
                              {Number(membership.discountPercent)}%
                            </span>
                          ) : (
                            <span className="text-xs text-[#96968C]">—</span>
                          )}
                        </td>

                        <td className="px-3 py-3 sm:px-4">
                          <div className="flex items-center justify-end gap-1">
                            {membership ? (
                              <Button
                                type="button"
                                variant="outline"
                                disabled={updatingMembershipId === membership.id}
                                onClick={() => void handleToggleMembership(membership)}
                                className="h-7 rounded-md border-[#E3DED5] bg-white px-2 text-[10px] text-[#65695D] hover:bg-[#F5F2EC]"
                              >
                                {updatingMembershipId === membership.id
                                  ? "Saving..."
                                  : membership.isActive
                                    ? "Deactivate"
                                    : "Activate"}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => openMembershipDialog(customer)}
                                className="h-7 rounded-md border-[#D7DCCF] bg-[#F0F3EB] px-2 text-[10px] text-[#59694A] hover:bg-[#E5EBDD]"
                              >
                                Add member
                              </Button>
                            )}

                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              aria-label={`Edit ${customer.name}`}
                              title="Edit customer"
                              onClick={() => openEditDialog(customer)}
                              className="h-7 w-7 rounded-md border-[#E3DED5] bg-white p-0 text-[#65695D] hover:bg-[#F5F2EC]"
                            >
                              <Pencil size={12} />
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              aria-label={`View ${customer.name}`}
                              title="View customer"
                              onClick={() => navigate(`/customer/${customer.id}`)}
                              className="h-7 w-7 rounded-md border-[#DDE2D4] bg-white p-0 text-[#65774D] hover:bg-[#F1F4EC]"
                            >
                              <Eye size={13} />
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              aria-label={`Delete ${customer.name}`}
                              title="Delete customer"
                              onClick={() => openDeleteDialog(customer)}
                              className="h-7 w-7 rounded-md border-[#EBD6D3] bg-white p-0 text-[#AC665C] hover:bg-[#FAEFED]"
                            >
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredCustomers.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEE9E1] px-3.5 py-2.5 sm:px-4">
              <p className="text-[10px] text-[#96968C]">
                {filteredCustomers.length}{" "}
                {filteredCustomers.length === 1 ? "customer" : "customers"} displayed
              </p>

              <p className="text-[10px] text-[#96968C]">
                Sorted alphabetically
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={customerDialogOpen}
        onOpenChange={(open) => {
          setCustomerDialogOpen(open);
          if (!open) setActionError("");
        }}
      >
        <DialogContent className="max-w-[420px] rounded-xl border-[#DED8CF] bg-[#FAF8F4] p-5">
          <DialogHeader>
            <DialogTitle className="font-heading text-base text-[#30352A]">
              {editingCustomer ? "Edit customer" : "Add customer"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCustomerSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <label
                htmlFor="customer-name"
                className="text-xs font-medium text-[#4B5141]"
              >
                Full name
              </label>

              <Input
                id="customer-name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                autoComplete="name"
                placeholder="Enter customer name"
                className="h-9 border-[#D8D2C9] bg-white text-xs focus-visible:ring-[#8B9A6E]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="customer-phone"
                className="text-xs font-medium text-[#4B5141]"
              >
                Phone number
              </label>

              <Input
                id="customer-phone"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                autoComplete="tel"
                placeholder="Enter phone number"
                className="h-9 border-[#D8D2C9] bg-white text-xs focus-visible:ring-[#8B9A6E]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="customer-address"
                className="text-xs font-medium text-[#4B5141]"
              >
                Address <span className="font-normal text-[#96968C]">(optional)</span>
              </label>

              <Input
                id="customer-address"
                value={customerAddress}
                onChange={(event) => setCustomerAddress(event.target.value)}
                autoComplete="street-address"
                placeholder="Enter customer address"
                className="h-9 border-[#D8D2C9] bg-white text-xs focus-visible:ring-[#8B9A6E]"
              />
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
                onClick={() => setCustomerDialogOpen(false)}
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
                  : editingCustomer
                    ? "Save changes"
                    : "Create customer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={membershipDialogOpen}
        onOpenChange={(open) => {
          setMembershipDialogOpen(open);
          if (!open) {
            setActionError("");
            setSelectedCustomer(null);
          }
        }}
      >
        <DialogContent className="max-w-[400px] rounded-xl border-[#DED8CF] bg-[#FAF8F4] p-5">
          <DialogHeader>
            <DialogTitle className="font-heading text-base text-[#30352A]">
              Create membership
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateMembership} className="space-y-4">
            <div className="rounded-lg border border-[#E6E1D7] bg-white p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8EEE0] text-[#65774D]">
                  <ShieldCheck size={16} />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[#858579]">
                    Customer
                  </p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-[#454B3A]">
                    {selectedCustomer?.name}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="membership-discount"
                className="text-xs font-medium text-[#4B5141]"
              >
                Discount percentage
              </label>

              <Input
                id="membership-discount"
                type="number"
                min="0"
                max="100"
                step="1"
                value={membershipDiscount}
                onChange={(event) => setMembershipDiscount(event.target.value)}
                className="h-9 border-[#D8D2C9] bg-white text-xs focus-visible:ring-[#8B9A6E]"
              />

              <p className="text-[10px] leading-4 text-[#96968C]">
                Enter a value between 0 and 100.
              </p>
            </div>

            {actionError && (
              <p className="rounded-lg border border-[#EBD6D3] bg-[#FAEFED] px-3 py-2 text-xs leading-5 text-[#AC665C]">
                {actionError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => setMembershipDialogOpen(false)}
                className="h-8 border-[#D8D2C9] bg-white px-3 text-xs text-[#53594A] hover:bg-[#F1EEE7]"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={submitting}
                className="h-8 gap-1.5 bg-[#788A61] px-3 text-xs text-white hover:bg-[#64764F]"
              >
                <Crown size={13} />
                {submitting ? "Saving..." : "Activate membership"}
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
            setDeletingCustomer(null);
            setActionError("");
          }
        }}
      >
        <AlertDialogContent className="max-w-[400px] rounded-xl border-[#DED8CF] bg-[#FAF8F4] p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-base text-[#30352A]">
              Delete customer?
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="space-y-2">
            <p className="text-sm leading-5 text-[#53594A]">
              You are about to delete{" "}
              <span className="font-semibold">{deletingCustomer?.name}</span>.
            </p>

            <p className="text-xs leading-5 text-[#858579]">
              This action may be rejected if the customer is still referenced by
              existing orders or other protected records.
            </p>
          </div>

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
                void handleDeleteCustomer();
              }}
              className="h-8 bg-[#B85C5C] px-3 text-xs text-white hover:bg-[#A64F4F]"
            >
              {submitting ? "Deleting..." : "Delete customer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomersPage;
