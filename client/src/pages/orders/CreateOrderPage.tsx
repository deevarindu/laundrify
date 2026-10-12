import axios from "axios";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import api from "../../lib/api";
import type { Customer, Membership, Service } from "../../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type OrderItemForm = {
  id: string;
  serviceId: string;
  quantity: string;
};

const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const CreateOrderPage = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [dueAt, setDueAt] = useState("");

  const [nameDropdownOpen, setNameDropdownOpen] = useState(false);
  const [phoneDropdownOpen, setPhoneDropdownOpen] = useState(false);

  const [items, setItems] = useState<OrderItemForm[]>([
    {
      id: crypto.randomUUID(),
      serviceId: "",
      quantity: "1",
    },
  ]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const [
          customersResponse,
          membershipsResponse,
          servicesResponse,
        ] = await Promise.all([
          api.get("/customer"),
          api.get("/membership"),
          api.get("/service"),
        ]);

        if (cancelled) return;

        const loadedCustomers = customersResponse.data.data;
        const loadedMemberships = membershipsResponse.data.data;
        const loadedServices = servicesResponse.data.data;

        setCustomers(
          Array.isArray(loadedCustomers) ? loadedCustomers : [],
        );
        setMemberships(
          Array.isArray(loadedMemberships) ? loadedMemberships : [],
        );
        setServices(
          Array.isArray(loadedServices)
            ? loadedServices.filter((service: Service) => service.isActive)
            : [],
        );
      } catch {
        if (cancelled) return;
        setError("Failed to load order form data.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const matchedCustomer = useMemo(() => {
    const normalizedPhone = phone.trim();

    if (!normalizedPhone) return null;

    return (
      customers.find(
        (customer) => customer.phone.trim() === normalizedPhone,
      ) ?? null
    );
  }, [customers, phone]);

  const nameSuggestions = useMemo(() => {
    const query = name.trim().toLowerCase();

    if (!query || matchedCustomer) return [];

    return customers
      .filter((customer) => customer.name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [customers, name, matchedCustomer]);

  const phoneSuggestions = useMemo(() => {
    const query = phone.trim();

    if (!query) return [];

    return customers
      .filter((customer) =>
        customer.phone.toLowerCase().includes(query.toLowerCase()),
      )
      .slice(0, 8);
  }, [customers, phone]);

  const activeMembership = useMemo(() => {
    if (!matchedCustomer) return null;

    return (
      memberships.find(
        (membership) =>
          membership.customerId === matchedCustomer.id &&
          membership.isActive,
      ) ?? null
    );
  }, [memberships, matchedCustomer]);

  const selectedItems = useMemo(() => {
    return items.flatMap((item) => {
      const service = services.find(
        (currentService) => currentService.id === Number(item.serviceId),
      );

      const quantity = Number(item.quantity);

      if (
        !service ||
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        return [];
      }

      return [
        {
          id: item.id,
          serviceId: service.id,
          service,
          quantity,
          subtotal: Number(service.price) * quantity,
        },
      ];
    });
  }, [items, services]);

  const subtotal = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.subtotal, 0),
    [selectedItems],
  );

  const discountPercent = Number(
    activeMembership?.discountPercent ?? 0,
  );

  const discount = useMemo(
    () => subtotal * (discountPercent / 100),
    [subtotal, discountPercent],
  );

  const total = subtotal - discount;

  const selectCustomer = (customer: Customer) => {
    setName(customer.name);
    setPhone(customer.phone);
    setAddress(customer.address ?? "");
    setNameDropdownOpen(false);
    setPhoneDropdownOpen(false);
    setFormError("");
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setNameDropdownOpen(true);
    setPhoneDropdownOpen(false);
    setFormError("");
  };

  const handlePhoneChange = (value: string) => {
    const previousMatch = customers.find(
      (customer) => customer.phone.trim() === phone.trim(),
    );

    const nextMatch = customers.find(
      (customer) => customer.phone.trim() === value.trim(),
    );

    if (!nextMatch && previousMatch) {
      setName("");
      setAddress("");
    }

    if (nextMatch) {
      setName(nextMatch.name);
      setAddress(nextMatch.address ?? "");
    }

    setPhone(value);
    setPhoneDropdownOpen(true);
    setNameDropdownOpen(false);
    setFormError("");
  };

  const updateItem = (
    itemId: string,
    field: "serviceId" | "quantity",
    value: string,
  ) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item,
      ),
    );
    setFormError("");
  };

  const addItem = () => {
    setItems((currentItems) => [
      ...currentItems,
      {
        id: crypto.randomUUID(),
        serviceId: "",
        quantity: "1",
      },
    ]);
    setFormError("");
  };

  const removeItem = (itemId: string) => {
    setItems((currentItems) =>
      currentItems.length === 1
        ? currentItems
        : currentItems.filter((item) => item.id !== itemId),
    );
    setFormError("");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setFormError("");
    setNameDropdownOpen(false);
    setPhoneDropdownOpen(false);

    const normalizedPhone = phone.trim();
    const customerName = matchedCustomer
      ? matchedCustomer.name
      : name.trim();
    const customerAddress = matchedCustomer
      ? matchedCustomer.address ?? ""
      : address.trim();

    if (!normalizedPhone || !customerName) {
      setFormError("Customer name and phone number are required.");
      return;
    }

    if (items.some((item) => !item.serviceId)) {
      setFormError("Please select a service for every item.");
      return;
    }

    const parsedItems = items.map((item) => ({
      serviceId: Number(item.serviceId),
      quantity: Number(item.quantity),
    }));

    if (
      parsedItems.some(
        (item) =>
          !Number.isInteger(item.serviceId) ||
          item.serviceId <= 0 ||
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0,
      )
    ) {
      setFormError("Please select valid services and quantities.");
      return;
    }

    if (
      parsedItems.some((item) => {
        const service = services.find(
          (currentService) => currentService.id === item.serviceId,
        );

        return (
          service?.unit === "SATUAN" &&
          !Number.isInteger(item.quantity)
        );
      })
    ) {
      setFormError("Satuan services require a whole number quantity.");
      return;
    }

    const serviceIds = parsedItems.map((item) => item.serviceId);

    if (new Set(serviceIds).size !== serviceIds.length) {
      setFormError("Each service can only be added once.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await api.post("/order", {
        customer: {
          name: customerName,
          phone: normalizedPhone,
          address: customerAddress || undefined,
        },
        items: parsedItems,
        dueAt: dueAt || undefined,
      });

      navigate(`/order/${response.data.data.id}`);
    } catch (error: unknown) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setFormError(
          error.response?.data?.message ?? "Failed to create order.",
        );
      } else {
        setFormError("Failed to create order.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5 pb-6">
        <div className="space-y-2">
          <div className="h-3 w-28 animate-pulse rounded-full bg-[#E5DED3]" />
          <div className="h-7 w-56 animate-pulse rounded-lg bg-[#E5DED3]" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded-lg bg-[#EAE4DB]" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="h-64 animate-pulse rounded-xl border border-[#E7E0D6] bg-white" />
            <div className="h-72 animate-pulse rounded-xl border border-[#E7E0D6] bg-white" />
          </div>
          <div className="h-72 animate-pulse rounded-xl border border-[#E7E0D6] bg-white" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[45vh] flex-col items-center justify-center px-4 text-center">
        <h2 className="font-heading text-lg font-semibold text-[#34382D]">
          Unable to prepare the order form
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-[#858579]">
          {error}
        </p>
        <Button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 h-9 rounded-lg bg-[#788A61] px-4 text-xs font-semibold text-white hover:bg-[#64764F]"
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#84916F]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#84916F]" />
            Order management
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-[#34382D]">
            Create order
          </h1>
          <p className="mt-1 max-w-xl text-[13px] leading-5 text-[#858579]">
            Register a laundry order, select services, and review the total.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/orders")}
          disabled={submitting}
          className="h-9 gap-2 self-start rounded-lg border-[#E3DED5] bg-white px-3 text-xs font-medium text-[#65695D] hover:bg-[#F5F2EC] sm:self-auto"
        >
          <ArrowLeft size={14} />
          Back to orders
        </Button>
      </section>

      <div className="rounded-xl border border-[#E5E4D9] bg-[#F0F1E9] px-3.5 py-3">
        <p className="text-xs leading-5 text-[#626B53]">
          Use the customer's phone number to find an existing record. Existing customer details are kept automatically.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="min-w-0 space-y-5">
          <Card className="overflow-visible rounded-xl border-[#E7E0D6] bg-white shadow-none">
            <CardHeader className="border-b border-[#EEE9E1] px-4 py-3.5 sm:px-5">
              <div>
                <CardTitle className="font-heading text-sm font-semibold text-[#34382D]">
                  Customer details
                </CardTitle>
                <p className="mt-1 text-[11px] text-[#858579]">
                  Identify the customer for this order.
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="relative space-y-1.5">
                  <label
                    htmlFor="phone"
                    className="text-xs font-semibold text-[#53594A]"
                  >
                    Phone number <span className="text-[#B66A5E]">*</span>
                  </label>

                  <Input
                    id="phone"
                    autoComplete="off"
                    value={phone}
                    onFocus={() => {
                      setPhoneDropdownOpen(true);
                      setNameDropdownOpen(false);
                    }}
                    onBlur={() => setPhoneDropdownOpen(false)}
                    onChange={(event) =>
                      handlePhoneChange(event.target.value)
                    }
                    placeholder="Enter phone number"
                    required
                    className="h-10 border-[#E3DED5] bg-[#FCFBF8] text-xs focus-visible:ring-[#8B9A6E]"
                  />

                  {phoneDropdownOpen && phone.trim() && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[#E3DED5] bg-white p-1 shadow-lg">
                      {phoneSuggestions.length > 0 ? (
                        phoneSuggestions.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onMouseDown={(event) =>
                              event.preventDefault()
                            }
                            onClick={() => selectCustomer(customer)}
                            className="flex w-full flex-col rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[#F2F3EC] focus:bg-[#F2F3EC] focus:outline-none"
                          >
                            <span className="text-xs font-semibold text-[#454B3A]">
                              {customer.name}
                            </span>
                            <span className="mt-1 text-[11px] text-[#858579]">
                              {customer.phone}
                            </span>
                            {customer.address && (
                              <span className="mt-1 text-[10px] text-[#96968C]">
                                {customer.address}
                              </span>
                            )}
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-3 text-xs leading-5 text-[#858579]">
                          No matching customer. You can enter details for a new customer.
                        </p>
                      )}
                    </div>
                  )}

                  <p className="text-[10px] leading-4 text-[#96968C]">
                    Search by an existing customer's phone number.
                  </p>
                </div>

                <div className="relative space-y-1.5">
                  <label
                    htmlFor="customer-name"
                    className="text-xs font-semibold text-[#53594A]"
                  >
                    Customer name <span className="text-[#B66A5E]">*</span>
                  </label>

                  <Input
                    id="customer-name"
                    autoComplete="off"
                    value={matchedCustomer?.name ?? name}
                    onFocus={() => {
                      if (!matchedCustomer) {
                        setNameDropdownOpen(true);
                        setPhoneDropdownOpen(false);
                      }
                    }}
                    onBlur={() => setNameDropdownOpen(false)}
                    onChange={(event) =>
                      handleNameChange(event.target.value)
                    }
                    placeholder="Enter customer name"
                    required
                    disabled={Boolean(matchedCustomer)}
                    className="h-10 border-[#E3DED5] bg-[#FCFBF8] text-xs focus-visible:ring-[#8B9A6E] disabled:cursor-not-allowed disabled:bg-[#F3F2ED] disabled:opacity-100"
                  />

                  {nameDropdownOpen &&
                    !matchedCustomer &&
                    name.trim() && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[#E3DED5] bg-white p-1 shadow-lg">
                        {nameSuggestions.length > 0 ? (
                          nameSuggestions.map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              onMouseDown={(event) =>
                                event.preventDefault()
                              }
                              onClick={() => selectCustomer(customer)}
                              className="flex w-full flex-col rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[#F2F3EC] focus:bg-[#F2F3EC] focus:outline-none"
                            >
                              <span className="text-xs font-semibold text-[#454B3A]">
                                {customer.name}
                              </span>
                              <span className="mt-1 text-[11px] text-[#858579]">
                                {customer.phone}
                              </span>
                            </button>
                          ))
                        ) : (
                          <p className="px-3 py-3 text-xs leading-5 text-[#858579]">
                            No matching customer name. You can register a new customer.
                          </p>
                        )}
                      </div>
                    )}

                  <p className="text-[10px] leading-4 text-[#96968C]">
                    {matchedCustomer
                      ? "Using the name saved in the customer record."
                      : "Enter the name for a new customer."}
                  </p>
                </div>
              </div>

              {matchedCustomer && (
                <div className="flex items-start gap-3 rounded-xl border border-[#DCE4D3] bg-[#F1F4EC] p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#4E6341]">
                      Existing customer found
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[#6C765F]">
                      {matchedCustomer.name} is linked to this phone number. The saved customer details will be used.
                    </p>
                  </div>
                  {activeMembership && (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-[#D2DFC6] bg-white text-[10px] text-[#597348]"
                    >
                      Member
                    </Badge>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="address"
                  className="text-xs font-semibold text-[#53594A]"
                >
                  Address
                </label>
                <Input
                  id="address"
                  value={
                    matchedCustomer
                      ? matchedCustomer.address ?? ""
                      : address
                  }
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Enter customer's address"
                  disabled={Boolean(matchedCustomer)}
                  className="h-10 border-[#E3DED5] bg-[#FCFBF8] text-xs focus-visible:ring-[#8B9A6E] disabled:cursor-not-allowed disabled:bg-[#F3F2ED] disabled:opacity-100"
                />
                <p className="text-[10px] text-[#96968C]">
                  {matchedCustomer
                    ? "To change a registered address, use the Customers page."
                    : "Optional for a new customer."}
                </p>
              </div>

              {activeMembership && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-[#DCE4D3] bg-[#F1F4EC] px-3.5 py-3">
                  <div>
                    <p className="text-xs font-semibold text-[#4E6341]">
                      Active membership
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#758267]">
                      Discount applied to the subtotal
                    </p>
                  </div>
                  <span className="whitespace-nowrap font-heading text-lg font-semibold text-[#526945]">
                    {discountPercent}%
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="due-at"
                  className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#53594A]"
                >
                  Due date
                  <span className="font-normal text-[#96968C]">
                    (optional)
                  </span>
                </label>
                <Input
                  id="due-at"
                  type="datetime-local"
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                  className="h-10 border-[#E3DED5] bg-[#FCFBF8] text-xs focus-visible:ring-[#8B9A6E]"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-xl border-[#E7E0D6] bg-white shadow-none">
            <CardHeader className="border-b border-[#EEE9E1] px-4 py-3.5 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="font-heading text-sm font-semibold text-[#34382D]">
                    Laundry services
                  </CardTitle>
                  <p className="mt-1 text-[11px] text-[#858579]">
                    Select the services and quantities.
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className="border-[#E3DED5] bg-[#FAF9F6] px-2.5 py-1 text-[10px] font-medium text-[#65695D]"
                >
                  {items.length} {items.length === 1 ? "item" : "items"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 p-4 sm:p-5">
              {items.map((item, index) => {
                const service = services.find(
                  (currentService) =>
                    currentService.id === Number(item.serviceId),
                );

                const quantity = Number(item.quantity) || 0;
                const itemSubtotal = service
                  ? Number(service.price) * quantity
                  : 0;

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[#E8E3DA] bg-[#FDFCF9] p-3.5 sm:p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#ECEFE5] text-[10px] font-semibold text-[#667751]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="text-xs font-semibold text-[#53594A]">
                          Service item
                        </span>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        aria-label={`Remove service item ${index + 1}`}
                        className="h-7 gap-1.5 px-2 text-[10px] text-[#A16C61] hover:bg-[#FAEFED] hover:text-[#99594E] disabled:opacity-30"
                      >
                        <Trash2 size={12} />
                        Remove
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_110px]">
                      <div className="space-y-1.5">
                        <label
                          htmlFor={`service-${item.id}`}
                          className="text-[11px] font-medium text-[#65695D]"
                        >
                          Service
                        </label>

                        <select
                          id={`service-${item.id}`}
                          value={item.serviceId}
                          onChange={(event) =>
                            updateItem(
                              item.id,
                              "serviceId",
                              event.target.value,
                            )
                          }
                          className="h-10 w-full rounded-md border border-[#E3DED5] bg-white px-3 text-xs text-[#53594A] outline-none focus:ring-2 focus:ring-[#8B9A6E]/50"
                        >
                          <option value="">Select service</option>
                          {services.map((serviceOption) => (
                            <option
                              key={serviceOption.id}
                              value={serviceOption.id}
                            >
                              {serviceOption.name} — {serviceOption.category}
                            </option>
                          ))}
                        </select>

                        {service && (
                          <p className="text-[10px] text-[#96968C]">
                            {formatCurrency(service.price)} / {service.unit}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor={`quantity-${item.id}`}
                          className="text-[11px] font-medium text-[#65695D]"
                        >
                          Quantity
                        </label>
                        <Input
                          id={`quantity-${item.id}`}
                          type="number"
                          min="0.01"
                          step={service?.unit === "SATUAN" ? "1" : "0.01"}
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(
                              item.id,
                              "quantity",
                              event.target.value,
                            )
                          }
                          className="h-10 border-[#E3DED5] bg-white text-xs focus-visible:ring-[#8B9A6E]"
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-dashed border-[#E7E0D6] pt-3">
                      <span className="text-[11px] text-[#858579]">
                        Item subtotal
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-[#34382D]">
                        {formatCurrency(itemSubtotal)}
                      </span>
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                onClick={addItem}
                className="h-9 w-full gap-2 rounded-lg border-dashed border-[#C9D2BD] bg-[#F7F8F3] text-xs font-medium text-[#64764F] hover:border-[#AEBB9D] hover:bg-[#EEF1E7]"
              >
                <Plus size={14} />
                Add another service
              </Button>

              {services.length === 0 && (
                <p className="rounded-lg border border-[#E8DCC1] bg-[#F8F1E5] px-3 py-2.5 text-xs leading-5 text-[#96733D]">
                  No active services are available. Activate a service before creating an order.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="min-w-0 xl:sticky xl:top-5">
          <Card className="overflow-hidden rounded-xl border-[#E7E0D6] bg-white shadow-none">
            <CardHeader className="border-b border-[#EEE9E1] bg-[#F9F8F3] px-4 py-3.5">
              <CardTitle className="font-heading text-sm font-semibold text-[#34382D]">
                Order summary
              </CardTitle>
              <p className="mt-1 text-[11px] text-[#858579]">
                Review before confirming.
              </p>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-3 rounded-lg bg-[#FAF9F6] px-3 py-2.5">
                <span className="text-[11px] text-[#65695D]">
                  Customer
                </span>
                <span className="max-w-[145px] truncate text-right text-[11px] font-medium text-[#454B3A]">
                  {matchedCustomer?.name || name.trim() || "Not specified"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg bg-[#FAF9F6] px-3 py-2.5">
                <span className="text-[11px] text-[#65695D]">
                  Services selected
                </span>
                <span className="text-xs font-semibold tabular-nums text-[#454B3A]">
                  {selectedItems.length}
                </span>
              </div>

              <div className="space-y-3 border-t border-[#EEE9E1] pt-4">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-[#777B70]">Subtotal</span>
                  <span className="font-medium tabular-nums text-[#53594A]">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-[#777B70]">
                    Member discount
                    {activeMembership ? ` (${discountPercent}%)` : ""}
                  </span>
                  <span className="font-medium tabular-nums text-[#628052]">
                    {discount > 0 ? "- " : ""}
                    {formatCurrency(discount)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-[#DDE3D3] bg-[#F0F3EB] p-4">
                <p className="text-[11px] font-medium text-[#657454]">
                  Total amount
                </p>
                <p className="mt-1.5 break-words font-heading text-[25px] font-semibold leading-tight tracking-tight text-[#34382D]">
                  {formatCurrency(total)}
                </p>
                <p className="mt-2 text-[10px] leading-4 text-[#7B856D]">
                  Payment can be recorded after the order is created.
                </p>
              </div>

              {dueAt && (
                <div className="rounded-lg border border-[#E8E3DA] px-3 py-2.5">
                  <p className="text-[10px] font-medium text-[#858579]">
                    Due date
                  </p>
                  <p className="mt-1 break-words text-xs font-medium text-[#53594A]">
                    {new Date(dueAt).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}

              {formError && (
                <div
                  role="alert"
                  className="rounded-lg border border-[#EBD7D2] bg-[#FAEFED] px-3 py-2.5 text-xs leading-5 text-[#A9645A]"
                >
                  {formError}
                </div>
              )}

              <div className="space-y-2 pt-1">
                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    !phone.trim() ||
                    !name.trim() ||
                    selectedItems.length === 0 ||
                    services.length === 0
                  }
                  className="h-10 w-full rounded-lg bg-[#788A61] text-xs font-semibold text-white shadow-none hover:bg-[#64764F] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Creating order..." : "Create order"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/orders")}
                  disabled={submitting}
                  className="h-9 w-full rounded-lg border-[#E3DED5] bg-white text-xs font-medium text-[#65695D] hover:bg-[#F5F2EC]"
                >
                  Cancel
                </Button>
              </div>

              <p className="text-center text-[10px] leading-4 text-[#96968C]">
                Please verify customer details and services before creating the order.
              </p>
            </CardContent>
          </Card>
        </aside>
      </form>
    </div>
  );
};

export default CreateOrderPage;