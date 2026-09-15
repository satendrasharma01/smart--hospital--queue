import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  ChevronRight,
  Mail,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";

import { Link } from "react-router-dom";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import DoctorSidebar from "../../components/DoctorSidebar";

function DoctorPatients() {
  const { token } = useAuth();

  const [patients, setPatients] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
   * =====================================================
   * FETCH PATIENTS
   * =====================================================
   */

  const fetchPatients = useCallback(
    async () => {
      if (!token) {
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          "/doctors/patients",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setPatients(
          response.data?.patients || []
        );
      } catch (error) {
        console.error(
          "Fetch doctor patients error:",
          error
        );

        setError(
          error.response?.data?.message ||
            "Unable to load patients."
        );
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  /*
   * =====================================================
   * INITIAL LOAD
   * =====================================================
   */

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  /*
   * =====================================================
   * SEARCH
   * =====================================================
   */

  const filteredPatients =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      if (!value) {
        return patients;
      }

      return patients.filter(
        (patient) => {
          const name =
            patient.user?.name ||
            "";

          const email =
            patient.user?.email ||
            "";

          return (
            name
              .toLowerCase()
              .includes(value) ||
            email
              .toLowerCase()
              .includes(value)
          );
        }
      );
    }, [patients, search]);

  /*
   * =====================================================
   * FORMAT DATE
   * =====================================================
   */

  const formatDate = (value) => {
    if (!value) {
      return "No appointment";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
  };

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DoctorSidebar />

      <div className="min-w-0 flex-1">
        {/* Header */}

        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Smart Hospital
              </p>

              <p className="text-xs text-slate-500">
                Doctor Patients
              </p>
            </div>

            <button
              type="button"
              onClick={fetchPatients}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
          {/* Heading */}

          <div>
            <p className="text-sm text-slate-500">
              Doctor Portal
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              My Patients
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Patients who have appointments with
              you.
            </p>
          </div>

          {/* Search */}

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search patient by name or email..."
                className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Users size={17} />

              <span>
                {filteredPatients.length}{" "}
                patient
                {filteredPatients.length !==
                1
                  ? "s"
                  : ""}
              </span>
            </div>
          </div>

          {/* Error */}

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* Loading */}

          {loading ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-10 text-center">
              <RefreshCw
                size={25}
                className="mx-auto animate-spin text-slate-400"
              />

              <p className="mt-3 text-sm text-slate-500">
                Loading patients...
              </p>
            </div>
          ) : filteredPatients.length ===
            0 ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-10 text-center">
              <Users
                size={30}
                className="mx-auto text-slate-400"
              />

              <h2 className="mt-4 font-medium text-slate-900">
                {search
                  ? "No matching patients"
                  : "No patients yet"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {search
                  ? "Try a different name or email."
                  : "Patients will appear here after they book an appointment with you."}
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {/* Desktop header */}

              <div className="hidden border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[1.5fr_1.5fr_120px_160px_40px] md:gap-4">
                <span>Patient</span>

                <span>Email</span>

                <span>Appointments</span>

                <span>Last Appointment</span>

                <span />
              </div>

              {filteredPatients.map(
                (patient) => (
                  <div
                    key={patient._id}
                    className="border-b border-slate-100 p-5 last:border-b-0 md:grid md:grid-cols-[1.5fr_1.5fr_120px_160px_40px] md:items-center md:gap-4"
                  >
                    {/* Patient */}

                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                        <Users
                          size={18}
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {patient.user
                            ?.name ||
                            "Patient"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500 md:hidden">
                          {patient.user
                            ?.email ||
                            "No email"}
                        </p>
                      </div>
                    </div>

                    {/* Email */}

                    <div className="mt-4 hidden min-w-0 md:block">
                      <div className="flex items-center gap-2">
                        <Mail
                          size={15}
                          className="shrink-0 text-slate-400"
                        />

                        <p className="truncate text-sm text-slate-600">
                          {patient.user
                            ?.email ||
                            "No email"}
                        </p>
                      </div>
                    </div>

                    {/* Appointment Count */}

                    <div className="mt-4 md:mt-0">
                      <p className="text-xs text-slate-500 md:hidden">
                        Appointments
                      </p>

                      <p className="mt-1 text-sm font-medium text-slate-900 md:mt-0">
                        {patient.appointmentCount ||
                          0}
                      </p>
                    </div>

                    {/* Last Appointment */}

                    <div className="mt-4 md:mt-0">
                      <p className="text-xs text-slate-500 md:hidden">
                        Last appointment
                      </p>

                      <div className="mt-1 flex items-center gap-2 md:mt-0">
                        <CalendarDays
                          size={15}
                          className="text-slate-400"
                        />

                        <p className="text-sm text-slate-600">
                          {formatDate(
                            patient
                              .latestAppointment
                              ?.appointmentDate
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Details */}

                    <div className="mt-4 md:mt-0">
                      <Link
                        to={`/doctor/patients/${patient._id}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                        title="View patient"
                      >
                        <ChevronRight
                          size={18}
                        />
                      </Link>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default DoctorPatients;