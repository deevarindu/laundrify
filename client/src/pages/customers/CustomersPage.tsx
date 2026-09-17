import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CustomersPage = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [membershipDialogOpen, setMembershipDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null);

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const [membershipDiscount, setMembershipDiscount] =
    useState("10");

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadCustomers = async () => {
    const response = await api.get("/customer");
    return response.data.data as Customer[];
  };

  const loadMemberships = async () => {
    const response = await api.get("/membership");
    return response.data.data as Membership[];
  };

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const [customerData, membershipData] =
          await Promise.all([
            loadCustomers(),
            loadMemberships(),
          ]);

        if (cancelled) {
          return;
        }

        setCustomers(customerData);
        setMemberships(membershipData);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(error);
        setError("Failed to load customer data.");
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
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const result = customerSchema.safeParse({
      name: customerName,
      phone: customerPhone,
      address: customerAddress || undefined,
    });

    if (!result.success) {
      setActionError(
        result.error.issues[0]?.message ?? "Invalid data."
      );
      return;
    }

    try {
      setSubmitting(true);
      setActionError("");

      if (editingCustomer) {
        const response = await api.patch(
          `/customer/${editingCustomer.id}`,
          result.data
        );

        setCustomers((currentCustomers) =>
          currentCustomers.map((customer) =>
            customer.id === editingCustomer.id
              ? response.data.data
              : customer
          )
        );
      } else {
        const response = await api.post(
          "/customer",
          result.data
        );

        setCustomers((currentCustomers) => [
          response.data.data,
          ...currentCustomers,
        ]);
      }

      setCustomerDialogOpen(false);
      resetCustomerForm();
    } catch (error) {
      console.error(error);
      setActionError("Failed to save customer.");
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setActionError("");
    setDeleteDialogOpen(true);
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) {
      return;
    }

    try {
      setSubmitting(true);
      setActionError("");

      await api.delete(
        `/customer/${selectedCustomer.id}`
      );

      setCustomers((currentCustomers) =>
        currentCustomers.filter(
          (customer) =>
            customer.id !== selectedCustomer.id
        )
      );

      setMemberships((currentMemberships) =>
        currentMemberships.filter(
          (membership) =>
            membership.customerId !== selectedCustomer.id
        )
      );

      setDeleteDialogOpen(false);
      setSelectedCustomer(null);
    } catch (error: unknown) {
      console.error(error);

      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete customer.";

      setActionError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleMembership = async (
    membership: Membership
  ) => {
    try {
      const response = await api.patch(
        `/membership/${membership.id}`,
        {
          isActive: !membership.isActive,
        }
      );

      setMemberships((currentMemberships) =>
        currentMemberships.map((item) =>
          item.id === membership.id
            ? response.data.data
            : item
        )
      );
    } catch (error) {
      console.error(error);
      setError("Failed to update membership.");
    }
  };

  const openMembershipDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setMembershipDiscount("10");
    setActionError("");
    setMembershipDialogOpen(true);
  };

  const handleCreateMembership = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!selectedCustomer) {
      return;
    }

    const discount = Number(membershipDiscount);

    const result = membershipSchema.safeParse({
      customerId: selectedCustomer.id,
      discountPercent: discount,
    });

    if (!result.success) {
      setActionError(
        result.error.issues[0]?.message ?? "Invalid data."
      );
      return;
    }

    try {
      setSubmitting(true);
      setActionError("");

      const response = await api.post(
        "/membership",
        result.data
      );

      setMemberships((currentMemberships) => [
        response.data.data,
        ...currentMemberships,
      ]);

      setMembershipDialogOpen(false);
      setSelectedCustomer(null);
    } catch (error) {
      console.error(error);

      setActionError(
        "Failed to create membership."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(
    (customer) => {
      const value = search.toLowerCase();

      return (
        customer.name.toLowerCase().includes(value) ||
        customer.phone.toLowerCase().includes(value)
      );
    }
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#F7F2EB]">
        <p className="text-sm text-[#73776D]">
          Loading customers...
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
              Customer Management
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Customers</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
              Manage customer information and membership
              benefits.
            </p>
          </div>

          <Dialog
            open={customerDialogOpen}
            onOpenChange={setCustomerDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                onClick={openCreateDialog}
                className="bg-white text-[#4B5141] hover:bg-[#F7F2EB]"
              >
                Add Customer
              </Button>
            </DialogTrigger>

            <DialogContent className="border-[#DED8CF] bg-[#FAF8F4]">
              <DialogHeader>
                <DialogTitle className="text-[#30352A]">
                  {editingCustomer
                    ? "Edit Customer"
                    : "Add Customer"}
                </DialogTitle>
              </DialogHeader>

              <form
                onSubmit={handleCustomerSubmit}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="text-sm font-medium text-[#4B5141]"
                  >
                    Name
                  </label>

                  <Input
                    id="name"
                    value={customerName}
                    onChange={(event) =>
                      setCustomerName(event.target.value)
                    }
                    className="border-[#D8D2C9] bg-white focus-visible:ring-[#8B9A6E]"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="phone"
                    className="text-sm font-medium text-[#4B5141]"
                  >
                    Phone
                  </label>

                  <Input
                    id="phone"
                    value={customerPhone}
                    onChange={(event) =>
                      setCustomerPhone(event.target.value)
                    }
                    className="border-[#D8D2C9] bg-white focus-visible:ring-[#8B9A6E]"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="address"
                    className="text-sm font-medium text-[#4B5141]"
                  >
                    Address
                  </label>

                  <Input
                    id="address"
                    value={customerAddress}
                    onChange={(event) =>
                      setCustomerAddress(event.target.value)
                    }
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
                    : editingCustomer
                      ? "Update Customer"
                      : "Create Customer"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <section>
        <Card className="border-[#DED8CF] bg-white shadow-sm">
          <CardContent className="p-5">
            <Input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by name or phone..."
              className="border-[#D8D2C9] bg-[#FAF8F4] focus-visible:ring-[#8B9A6E]"
            />
          </CardContent>
        </Card>
      </section>

      <Card className="border-[#DED8CF] bg-white shadow-sm">
        <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4]">
          <CardTitle className="text-base font-semibold text-[#4B5141]">
            Customer List
            <p className="mt-1 text-sm font-light text-[#73776D]">
              {customers.length} customer
              {customers.length !== 1 ? "s" : ""} registered.
            </p>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4">
          {filteredCustomers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D8D2C9] bg-[#FAF8F4] px-4 py-8 text-center">
              <p className="text-sm text-[#73776D]">
                No customers found.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCustomers.map((customer) => {
                const membership =
                  memberships.find(
                    (item) =>
                      item.customerId === customer.id
                  );

                return (
                  <div
                    key={customer.id}
                    className="rounded-xl border border-[#E2DDD5] bg-[#FDFCFA] px-4 py-3 transition-colors hover:border-[#C8D0B7] hover:bg-[#FAF8F4]"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[#30352A]">
                            {customer.name}
                          </p>

                          {membership && (
                            <Badge
                              className={
                                membership.isActive
                                  ? "border-0 bg-[#8B9A6E] px-2 py-0.5 text-[10px] text-white hover:bg-[#8B9A6E]"
                                  : "border-0 bg-[#EAE2D6] px-2 py-0.5 text-[10px] text-[#73776D] hover:bg-[#EAE2D6]"
                              }
                            >
                              {membership.isActive
                                ? `Member ${Number(
                                    membership.discountPercent
                                  )}%`
                                : "Inactive Member"}
                            </Badge>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <p className="text-xs text-[#73776D]">
                            {customer.phone}
                          </p>

                          <span className="text-xs text-[#D0CBC2]">
                            •
                          </span>

                          <p className="truncate text-xs text-[#8A8D84]">
                            {customer.address ?? "-"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {membership ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleToggleMembership(
                                membership
                              )
                            }
                            className="h-8 border-[#D8D2C9] bg-white px-3 text-xs text-[#4B5141] hover:bg-[#EAE2D6]"
                          >
                            {membership.isActive
                              ? "Deactivate"
                              : "Activate"}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              openMembershipDialog(
                                customer
                              )
                            }
                            className="h-8 bg-[#8B9A6E] px-3 text-xs text-white hover:bg-[#7D8C62]"
                          >
                            Activate Membership
                          </Button>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            openEditDialog(customer)
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
                            navigate(
                              `/customer/${customer.id}`
                            )
                          }
                          className="h-8 border-[#C8D0B7] bg-[#F0F2E9] px-3 text-xs text-[#4B5141] hover:bg-[#E0E7D5]"
                        >
                          Detail
                        </Button>

                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            openDeleteDialog(customer)
                          }
                          className="h-8 bg-[#B85C5C] px-3 text-xs text-white hover:bg-[#A64F4F]"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={membershipDialogOpen}
        onOpenChange={setMembershipDialogOpen}
      >
        <DialogContent className="border-[#DED8CF] bg-[#FAF8F4]">
          <DialogHeader>
            <DialogTitle className="text-[#30352A]">
              Activate Membership
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleCreateMembership}
            className="space-y-5"
          >
            <div className="rounded-xl bg-[#EAE2D6] p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-[#73776D]">
                Customer
              </p>

              <p className="mt-1 font-semibold text-[#4B5141]">
                {selectedCustomer?.name}
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="discount"
                className="text-sm font-medium text-[#4B5141]"
              >
                Discount Percent
              </label>

              <Input
                id="discount"
                type="number"
                min="0"
                max="100"
                value={membershipDiscount}
                onChange={(event) =>
                  setMembershipDiscount(
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

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#8B9A6E] text-white hover:bg-[#7D8C62]"
            >
              {submitting
                ? "Saving..."
                : "Activate Membership"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialogContent className="border-[#DED8CF] bg-[#FAF8F4]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#30352A]">
              Delete {selectedCustomer?.name}?
            </AlertDialogTitle>
          </AlertDialogHeader>

          <p className="text-sm leading-6 text-[#73776D]">
            This customer can only be deleted when
            they are not referenced by protected
            business data.
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
                void handleDeleteCustomer();
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

export default CustomersPage;