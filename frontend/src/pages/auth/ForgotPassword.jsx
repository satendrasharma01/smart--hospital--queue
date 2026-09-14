import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import api from "../../services/api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/forgot-password", {
        email: email.trim(),
      });

      setMessage(
        response.data.message ||
          "If an account exists, a password reset link has been sent."
      );
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to process password reset request."
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
              <Mail size={22} />
            </div>

            <h1 className="mt-5 text-2xl font-semibold text-slate-900">
              Forgot password?
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter your registered email address and we'll send
              you a secure password reset link.
            </p>
          </div>

          {message && (
            <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex gap-3">
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-green-600"
                />

                <p className="text-sm leading-5 text-green-700">
                  {message}
                </p>
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

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-5"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Sending..."
                : "Send reset link"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Remember your password?{" "}
            <Link
              to="/login"
              className="font-medium text-slate-900 hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;