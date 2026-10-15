import axios from "axios";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { loginSchema } from "../schemas/authSchema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const result = loginSchema.safeParse({
      email,
      password,
    });

    if (!result.success) {
      setError(
        result.error.issues[0]?.message ??
          "Invalid login data."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.post(
        "/auth/login",
        result.data
      );

      const { user, token } = response.data.data;

      login(user, token);
      navigate("/dashboard");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.message ??
            "Failed to login."
        );
      } else {
        setError("Failed to login.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f2eb] p-4 sm:p-6 lg:p-10">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1440px] overflow-hidden rounded-[24px] border border-[#e7e0d5] bg-[#fbf9f5] sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.05fr_0.95fr] lg:rounded-[30px]">
        <section className="relative flex min-h-[330px] flex-col justify-between overflow-hidden bg-[#8b9a6e] px-7 py-8 text-[#fbf9f5] sm:min-h-[390px] sm:px-10 sm:py-10 lg:min-h-0 lg:px-14 lg:py-12 xl:px-16 xl:py-14">
          <div className="pointer-events-none absolute -right-28 top-16 size-[340px] rounded-full border border-white/15 sm:-right-36 sm:top-12 sm:size-[480px] lg:-right-40 lg:top-24 lg:size-[580px]" />

          <div className="pointer-events-none absolute -right-12 top-32 size-[240px] rounded-full border border-white/20 sm:-right-20 sm:top-28 sm:size-[350px] lg:-right-24 lg:top-40 lg:size-[430px]" />

          <div className="pointer-events-none absolute right-12 top-[210px] size-3 rounded-full bg-[#d9dfc7] sm:right-20 sm:top-[260px] lg:right-24 lg:top-[300px]" />

          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[25px] font-semibold tracking-[-1.6px]">
              laundrify
            </span>

            <span className="rounded-full border border-white/30 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[2px] text-white/90">
              Laundry care
            </span>
          </div>

          <div className="relative z-10 my-12 max-w-[480px] lg:my-auto lg:py-20">
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[3px] text-white/75">
              A better way to care
            </p>

            <h2 className="max-w-[460px] text-[42px] font-medium leading-[1.08] tracking-[-2.2px] sm:text-[54px] sm:leading-[1.06] lg:text-[60px] xl:text-[68px]">
              Good care.
              <br />
              <span className="font-normal italic text-[#e2e6d4]">
                Lighter days.
              </span>
            </h2>

            <p className="mt-6 max-w-[340px] text-sm leading-7 text-white/80 sm:text-[15px]">
              Thoughtful laundry management, designed to make everyday work feel a little easier.
            </p>

            <div className="mt-9 flex items-center gap-3">
              <span className="h-px w-10 bg-[#e2e6d4]" />
              <span className="text-xs tracking-wide text-white/85">
                Made for a smoother routine
              </span>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-white/20 pt-5 text-[11px] text-white/70">
            <span>Care in every detail.</span>
            <span>01 / 01</span>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12 sm:px-12 sm:py-16 lg:px-12 xl:px-20">
          <div className="w-full max-w-[390px]">
            <div className="mb-10">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[2.5px] text-[#8b9a6e]">
                Staff portal
              </p>

              <h1 className="text-[34px] font-medium leading-tight tracking-[-1.5px] text-[#34382d] sm:text-[39px]">
                Welcome
                <br />
                back.
              </h1>

              <p className="mt-4 text-sm leading-6 text-[#77786d]">
                Sign in to continue managing your laundry operations.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
                >
                  {error}
                </div>
              )}

              <div className="space-y-2.5">
                <label
                  htmlFor="email"
                  className="block text-[13px] font-medium text-[#45483d]"
                >
                  Email address
                </label>

                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="youremail@mail.com"
                  autoComplete="email"
                  className="h-[50px] rounded-xl border-[#e2ddd3] bg-white px-4 text-sm text-[#34382d] shadow-none transition-colors placeholder:text-[#aaa99f] focus-visible:border-[#8b9a6e] focus-visible:ring-2 focus-visible:ring-[#8b9a6e]/15"
                />
              </div>

              <div className="space-y-2.5">
                <label
                  htmlFor="password"
                  className="block text-[13px] font-medium text-[#45483d]"
                >
                  Password
                </label>

                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="h-[50px] rounded-xl border-[#e2ddd3] bg-white px-4 text-sm text-[#34382d] shadow-none transition-colors placeholder:text-[#aaa99f] focus-visible:border-[#8b9a6e] focus-visible:ring-2 focus-visible:ring-[#8b9a6e]/15"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="group h-[50px] w-full rounded-xl bg-[#34382d] text-sm font-medium text-white shadow-none transition-all duration-200 hover:bg-[#4a5040] disabled:opacity-60"
              >
                <span>
                  {loading ? "Signing in..." : "Sign in"}
                </span>

                {!loading && (
                  <ArrowRight className="ml-auto size-4 transition-transform duration-200 group-hover:translate-x-1" />
                )}
              </Button>
            </form>

            <div className="mt-8 border-t border-[#e8e2d8] pt-6">
              <p className="text-center text-xs leading-6 text-[#858579]">
                Don't have an account? Contact your administrator.
              </p>
            </div>

            <p className="mt-12 text-center text-[10px] uppercase tracking-[1.8px] text-[#aaa99f]">
              © {new Date().getFullYear()} Laundrify
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default LoginPage;