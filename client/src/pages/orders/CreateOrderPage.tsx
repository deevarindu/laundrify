import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import type {
  Customer,
  Membership,
  Service,
} from "../../types";
import {
  createOrderSchema,
} from "../../schemas/orderSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

type OrderItemForm = {
  id: string;
  serviceId: string;
  quantity: string;
};

const CreateOrderPage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] =
    useState<Customer[]>([]);
  const [memberships, setMemberships] =
    useState<Membership[]>([]);
  const [services, setServices] =
    useState<Service[]>([]);
  const [customerId, setCustomerId] =
    useState("");
  const [dueAt, setDueAt] =
    useState("");
  const [items, setItems] =
    useState<OrderItemForm[]>([
      {
        id: crypto.randomUUID(),
        serviceId: "",
        quantity: "1",
      },
    ]);
  const [loading, setLoading] =
    useState(true);
  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] =
    useState("");
  const [formError, setFormError] =
    useState("");

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

        if (cancelled) {
          return;
        }

        setCustomers(
          customersResponse.data.data
        );
        setMemberships(
          membershipsResponse.data.data
        );
        setServices(
          servicesResponse.data.data.filter(
            (service: Service) =>
              service.isActive
          )
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(error);
        setError(
          "Failed to load order form data."
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
  }, []);

  const selectedCustomer = useMemo(() => {
    return customers.find(
      (customer) =>
        customer.id === Number(customerId)
    );
  }, [customers, customerId]);

  const activeMembership = useMemo(() => {
    if (!selectedCustomer) {
      return null;
    }

    return (
      memberships.find(
        (membership) =>
          membership.customerId ===
            selectedCustomer.id &&
          membership.isActive
      ) ?? null
    );
  }, [memberships, selectedCustomer]);

  const selectedItems = useMemo(() => {
    return items
      .map((item) => {
        const service = services.find(
          (currentService) =>
            currentService.id ===
            Number(item.serviceId)
        );

        const quantity =
          Number(item.quantity);

        if (
          !service ||
          !Number.isFinite(quantity)
        ) {
          return null;
        }

        const subtotal =
          Number(service.price) * quantity;

        return {
          id: item.id,
          serviceId: service.id,
          service,
          quantity,
          subtotal,
        };
      })
      .filter(
        (
          item
        ): item is {
          id: string;
          serviceId: number;
          service: Service;
          quantity: number;
          subtotal: number;
        } => item !== null
      );
  }, [items, services]);

  const subtotal = useMemo(() => {
    return selectedItems.reduce(
      (sum, item) =>
        sum + item.subtotal,
      0
    );
  }, [selectedItems]);

  const discountPercent = Number(
    activeMembership?.discountPercent ?? 0
  );

  const discount = useMemo(() => {
    return (
      subtotal *
      (discountPercent / 100)
    );
  }, [subtotal, discountPercent]);

  const total = subtotal - discount;

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

  const updateItem = (
    itemId: string,
    field:
      | "serviceId"
      | "quantity",
    value: string
  ) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
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
  };

  const removeItem = (
    itemId: string
  ) => {
    setItems((currentItems) => {
      if (currentItems.length === 1) {
        return currentItems;
      }

      return currentItems.filter(
        (item) =>
          item.id !== itemId
      );
    });
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const parsedItems = items.map(
      (item) => ({
        serviceId: Number(
          item.serviceId
        ),
        quantity: Number(
          item.quantity
        ),
      })
    );

    const result =
      createOrderSchema.safeParse({
        customerId: Number(
          customerId
        ),
        items: parsedItems,
        dueAt:
          dueAt || undefined,
      });

    if (!result.success) {
      setFormError(
        result.error.issues[0]?.message ??
          "Invalid order data."
      );
      return;
    }

    const hasInvalidService =
      parsedItems.some(
        (item) =>
          !Number.isInteger(
            item.serviceId
          ) ||
          item.serviceId <= 0 ||
          !Number.isFinite(
            item.quantity
          ) ||
          item.quantity <= 0
      );

    if (hasInvalidService) {
      setFormError(
        "Please select a valid service and quantity."
      );
      return;
    }

    if (
      parsedItems.some((item) => {
        const service = services.find(
          (currentService) =>
            currentService.id ===
            item.serviceId
        );

        return (
          service?.unit ===
            "SATUAN" &&
          !Number.isInteger(
            item.quantity
          )
        );
      })
    ) {
      setFormError(
        "Satuan services require a whole number quantity."
      );
      return;
    }

    const serviceIds =
      parsedItems.map(
        (item) => item.serviceId
      );

    if (
      new Set(serviceIds).size !==
      serviceIds.length
    ) {
      setFormError(
        "Each service can only be added once."
      );
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");

      const response = await api.post(
        "/order",
        {
          customerId:
            result.data.customerId,
          items: result.data.items,
          dueAt:
            result.data.dueAt,
        }
      );

      const createdOrder =
        response.data.data;

      navigate(
        `/orders/${createdOrder.id}`
      );
    } catch (error) {
      console.error(error);
      setFormError(
        "Failed to create order."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#F7F2EB]">
        <p className="text-sm text-[#73776D]">
          Loading order form...
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
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">
            Order Management
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Create Laundry Order
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
            Create a new order and add one or more laundry services.
          </p>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 xl:grid-cols-[1fr_340px]"
      >
        <div className="space-y-6">
          <Card className="border-[#DED8CF] bg-white shadow-sm">
            <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4]">
              <CardTitle className="text-base font-semibold text-[#4B5141]">
                Customer
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-5 p-5">
              <div className="space-y-2">
                <label
                  htmlFor="customer"
                  className="text-sm font-medium text-[#4B5141]"
                >
                  Customer
                </label>

                <Combobox
                  items={customers}
                  value={
                    selectedCustomer ?? null
                  }
                  onValueChange={(
                    customer
                  ) => {
                    setCustomerId(
                      customer
                        ? String(customer.id)
                        : ""
                    );
                  }}
                  itemToStringValue={(
                    customer
                  ) =>
                    customer
                      ? customer.name
                      : ""
                  }
                >
                  <ComboboxInput
                    id="customer"
                    placeholder="Search customer name or phone..."
                    showClear
                    className="w-full"
                  />

                  <ComboboxContent>
                    <ComboboxEmpty>
                      No customer found.
                    </ComboboxEmpty>

                    <ComboboxList>
                      {(customer) => (
                        <ComboboxItem
                          key={customer.id}
                          value={customer}
                          className="py-2.5"
                        >
                          <div className="flex min-w-0 flex-col">
                            <span className="font-medium text-[#30352A]">
                              {customer.name}
                            </span>
                            <span className="text-xs text-[#73776D]">
                              {customer.phone}
                            </span>
                          </div>
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>

              {selectedCustomer && (
                <div className="rounded-2xl bg-[#EAE2D6] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-[#30352A]">
                        {selectedCustomer.name}
                      </p>
                      <p className="mt-1 text-sm text-[#73776D]">
                        {selectedCustomer.phone}
                      </p>
                      <p className="mt-1 text-sm text-[#8A8D84]">
                        {selectedCustomer.address ??
                          "-"}
                      </p>
                    </div>

                    {activeMembership && (
                      <Badge className="w-fit border-0 bg-[#8B9A6E] text-white hover:bg-[#8B9A6E]">
                        {Number(
                          activeMembership.discountPercent
                        )}
                        % Member Discount
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="due-at"
                  className="text-sm font-medium text-[#4B5141]"
                >
                  Due Date
                </label>

                <Input
                  id="due-at"
                  type="datetime-local"
                  value={dueAt}
                  onChange={(event) =>
                    setDueAt(
                      event.target.value
                    )
                  }
                  className="border-[#D8D2C9] bg-[#FAF8F4] focus-visible:ring-[#8B9A6E]"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#DED8CF] bg-white shadow-sm">
            <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4]">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-[#4B5141]">
                    Services
                  </CardTitle>
                  <p className="mt-1 text-xs text-[#73776D]">
                    Add services to this order.
                  </p>
                </div>

                <Badge className="border-0 bg-[#E7ECDD] text-[#4B5141] hover:bg-[#E7ECDD]">
                  {items.length} item
                  {items.length !== 1
                    ? "s"
                    : ""}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 p-5">
              {items.map((item) => {
                const service =
                  services.find(
                    (currentService) =>
                      currentService.id ===
                      Number(
                        item.serviceId
                      )
                  );

                const quantity =
                  Number(item.quantity) ||
                  0;

                const itemSubtotal =
                  service
                    ? Number(
                        service.price
                      ) * quantity
                    : 0;

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[#E2DDD5] bg-[#FDFCFA] p-4"
                  >
                    <div className="grid gap-4 md:grid-cols-[1fr_140px_150px_auto] md:items-end">
                      <div className="space-y-2">
                        <label
                          htmlFor={`service-${item.id}`}
                          className="text-sm font-medium text-[#4B5141]"
                        >
                          Service
                        </label>

                        <select
                          id={`service-${item.id}`}
                          value={
                            item.serviceId
                          }
                          onChange={(
                            event
                          ) =>
                            updateItem(
                              item.id,
                              "serviceId",
                              event.target
                                .value
                            )
                          }
                          className="flex h-10 w-full rounded-md border border-[#D8D2C9] bg-white px-3 py-2 text-sm text-[#4B5141] outline-none focus:ring-2 focus:ring-[#8B9A6E]"
                        >
                          <option value="">
                            Select service
                          </option>

                          {services.map(
                            (
                              serviceOption
                            ) => (
                              <option
                                key={
                                  serviceOption.id
                                }
                                value={
                                  serviceOption.id
                                }
                              >
                                {
                                  serviceOption.name
                                }{" "}
                                —{" "}
                                {
                                  serviceOption.category
                                }
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor={`quantity-${item.id}`}
                          className="text-sm font-medium text-[#4B5141]"
                        >
                          Quantity
                        </label>

                        <Input
                          id={`quantity-${item.id}`}
                          type="number"
                          min="0.01"
                          step={
                            service?.unit ===
                            "SATUAN"
                              ? "1"
                              : "0.01"
                          }
                          value={
                            item.quantity
                          }
                          onChange={(
                            event
                          ) =>
                            updateItem(
                              item.id,
                              "quantity",
                              event.target
                                .value
                            )
                          }
                          className="border-[#D8D2C9] bg-white focus-visible:ring-[#8B9A6E]"
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-[#4B5141]">
                          Subtotal
                        </p>

                        <div className="flex h-10 items-center rounded-md border border-[#D8D2C9] bg-[#F7F2EB] px-3 text-sm font-medium text-[#4B5141]">
                          {formatCurrency(
                            itemSubtotal
                          )}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          removeItem(
                            item.id
                          )
                        }
                        disabled={
                          items.length === 1
                        }
                        className="h-10"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                onClick={addItem}
                className="border-[#C8D0B7] bg-[#F0F2E9] text-[#4B5141] hover:bg-[#E0E7D5]"
              >
                + Add Service
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <Card className="overflow-hidden border-[#DED8CF] bg-white shadow-sm">
            <CardHeader className="border-b border-[#EAE2D6] bg-[#8B9A6E] text-white">
              <CardTitle className="text-base font-semibold">
                Order Summary
              </CardTitle>
              <p className="text-sm text-white/75">
                Review the order before creating it.
              </p>
            </CardHeader>

            <CardContent className="space-y-5 p-5">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#73776D]">
                    Subtotal
                  </span>

                  <span className="font-medium text-[#4B5141]">
                    {formatCurrency(
                      subtotal
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-[#73776D]">
                    Discount
                    {activeMembership
                      ? ` (${discountPercent}%)`
                      : ""}
                  </span>

                  <span className="font-medium text-[#4B5141]">
                    -{" "}
                    {formatCurrency(
                      discount
                    )}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-[#E7ECDD] p-4">
                <div className="flex items-end justify-between gap-4">
                  <span className="text-sm font-medium text-[#4B5141]">
                    Total
                  </span>

                  <span className="text-xl font-semibold text-[#30352A]">
                    {formatCurrency(
                      total
                    )}
                  </span>
                </div>
              </div>

              {formError && (
                <div className="rounded-xl bg-[#F4E7E3] px-4 py-3 text-sm leading-5 text-[#B85C5C]">
                  {formError}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    !customerId ||
                    items.length === 0
                  }
                  className="w-full bg-[#8B9A6E] text-white hover:bg-[#7D8C62]"
                >
                  {submitting
                    ? "Creating..."
                    : "Create Order"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    navigate("/orders")
                  }
                  disabled={submitting}
                  className="w-full border-[#D8D2C9] bg-white text-[#4B5141] hover:bg-[#EAE2D6]"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
};

export default CreateOrderPage;