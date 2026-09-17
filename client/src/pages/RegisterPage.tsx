import axios from "axios";
import { useState } from "react";
import {
  ArrowRight,
  Check,
} from "lucide-react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import api from "../lib/api";

import { registerSchema } from "../schemas/authSchema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RegisterPage = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");

  const handleSubmit = async (
    e: React.SubmitEvent
  ) => {
    e.preventDefault();

    const result = registerSchema.safeParse({
      name,
      email,
      password,
      confirmPassword,
    });

    if (!result.success) {
      setError(
        result.error.issues[0]?.message ??
          "Invalid registration data."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      await api.post(
        "/auth/register",
        result.data
      );

      setSuccess(
        "Account created successfully. Redirecting to login..."
      );

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.message ??
            "Failed to create account."
        );
      } else {
        setError(
          "Failed to create account."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f2eb] px-5 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-[28px] border border-[#e3dbcf] bg-white p-7 shadow-[0_18px_50px_rgba(48,53,42,0.08)] sm:p-9">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-[#30352a]">
              Create account
            </h1>

            <p className="mt-2 text-sm text-[#73776d]">
              Create a staff account to access Laundrify.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-start gap-3 rounded-xl border border-[#cbd5b7] bg-[#f2f5ec] px-4 py-3 text-sm text-[#5f6e49]">
                <Check className="mt-0.5 size-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-[#4b5141]"
              >
                Full Name
              </label>

              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="Your full name"
                autoComplete="name"
                className="h-11 rounded-xl border-[#d8d2c9] bg-[#faf9f6]"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="register-email"
                className="text-sm font-medium text-[#4b5141]"
              >
                Email
              </label>

              <Input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="you@example.com"
                autoComplete="email"
                className="h-11 rounded-xl border-[#d8d2c9] bg-[#faf9f6]"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="register-password"
                className="text-sm font-medium text-[#4b5141]"
              >
                Password
              </label>

              <Input
                id="register-password"
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="At least 6 characters"
                autoComplete="new-password"
                className="h-11 rounded-xl border-[#d8d2c9] bg-[#faf9f6]"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirm-password"
                className="text-sm font-medium text-[#4b5141]"
              >
                Confirm Password
              </label>

              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="Repeat your password"
                autoComplete="new-password"
                className="h-11 rounded-xl border-[#d8d2c9] bg-[#faf9f6]"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-[#8b9a6e] text-white hover:bg-[#7b8a60]"
            >
              {loading ? (
                "Creating account..."
              ) : (
                <>
                  Create Account
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-7 border-t border-[#eae2d6] pt-6 text-center">
            <p className="text-sm text-[#73776d]">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-[#68764f] underline underline-offset-4"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;