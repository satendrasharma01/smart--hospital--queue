import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Activity } from "lucide-react";
import { useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setError("");
      setLoading(true);

      const response = await api.post("/auth/register", formData);

      login(response.data.user);

      navigate("/login");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to create account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
        <div className="grid w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-2">

          <div className="hidden bg-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <Link to="/" className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-900">
                  <Activity size={19} />
                </div>

                <span className="font-semibold">
                  Smart Hospital
                </span>
              </Link>

              <div className="mt-24 max-w-md">
                <p className="text-sm font-medium text-slate-400">
                  GET STARTED
                </p>

                <h1 className="mt-4 text-4xl font-semibold leading-tight">
                  Your next appointment starts here.
                </h1>

                <p className="mt-5 leading-7 text-slate-400">
                  Create your account and keep your hospital visits
                  organized in one place.
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-500">
              Your information stays protected.
            </p>
          </div>

          <div className="p-8 sm:p-12">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft size={16} />
              Back to home
            </Link>

            <div className="mx-auto mt-10 max-w-md">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                Create your account
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Start managing your appointments with Smart Hospital.
              </p>

              <form
                onSubmit={handleSubmit}
                className="mt-8 space-y-5"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Full name
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Email
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Password
                  </label>

                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 6 characters"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />

                  {error && (
                    <p className="mt-2 text-sm text-red-600">
                      {error}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-slate-900 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Creating account..." : "Create account"}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-slate-500">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-medium text-slate-900 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Register;