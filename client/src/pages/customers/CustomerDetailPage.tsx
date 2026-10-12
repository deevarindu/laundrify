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
  const [loading, setLoading] = useState(validCustomerId);
  const [error, setError] = useState(
    validCustomerId ? "" : "Invalid customer ID."
  );

  useEffect(() => {
    if (!validCustomerId) {
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      try {
        const [customerResponse, ordersResponse] =
          await Promise.all([
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
            (order) => order.customerId === customerId
          )
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(error);
        setError("Failed to load customer detail.");
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

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value));
  };

  const formatDate = (value: string) => {
    return new Date(value).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusLabel = (status: Order["orderStatus"]) => {
    const labels: Record<Order["orderStatus"], string> = {
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

  const getStatusClass = (status: Order["orderStatus"]) => {
    const classes: Record<Order["orderStatus"], string> = {
      PESANAN_DITERIMA:
        "border-blue-200 bg-blue-50 text-blue-700",
      DICUCI:
        "border-sky-200 bg-sky-50 text-sky-700",
      DIKERINGKAN:
        "border-amber-200 bg-amber-50 text-amber-700",
      DISETRIKA:
        "border-violet-200 bg-violet-50 text-violet-700",
      SIAP_DIAMBIL:
        "border-[#D7DFC9] bg-[#F0F3E9] text-[#62734D]",
      SELESAI:
        "border-[#D7DFC9] bg-[#E8EEE0] text-[#536744]",
      DIBATALKAN:
        "border-red-200 bg-red-50 text-red-700",
    };

    return classes[status];
  };

  const getInitials = (name: string) => {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#DDE3D3] border-t-[#879778]" />
          <p className="text-sm text-[#85877F]">
            Loading customer detail...
          </p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#343A35]">
            Customer Details
          </h1>
          <p className="mt-1 text-sm text-[#85877F]">
            View customer information and transaction history.
          </p>
        </div>

        <Card className="border-[#E7E5DF] shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5EAE7] text-lg text-[#B85C5C]">
              !
            </div>
            <div className="space-y-1">
              <p className="font-medium text-[#343A35]">
                {error
                  ? "Unable to load customer"
                  : "Customer not found"}
              </p>
              <p className="text-sm text-[#85877F]">
                {error ||
                  "The requested customer could not be found."}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/customers")}
              className="mt-2 border-[#DCDDD5] text-[#4B5141] hover:bg-[#F7F7F2]"
            >
              Back to Customers
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#E8EDDF] text-lg font-semibold text-[#657653]">
            {getInitials(customer.name)}
          </div>

          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#92948C]">
                Customer Details
              </p>
              {customer.membership && (
                <Badge
                  variant="outline"
                  className="border-[#D7DFC9] bg-[#F0F3E9] text-[#62734D]"
                >
                  Member
                </Badge>
              )}
            </div>

            <h1 className="truncate text-2xl font-semibold tracking-tight text-[#343A35] sm:text-3xl">
              {customer.name}
            </h1>

            <p className="mt-1 text-sm text-[#85877F]">
              Customer profile and transaction history
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/customers")}
          className="shrink-0 border-[#DEDED6] bg-white text-[#4B5141] hover:bg-[#F7F7F2]"
        >
          <span aria-hidden="true" className="mr-2 text-base">
            ←
          </span>
          Back to Customers
        </Button>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-[#E7E5DF] bg-white shadow-none">
          <CardContent className="p-5">
            <p className="text-sm text-[#85877F]">
              Total Orders
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[#343A35]">
              {orders.length}
            </p>
            <p className="mt-1 text-xs text-[#A0A197]">
              All customer transactions
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#E7E5DF] bg-white shadow-none">
          <CardContent className="p-5">
            <p className="text-sm text-[#85877F]">
              Completed Orders
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[#343A35]">
              {
                orders.filter(
                  (order) => order.orderStatus === "SELESAI"
                ).length
              }
            </p>
            <p className="mt-1 text-xs text-[#A0A197]">
              Successfully completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#E7E5DF] bg-white shadow-none">
          <CardContent className="p-5">
            <p className="text-sm text-[#85877F]">
              Unpaid Orders
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[#343A35]">
              {
                orders.filter(
                  (order) =>
                    order.paymentStatus !== "SUDAH_DIBAYAR"
                ).length
              }
            </p>
            <p className="mt-1 text-xs text-[#A0A197]">
              Awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#E7E5DF] bg-white shadow-none">
          <CardContent className="p-5">
            <p className="text-sm text-[#85877F]">
              Membership Discount
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[#657653]">
              {customer.membership
                ? `${Number(customer.membership.discountPercent)}%`
                : "—"}
            </p>
            <p className="mt-1 text-xs text-[#A0A197]">
              {customer.membership
                ? customer.membership.isActive
                  ? "Active membership"
                  : "Inactive membership"
                : "Regular customer"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-[#E7E5DF] bg-white shadow-none">
          <CardHeader className="border-b border-[#ECEBE5] px-5 py-4">
            <CardTitle className="text-base font-semibold text-[#343A35]">
              Customer Information
            </CardTitle>
            <p className="text-sm text-[#85877F]">
              Personal details and registration information.
            </p>
          </CardHeader>

          <CardContent className="p-5">
            <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-[#92948C]">
                  Full Name
                </p>
                <p className="mt-2 break-words text-sm font-medium text-[#343A35]">
                  {customer.name}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-[#92948C]">
                  Phone Number
                </p>
                <p className="mt-2 break-words text-sm font-medium text-[#343A35]">
                  {customer.phone}
                </p>
              </div>

              <div className="min-w-0 sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wider text-[#92948C]">
                  Address
                </p>
                <p className="mt-2 break-words text-sm leading-6 text-[#55594F]">
                  {customer.address || "No address provided."}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#92948C]">
                  Registration Date
                </p>
                <p className="mt-2 text-sm font-medium text-[#343A35]">
                  {formatDate(customer.createdAt)}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#92948C]">
                  Customer Type
                </p>
                <p className="mt-2 text-sm font-medium text-[#343A35]">
                  {customer.membership
                    ? "Membership Customer"
                    : "Regular Customer"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E7E5DF] bg-white shadow-none">
          <CardHeader className="border-b border-[#ECEBE5] px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold text-[#343A35]">
                  Membership
                </CardTitle>
                <p className="mt-1 text-sm text-[#85877F]">
                  Membership status and benefits.
                </p>
              </div>

              {customer.membership && (
                <Badge
                  variant="outline"
                  className={
                    customer.membership.isActive
                      ? "shrink-0 border-[#D7DFC9] bg-[#F0F3E9] text-[#62734D]"
                      : "shrink-0 border-[#E5E5E0] bg-[#F5F5F2] text-[#85877F]"
                  }
                >
                  {customer.membership.isActive
                    ? "Active"
                    : "Inactive"}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-5">
            {customer.membership ? (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#92948C]">
                    Member Code
                  </p>
                  <p className="mt-2 break-all font-semibold text-[#343A35]">
                    {customer.membership.memberCode}
                  </p>
                </div>

                <div className="rounded-xl border border-[#E3E8DA] bg-[#F6F8F2] p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#758465]">
                    Membership Discount
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <p className="text-3xl font-semibold tracking-tight text-[#5E704D]">
                      {Number(
                        customer.membership.discountPercent
                      )}
                      <span className="ml-0.5 text-xl">%</span>
                    </p>
                    <span className="pb-1 text-xs text-[#758465]">
                      Discount benefit
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#92948C]">
                    Membership Since
                  </p>
                  <p className="mt-2 text-sm font-medium text-[#343A35]">
                    {formatDate(customer.membership.joinedAt)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[190px] flex-col items-center justify-center rounded-xl border border-dashed border-[#E1E0D8] bg-[#FAFAF7] px-5 py-8 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EDEDE5] text-lg text-[#85877F]">
                  —
                </div>
                <p className="mt-3 text-sm font-medium text-[#454940]">
                  No Membership
                </p>
                <p className="mt-1 max-w-[250px] text-sm leading-6 text-[#85877F]">
                  This customer is currently registered as a regular customer.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-[#E7E5DF] bg-white shadow-none">
        <CardHeader className="gap-1 border-b border-[#ECEBE5] px-5 py-4">
          <CardTitle className="text-base font-semibold text-[#343A35]">
            Order History
          </CardTitle>
          <p className="text-sm text-[#85877F]">
            All transactions associated with this customer.
          </p>
        </CardHeader>

        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F1EB] text-[#85877F]">
                —
              </div>
              <p className="mt-3 text-sm font-medium text-[#454940]">
                No orders found
              </p>
              <p className="mt-1 text-sm text-[#85877F]">
                This customer has no transaction history yet.
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#ECEBE5] bg-[#FAFAF7]">
                    <th className="px-5 py-3.5 font-medium text-[#85877F]">
                      Order
                    </th>
                    <th className="px-5 py-3.5 font-medium text-[#85877F]">
                      Date
                    </th>
                    <th className="px-5 py-3.5 font-medium text-[#85877F]">
                      Order Status
                    </th>
                    <th className="px-5 py-3.5 font-medium text-[#85877F]">
                      Payment
                    </th>
                    <th className="px-5 py-3.5 text-right font-medium text-[#85877F]">
                      Total Amount
                    </th>
                    <th className="px-5 py-3.5 text-right font-medium text-[#85877F]">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#F0EFEA]">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-[#FAFAF7]"
                    >
                      <td className="px-5 py-4">
                        <span className="font-medium text-[#343A35]">
                          {order.orderCode}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-[#686B62]">
                        {formatDate(order.createdAt)}
                      </td>

                      <td className="px-5 py-4">
                        <Badge
                          variant="outline"
                          className={getStatusClass(
                            order.orderStatus
                          )}
                        >
                          {getStatusLabel(order.orderStatus)}
                        </Badge>
                      </td>

                      <td className="px-5 py-4">
                        <Badge
                          variant="outline"
                          className={
                            order.paymentStatus === "SUDAH_DIBAYAR"
                              ? "border-[#D7DFC9] bg-[#F0F3E9] text-[#62734D]"
                              : "border-[#E9DDC5] bg-[#FAF4E8] text-[#967443]"
                          }
                        >
                          {order.paymentStatus === "SUDAH_DIBAYAR"
                            ? "Paid"
                            : "Unpaid"}
                        </Badge>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right font-medium tabular-nums text-[#343A35]">
                        {formatCurrency(order.total)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/order/${order.id}`)
                          }
                          className="text-[#657653] hover:bg-[#EEF1E8] hover:text-[#4B5B3B]"
                        >
                          View Details
                          <span
                            aria-hidden="true"
                            className="ml-1"
                          >
                            →
                          </span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {orders.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-[#ECEBE5] bg-[#FAFAF7] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#85877F]">
                Showing {orders.length}{" "}
                {orders.length === 1 ? "order" : "orders"}
              </p>
              <p className="text-xs text-[#85877F]">
                Customer transaction history
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerDetailPage;