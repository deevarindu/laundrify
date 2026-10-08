import type { FormEvent } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import axios from "axios";

type RequestType = "PICKUP" | "DELIVERY";

export default function PickupDeliveryRequest() {
  const [type, setType] = useState<RequestType>("PICKUP");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [service, setService] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSuccess("");
    setError("");
    setIsLoading(true);

    try {
      await api.post("/pickup-delivery", {
        name,
        phone,
        address,
        type,
      });

      setSuccess(
        "Your request has been submitted successfully."
      );

      setName("");
      setPhone("");
      setAddress("");
      setType("PICKUP");
      setService("");
    } catch (error: unknown) {
      console.log(error);

      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.message ||
            "Failed to submit your request."
        );
      } else {
        setError("Failed to submit your request.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#f7f2eb] text-[#30352e]">
      <div className="w-full px-5">
        <div className="mx-auto w-full max-w-[430px]">
          <header className="flex w-full items-center justify-between py-6">
            <Link
              to="/"
              className="text-xl font-semibold tracking-tight"
            >
              Laundrify
            </Link>

            <Link
              to="/track"
              className="text-sm font-medium text-gray-500"
            >
              Track Order
            </Link>
          </header>

          <form
            onSubmit={handleSubmit}
            className="w-full space-y-6 pb-10"
          >
            <div>
              <p className="mb-3 text-sm font-semibold">
                Request type
              </p>

              <div className="grid w-full grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType("PICKUP")}
                  className={`min-w-0 min-h-12 rounded-xl border px-3 text-sm font-semibold transition active:scale-[0.99] ${
                    type === "PICKUP"
                      ? "border-[#8b9a6e] bg-[#eef1e7] text-[#687653]"
                      : "border-[#ded8cf] bg-white text-[#73776d]"
                  }`}
                >
                  Pickup
                </button>

                <button
                  type="button"
                  onClick={() => setType("DELIVERY")}
                  className={`min-w-0 min-h-12 rounded-xl border px-3 text-sm font-semibold transition active:scale-[0.99] ${
                    type === "DELIVERY"
                      ? "border-[#8b9a6e] bg-[#eef1e7] text-[#687653]"
                      : "border-[#ded8cf] bg-white text-[#73776d]"
                  }`}
                >
                  Delivery
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Name
              </label>

              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                placeholder="Your name"
                className="box-border min-h-12 w-full min-w-0 rounded-xl border border-[#ded8cf] bg-white px-4 text-base outline-none transition placeholder:text-gray-400 focus:border-[#8b9a6e]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Phone number
              </label>

              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                type="tel"
                inputMode="tel"
                placeholder="08xxxxxxxxxx"
                className="box-border min-h-12 w-full min-w-0 rounded-xl border border-[#ded8cf] bg-white px-4 text-base outline-none transition placeholder:text-gray-400 focus:border-[#8b9a6e]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Address
              </label>

              <textarea
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                required
                rows={4}
                placeholder="Your address"
                className="box-border w-full min-w-0 resize-none rounded-xl border border-[#ded8cf] bg-white px-4 py-3 text-base outline-none transition placeholder:text-gray-400 focus:border-[#8b9a6e]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Service
              </label>

              <input
                value={service}
                onChange={(event) => setService(event.target.value)}
                required
                type="service"
                placeholder="Cuci Kering Setrika"
                className="box-border min-h-12 w-full min-w-0 rounded-xl border border-[#ded8cf] bg-white px-4 text-base outline-none transition placeholder:text-gray-400 focus:border-[#8b9a6e]"
              />
            </div>

            {success && (
              <div className="box-border w-full rounded-xl bg-[#eef1e7] p-4 text-sm leading-6 text-[#687653]">
                {success}
              </div>
            )}

            {error && (
              <div className="box-border w-full rounded-xl bg-[#fbebeb] p-4 text-sm leading-6 text-[#b85c5c]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="box-border min-h-14 w-full rounded-xl bg-[#8b9a6e] px-5 text-sm font-semibold text-white transition hover:bg-[#78875f] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}