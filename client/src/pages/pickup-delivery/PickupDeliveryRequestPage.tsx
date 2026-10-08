import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type RequestType = "PICKUP" | "DELIVERY";

const PickupDeliveryRequestPage = () => {
  const navigate = useNavigate();

  const [type, setType] =
    useState<RequestType>("PICKUP");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      setSuccess(false);

      await api.post("/pickup-delivery", {
        name,
        phone,
        address,
        type,
      });

      setSuccess(true);
      setName("");
      setPhone("");
      setAddress("");
      setType("PICKUP");
    } catch (error) {
      console.error(error);

      const message =
        (
          error as {
            response?: {
              data?: {
                message?: string;
              };
            };
          }
        )?.response?.data?.message ??
        "Failed to submit request.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F2EB] px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8B9A6E]">
            Laundrify
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#30352A]">
            Pickup & Delivery
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#73776D]">
            Request laundry pickup or delivery from Laundrify.
          </p>
        </div>

        {success && (
          <div className="mb-5 rounded-2xl border border-[#C8D0B7] bg-[#E7ECDD] px-5 py-4">
            <p className="text-sm font-medium text-[#4B5141]">
              Your request has been submitted successfully.
            </p>

            <p className="mt-1 text-xs text-[#73776D]">
              Our staff will process your request soon.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-[#E3B7B7] bg-[#FFF4F4] px-5 py-4">
            <p className="text-sm text-[#B85C5C]">
              {error}
            </p>
          </div>
        )}

        <Card className="border-[#DED8CF] bg-white shadow-sm">
          <CardHeader className="border-b border-[#EAE2D6] bg-[#FAF8F4]">
            <CardTitle className="text-base font-semibold text-[#4B5141]">
              Request Details
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-[#4B5141]">
                  Request Type
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setType("PICKUP")
                    }
                    className={`rounded-xl border px-4 py-4 text-left transition-colors ${
                      type === "PICKUP"
                        ? "border-[#8B9A6E] bg-[#E7ECDD]"
                        : "border-[#D8D2C9] bg-[#FAF8F4] hover:bg-white"
                    }`}
                  >
                    <p className="text-sm font-semibold text-[#4B5141]">
                      Pickup
                    </p>

                    <p className="mt-1 text-xs text-[#73776D]">
                      We pick up your laundry.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setType("DELIVERY")
                    }
                    className={`rounded-xl border px-4 py-4 text-left transition-colors ${
                      type === "DELIVERY"
                        ? "border-[#8B9A6E] bg-[#E7ECDD]"
                        : "border-[#D8D2C9] bg-[#FAF8F4] hover:bg-white"
                    }`}
                  >
                    <p className="text-sm font-semibold text-[#4B5141]">
                      Delivery
                    </p>

                    <p className="mt-1 text-xs text-[#73776D]">
                      We deliver your laundry.
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-[#4B5141]"
                >
                  Name
                </label>

                <Input
                  id="name"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Enter your name"
                  required
                  className="border-[#D8D2C9] bg-[#FAF8F4] focus-visible:ring-[#8B9A6E]"
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
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  placeholder="e.g. 08123456789"
                  required
                  className="border-[#D8D2C9] bg-[#FAF8F4] focus-visible:ring-[#8B9A6E]"
                />
              </div>

              <div>
                <label
                  htmlFor="address"
                  className="mb-2 block text-sm font-medium text-[#4B5141]"
                >
                  Address
                </label>

                <textarea
                  id="address"
                  value={address}
                  onChange={(event) =>
                    setAddress(event.target.value)
                  }
                  placeholder="Enter your complete address"
                  required
                  rows={4}
                  className="w-full resize-none rounded-md border border-[#D8D2C9] bg-[#FAF8F4] px-3 py-2 text-sm text-[#4B5141] outline-none placeholder:text-[#A2A49E] focus:ring-2 focus:ring-[#8B9A6E]"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#8B9A6E] text-white hover:bg-[#74835A]"
              >
                {loading
                  ? "Submitting..."
                  : "Submit Request"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigate("/login")
                }
                className="w-full border-[#C8D0B7] bg-[#F0F2E9] text-[#4B5141] hover:bg-[#E0E7D5]"
              >
                Staff Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PickupDeliveryRequestPage;