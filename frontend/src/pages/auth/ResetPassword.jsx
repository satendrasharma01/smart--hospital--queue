import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  LockKeyhole,
} from "lucide-react";
import api from "../../services/api";

function ResetPassword() {
  const [searchParams] = useSearchParams();

  const resetToken = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSuccess("");
    setError("");

    if (!resetToken) {
      setError(
        "This password reset link is invalid or incomplete."
      );
      return;
    }

    if (!password || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post(
        "/auth/reset-password",
        {
          token: resetToken,
          password,
        }
      );

      setSuccess(
        response.data.message ||
          "Password reset successfully."
      );

      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to reset password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to login
          </Link>

          <div className="mt-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <LockKeyhole size={22} />
            </div>

            <h1 className="mt-5 text-2xl font-semibold text-slate-900">
              Create new password
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter a new password for your Smart Hospital
              account.
            </p>
          </div>

          {success && (
            <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex gap-3">
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-green-600"
                />

                <div>
                  <p className="text-sm text-green-700">
                    {success}
                  </p>

                  <Link
                    to="/login"
                    className="mt-2 inline-block text-sm font-medium text-green-800 underline"
                  >
                    Go to login
                  </Link>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-600">
                {error}
              </p>
            </div>
          )}

          {!success && (
            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  New password
                </label>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Confirm new password
                </label>

                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !resetToken}
                className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Updating password..."
                  : "Reset password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
