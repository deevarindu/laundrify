import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Service } from "../types/service";
import api from "../lib/api";

const formatPrice = (price: number | string) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(price));
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchServices = async () => {
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

        console.log(error);
        setError("Failed to load services.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchServices();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F2EB]">
        <p className="text-sm text-[#73776D]">
          Loading services...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F7F2EB] px-6 py-12">
        <div className="mx-auto max-w-4xl rounded-2xl border border-[#DED8CF] bg-white p-6">
          <p className="text-sm text-[#B85C5C]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F2EB] text-[#30352E]">
      <header className="border-b border-[#DED8CF] bg-[#F7F2EB]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="text-2xl font-bold">
            Laundrify
          </Link>

          <Link
            to="/"
            className="text-sm text-[#73776D] hover:text-[#30352E]"
          >
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B9A6E]">
            Services
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Choose your laundry service
          </h1>

          <p className="mt-3 max-w-xl text-[#73776D]">
            Simple laundry services for your everyday needs.
          </p>
        </div>

        {services.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-[#DED8CF] bg-white p-8 text-center">
            <p className="text-[#73776D]">
              No services available right now.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services
              .filter((service) => service.isActive)
              .map((service) => (
                <div
                  key={service.id}
                  className="rounded-2xl border border-[#DED8CF] bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold">
                        {service.name}
                      </p>

                      <p className="mt-1 text-sm text-[#73776D]">
                        {service.category}
                      </p>
                    </div>

                    <span className="rounded-full bg-[#EEF1E7] px-3 py-1 text-xs font-medium text-[#687653]">
                      {service.unit}
                    </span>
                  </div>

                  <div className="mt-8">
                    <p className="text-2xl font-bold text-[#8B9A6E]">
                      {formatPrice(service.price)}
                    </p>

                    <p className="mt-1 text-xs text-[#73776D]">
                      per {service.unit === "KG" ? "kg" : "item"}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}

        <div className="mt-10">
          <Link
            to="/pickup-delivery"
            className="inline-flex rounded-xl bg-[#8B9A6E] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Request Pickup
          </Link>
        </div>
      </main>
    </div>
  );
}