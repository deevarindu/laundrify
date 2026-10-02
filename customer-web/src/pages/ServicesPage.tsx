import { useEffect, useState } from "react";
import type { Service } from "../types/service";
import api from "../lib/api";



export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading,setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = true;

    const fetchServices = async () => {
      try {
        const response = await api.get("/service")

        if (cancelled) {
          return
        }    

        setServices(response.data.data);
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.log(error);
        setError("Error to load data")
      } finally {
        setIsLoading(false);
      }
    }

    fetchServices();

    return () => {
      cancelled = true;
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#F7F2EB]">
        <p className="text-sm text-[#73776D]">
          Loading services...
        </p>
      </div>
    )
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
    <div>
      <p>
        {services.length}
      </p>
    </div>
  )
}