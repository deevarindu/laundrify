import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../lib/api";
import type {
  Customer,
  Membership,
  Order,
} from "../../types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type CustomerWithMembership = Customer & {
  membership?: Membership | null;
};

const CustomerDetailPage = () => {
  const { id } = useParams();

  const navigate = useNavigate();

  const customerId = Number(id);

  const validCustomerId =
    Number.isInteger(customerId) && customerId > 0;

  const [customer, setCustomer] =
    useState<CustomerWithMembership | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);

  const [loading, setLoading] =
    useState(validCustomerId);

  const [error, setError] = useState(
    validCustomerId
      ? ""
      : "Invalid customer ID."
  );

  useEffect(() => {
    if (!validCustomerId) {
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      try {
        const [
          customerResponse,
          ordersResponse,
        ] = await Promise.all([
          api.get(`/customer/${customerId}`),
          api.get("/order"),
        ]);

        if (cancelled) {
          return;
        }

        const customerData =
          customerResponse.data.data as CustomerWithMembership;

        const allOrders =
          ordersResponse.data.data as Order[];

        setCustomer(customerData);

        setOrders(
          allOrders.filter(
            (order) =>
              order.customerId === customerId
          )
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(error);

        setError(
          "Failed to load customer detail."
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
  }, [customerId, validCustomerId]);

  const formatCurrency = (
    value: number | string
  ) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value));
  };

  const formatDate = (value: string) => {
    return new Date(value).toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
  };

  const getStatusLabel = (
    status: Order["orderStatus"]
  ) => {
    const labels: Record<
      Order["orderStatus"],
      string
    > = {
      PESANAN_DITERIMA: "Received",
      DICUCI: "Washing",
      DIKERINGKAN: "Drying",
      DISETRIKA: "Ironing",
      SIAP_DIAMBIL: "Ready",
      SELESAI: "Completed",
      DIBATALKAN: "Cancelled",
    };

    return labels[status];
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#F7F2EB]">
        <p className="text-sm text-[#73776D]">
          Loading customer detail...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 rounded-3xl border border-[#DED8CF] bg-white p-6">
        <p className="text-sm text-[#B85C5C]">
          {error}
        </p>

        <Button
          type="button"
          onClick={() => navigate("/customers")}
          className="bg-[#8B9A6E] text-white hover:bg-[#7D8C62]"
        >
          Back to Customers
        </Button>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-4 rounded-3xl border border-[#DED8CF] bg-white p-6">
        <p className="text-sm text-[#73776D]">
          Customer not found.
        </p>

        <Button
          type="button"
          onClick={() => navigate("/customers")}
          className="bg-[#8B9A6E] text-white hover:bg-[#7D8C62]"
        >
          Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-8 bg-[#F7F2EB]">
      <section className="rounded-3xl bg-[#8B9A6E] px-6 py-7 text-white shadow-sm md:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/70">
              Customer Profile
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {customer.name}
            </h1>

            <p className="mt-2 text-sm text-white/75">
              Customer information and transaction history.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => navigate("/customers")}
            className="bg-white text-[#4B5141] hover:bg-[#F7F2EB]"
          >
            Back to Customers
          </Button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <Card className="border-[#DED8CF] bg-white shadow-sm">
          <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4]">
            <CardTitle className="text-base font-semibold text-[#4B5141]">
              Customer Information
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                  Name
                </p>

                <p className="mt-2 font-semibold text-[#30352A]">
                  {customer.name}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                  Phone
                </p>

                <p className="mt-2 font-semibold text-[#30352A]">
                  {customer.phone}
                </p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                  Address
                </p>

                <p className="mt-2 text-sm leading-6 text-[#4B5141]">
                  {customer.address ?? "No address provided."}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                  Registered
                </p>

                <p className="mt-2 text-sm text-[#4B5141]">
                  {formatDate(customer.createdAt)}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                  Total Orders
                </p>

                <p className="mt-2 text-xl font-semibold text-[#4B5141]">
                  {orders.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#DED8CF] bg-white shadow-sm">
          <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4]">
            <CardTitle className="text-base font-semibold text-[#4B5141]">
              Membership
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            {customer.membership ? (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                      Member Code
                    </p>

                    <p className="mt-2 font-semibold text-[#30352A]">
                      {customer.membership.memberCode}
                    </p>
                  </div>

                  <Badge
                    className={
                      customer.membership.isActive
                        ? "border-0 bg-[#8B9A6E] text-white hover:bg-[#8B9A6E]"
                        : "border-0 bg-[#EEEEEE] text-[#73776D] hover:bg-[#EEEEEE]"
                    }
                  >
                    {customer.membership.isActive
                      ? "Active"
                      : "Inactive"}
                  </Badge>
                </div>

                <div className="rounded-2xl bg-[#EAE2D6] p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#73776D]">
                    Discount
                  </p>

                  <p className="mt-1 text-2xl font-semibold text-[#4B5141]">
                    {Number(
                      customer.membership.discountPercent
                    )}
                    %
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#8A8D84]">
                    Joined
                  </p>

                  <p className="mt-2 text-sm text-[#4B5141]">
                    {formatDate(
                      customer.membership.joinedAt
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#D8D2C9] bg-[#FAF8F4] p-5">
                <p className="font-medium text-[#4B5141]">
                  No membership
                </p>

                <p className="mt-1 text-sm leading-6 text-[#73776D]">
                  This customer is currently registered
                  as a regular customer.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-[#DED8CF] bg-white shadow-sm">
        <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4]">
          <CardTitle className="text-base font-semibold text-[#4B5141]">
            Order History
          </CardTitle>

          <p className="text-sm text-[#73776D]">
            All orders belonging to this customer.
          </p>
        </CardHeader>

        <CardContent className="p-4 md:p-6">
          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D8D2C9] bg-[#FAF8F4] px-6 py-10 text-center">
              <p className="text-sm text-[#73776D]">
                No orders found for this customer.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() =>
                    navigate(`/orders/${order.id}`)
                  }
                  className="flex w-full flex-col gap-4 rounded-2xl border border-[#E2DDD5] bg-[#FDFCFA] p-5 text-left transition-colors hover:border-[#C8D0B7] hover:bg-[#FAF8F4] md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#30352A]">
                        {order.orderCode}
                      </p>

                      <Badge className="border-0 bg-[#EAE2D6] text-[#4B5141] hover:bg-[#EAE2D6]">
                        {getStatusLabel(
                          order.orderStatus
                        )}
                      </Badge>

                      <Badge
                        className={
                          order.paymentStatus ===
                          "SUDAH_DIBAYAR"
                            ? "border-0 bg-[#8B9A6E] text-white hover:bg-[#8B9A6E]"
                            : "border-0 bg-[#EEEEEE] text-[#73776D] hover:bg-[#EEEEEE]"
                        }
                      >
                        {order.paymentStatus ===
                        "SUDAH_DIBAYAR"
                          ? "Paid"
                          : "Unpaid"}
                      </Badge>
                    </div>

                    <p className="mt-2 text-sm text-[#8A8D84]">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="font-semibold text-[#4B5141]">
                      {formatCurrency(order.total)}
                    </p>

                    <p className="mt-1 text-xs text-[#8A8D84]">
                      View order detail
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerDetailPage;