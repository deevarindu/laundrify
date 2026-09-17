import axios from "axios";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

import { loginSchema } from "../schemas/authSchema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (
    e: React.SubmitEvent
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

      const { user, token } =
        response.data.data;

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
    <div className="flex min-h-screen items-center justify-center bg-[#f7f2eb] px-5 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-[28px] border border-[#e3dbcf] bg-white p-7 shadow-[0_18px_50px_rgba(48,53,42,0.08)] sm:p-9">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-[#30352a]">
              Sign in
            </h1>

            <p className="mt-2 text-sm text-[#73776d]">
              Sign in to your Laundrify account.
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

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-[#4b5141]"
              >
                Email
              </label>

              <Input
                id="email"
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
                htmlFor="password"
                className="text-sm font-medium text-[#4b5141]"
              >
                Password
              </label>

              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                className="h-11 rounded-xl border-[#d8d2c9] bg-[#faf9f6]"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-[#8b9a6e] text-white hover:bg-[#7b8a60]"
            >
              {loading ? (
                "Signing in..."
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-7 border-t border-[#eae2d6] pt-6 text-center">
            <p className="text-sm text-[#73776d]">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-[#68764f] underline underline-offset-4"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;