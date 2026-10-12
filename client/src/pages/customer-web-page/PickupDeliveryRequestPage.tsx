import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ServiceOption = {
  id: number;
  name: string;
  category: string;
  unit: string;
  price: number | string;
  isActive: boolean;
};

const PickupDeliveryRequestPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successCode, setSuccessCode] = useState("");

  useEffect(() => {
    let active = true;

    const loadServices = async () => {
      try {
        const response = await api.get("/service");
        const result = response.data?.data;

        if (!Array.isArray(result)) {
          throw new Error("Invalid service data received from server.");
        }

        const activeServices = (result as ServiceOption[]).filter(
          (service) =>
            service.isActive &&
            Number.isInteger(Number(service.id)) &&
            Number(service.id) > 0,
        );

        if (active) {
          setServices(activeServices);
        }
      } catch {
        if (active) {
          setError("Failed to load laundry services. Please try again later.");
        }
      } finally {
        if (active) {
          setLoadingServices(false);
        }
      }
    };

    void loadServices();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    setError("");
    setSuccessCode("");

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();
    const selectedServiceId = Number(serviceId);

    if (!trimmedName || !trimmedPhone || !trimmedAddress) {
      setError("Name, phone number, and address are required.");
      return;
    }

    if (trimmedName.length > 100) {
      setError("Name must not exceed 100 characters.");
      return;
    }

    if (
      trimmedPhone.length > 30 ||
      !/^[0-9+()\-\s]+$/.test(trimmedPhone)
    ) {
      setError("Please enter a valid phone number.");
      return;
    }

    if (trimmedAddress.length > 500) {
      setError("Address must not exceed 500 characters.");
      return;
    }

    if (
      !serviceId ||
      !Number.isInteger(selectedServiceId) ||
      selectedServiceId <= 0 ||
      !services.some((service) => Number(service.id) === selectedServiceId)
    ) {
      setError("Please select a valid laundry service.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/pickup-delivery", {
        name: trimmedName,
        phone: trimmedPhone,
        address: trimmedAddress,
        type: "PICKUP",
        serviceId: selectedServiceId,
      });

      const requestCode = response.data?.data?.requestCode;

      if (typeof requestCode !== "string" || !requestCode.trim()) {
        setError(
          "The request may have been submitted, but the tracking code was not returned. Please check before submitting again.",
        );
        return;
      }

      setSuccessCode(requestCode);
      setName("");
      setPhone("");
      setAddress("");
      setServiceId("");
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "response" in error
          ? (
              error as {
                response?: {
                  data?: {
                    message?: string;
                  };
                };
              }
            ).response?.data?.message
          : undefined;

      setError(
        message ??
          (error instanceof Error
            ? error.message
            : "Failed to submit request. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F2EB] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center sm:mb-10">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7ECDD] text-[#74835A]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-7 w-7"
              aria-hidden="true"
            >
              <path
                d="M12 3 5 7v10l7 4 7-4V7l-7-4Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M8 13c2-3 6-3 8 0M10 15.5c1.2-1.5 2.8-1.5 4 0"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8B9A6E]">
            Laundrify
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#30352A] sm:text-4xl">
            Pickup Request
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#73776D]">
            Let us take care of your laundry. Fill in your details to request a
            pickup from your location.
          </p>
        </div>

        {successCode && (
          <div
            role="status"
            className="mb-5 rounded-2xl border border-[#C8D0B7] bg-[#E7ECDD] p-5 sm:p-6"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#74835A]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path
                  d="m5 12 4 4L19 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <p className="text-base font-semibold text-[#4B5141]">
              Your pickup request is submitted!
            </p>

            <p className="mt-2 text-sm leading-6 text-[#626B57]">
              Save your tracking code to check your request status.
            </p>

            <p className="my-4 break-all rounded-xl border border-[#E5E8DC] bg-white px-4 py-4 text-center text-lg font-bold tracking-wide text-[#4B5141]">
              {successCode}
            </p>

            <Button
              type="button"
              onClick={() =>
                navigate("/track", {
                  state: { requestCode: successCode },
                })
              }
              className="h-11 w-full rounded-xl bg-[#8B9A6E] text-white hover:bg-[#74835A]"
            >
              Track My Request
            </Button>

            <button
              type="button"
              onClick={() => setSuccessCode("")}
              className="mt-3 w-full py-2 text-sm font-medium text-[#59684C] transition hover:text-[#30352A]"
            >
              Submit another request
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-[#E3B7B7] bg-[#FFF4F4] px-5 py-4"
          >
            <p className="text-sm leading-6 text-[#B85C5C]">{error}</p>
          </div>
        )}

        {!successCode && (
          <Card className="overflow-hidden rounded-2xl border-[#DED8CF] bg-white shadow-[0_12px_35px_rgba(48,53,42,0.06)]">
            <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4] px-5 py-5 sm:px-6">
              <CardTitle className="text-base font-semibold text-[#4B5141]">
                Request Details
              </CardTitle>
              <p className="text-sm leading-5 text-[#85877E]">
                Please provide the details for your laundry pickup.
              </p>
            </CardHeader>

            <CardContent className="p-5 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="serviceId"
                    className="mb-2 block text-sm font-medium text-[#4B5141]"
                  >
                    Laundry Service
                  </label>

                  <select
                    id="serviceId"
                    value={serviceId}
                    onChange={(event) => setServiceId(event.target.value)}
                    required
                    disabled={
                      loading || loadingServices || services.length === 0
                    }
                    className="h-11 w-full rounded-xl border border-[#D8D2C9] bg-[#FAF8F4] px-3 text-sm text-[#4B5141] outline-none transition focus:border-[#8B9A6E] focus:ring-2 focus:ring-[#8B9A6E]/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">
                      {loadingServices
                        ? "Loading services..."
                        : "Select a laundry service"}
                    </option>

                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} · {service.category} · {service.unit} ·
                        Rp{Number(service.price).toLocaleString("id-ID")}
                      </option>
                    ))}
                  </select>

                  {!loadingServices && services.length === 0 && (
                    <p className="mt-2 text-xs leading-5 text-[#B85C5C]">
                      No active services are currently available.
                    </p>
                  )}

                  {serviceId && (
                    <p className="mt-2 text-xs text-[#73776D]">
                      Price:{" "}
                      <span className="font-semibold text-[#667953]">
                        Rp
                        {Number(
                          services.find(
                            (service) => String(service.id) === serviceId,
                          )?.price ?? 0,
                        ).toLocaleString("id-ID")}
                      </span>{" "}
                      per {services.find(
                        (service) => String(service.id) === serviceId,
                      )?.unit}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium text-[#4B5141]"
                  >
                    Full Name
                  </label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    maxLength={100}
                    required
                    disabled={loading}
                    className="h-11 rounded-xl border-[#D8D2C9] bg-[#FAF8F4] focus-visible:ring-[#8B9A6E]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-medium text-[#4B5141]"
                  >
                    Phone Number
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="e.g. 08123456789"
                    autoComplete="tel"
                    maxLength={30}
                    required
                    disabled={loading}
                    className="h-11 rounded-xl border-[#D8D2C9] bg-[#FAF8F4] focus-visible:ring-[#8B9A6E]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="address"
                    className="mb-2 block text-sm font-medium text-[#4B5141]"
                  >
                    Pickup Address
                  </label>
                  <textarea
                    id="address"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="Enter your complete pickup address"
                    autoComplete="street-address"
                    maxLength={500}
                    required
                    disabled={loading}
                    rows={4}
                    className="w-full resize-y rounded-xl border border-[#D8D2C9] bg-[#FAF8F4] px-3 py-3 text-sm leading-6 text-[#4B5141] outline-none transition placeholder:text-[#A2A49E] focus:border-[#8B9A6E] focus:ring-2 focus:ring-[#8B9A6E]/30 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <p className="mt-1 text-right text-xs text-[#A2A49E]">
                    {address.length}/500
                  </p>
                </div>

                <div className="rounded-xl bg-[#F3F4ED] px-4 py-3">
                  <p className="text-xs leading-5 text-[#69745E]">
                    Please double-check your phone number and address so our
                    staff can coordinate your pickup.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={
                    loading ||
                    loadingServices ||
                    services.length === 0
                  }
                  className="h-11 w-full rounded-xl bg-[#8B9A6E] font-medium text-white transition hover:bg-[#74835A] disabled:opacity-60"
                >
                  {loading ? "Submitting..." : "Submit Pickup Request"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={() => navigate("/login")}
                  className="h-11 w-full rounded-xl border-[#D8D2C9] bg-white text-[#4B5141] hover:bg-[#F7F5F0]"
                >
                  Staff Login
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-center text-xs text-[#929388]">
          Laundrify · Laundry care made simple.
        </p>
      </div>
    </div>
  );
};

export default PickupDeliveryRequestPage;