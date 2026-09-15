import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Droplets,
  Mail,
  MapPin,
  Phone,
  Search,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const GENDERS = [
  "male",
  "female",
  "other",
];

const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

function AdminPatients() {
  const { user } = useAuth();
  const token = user ? "session" : null;

  const [patients, setPatients] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [gender, setGender] =
    useState("");

  const [bloodGroup, setBloodGroup] =
    useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  });

  const [selectedPatient, setSelectedPatient] =
    useState(null);

  /*
   * =====================================================
   * FETCH PATIENTS
   * =====================================================
   */

  const fetchPatients = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError("");

      const response =
        await api.get(
          `/admin/patients?page=${page}&limit=20&search=${encodeURIComponent(search.trim())}&gender=${encodeURIComponent(gender)}&bloodGroup=${encodeURIComponent(bloodGroup)}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      setPatients(
        response.data?.patients ||
          []
      );
      setPagination(response.data?.pagination || {
        page,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      });
    } catch (error) {
      console.error(
        "Admin patients error:",
        error
      );

      setError(
        error.response?.data
          ?.message ||
          "Unable to load patients."
      );
    } finally {
      setLoading(false);
    }
  }, [token, page, search, gender, bloodGroup]);

  useEffect(() => {
    fetchPatients();
  }, [token, fetchPatients]);

  const filteredPatients = patients;

  /*
   * =====================================================
   * SUMMARY
   * =====================================================
   */

  const totalPatients =
    patients.length;

  const activePatients =
    patients.filter(
      (patient) =>
        Number(
          patient.activeAppointmentCount
        ) > 0
    ).length;

  const completedAppointments =
    patients.reduce(
      (total, patient) =>
        total +
        Number(
          patient.completedAppointmentCount ||
            0
        ),
      0
    );

  const totalAppointments =
    patients.reduce(
      (total, patient) =>
        total +
        Number(
          patient.appointmentCount ||
            0
        ),
      0
    );

  /*
   * =====================================================
   * RESET FILTERS
   * =====================================================
   */

  const clearFilters = () => {
    setSearch("");
    setGender("");
    setBloodGroup("");
    setPage(1);
  };

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <p className="text-sm font-medium text-slate-500">
            Smart Hospital
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Patient Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage registered patients and
            view their appointment activity.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* =================================================
            SUMMARY CARDS
        ================================================= */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={UserRound}
            label="Total Patients"
            value={totalPatients}
          />

          <SummaryCard
            icon={Activity}
            label="Active Patients"
            value={activePatients}
          />

          <SummaryCard
            icon={CalendarDays}
            label="Total Appointments"
            value={totalAppointments}
          />

          <SummaryCard
            icon={CheckCircle2}
            label="Completed Appointments"
            value={
              completedAppointments
            }
          />
        </div>

        {/* =================================================
            SEARCH / FILTER
        ================================================= */}

        <section className="mt-7 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_auto]">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  (setSearch(event.target.value), setPage(1))
                }
                placeholder="Search name, email, phone or address..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <select
              value={gender}
              onChange={(event) =>
                (setGender(event.target.value), setPage(1))
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900"
            >
              <option value="">
                All genders
              </option>

              {GENDERS.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {capitalize(item)}
                  </option>
                )
              )}
            </select>

            <select
              value={bloodGroup}
              onChange={(event) =>
                (setBloodGroup(event.target.value), setPage(1))
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900"
            >
              <option value="">
                All blood groups
              </option>

              {BLOOD_GROUPS.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>

            {(search ||
              gender ||
              bloodGroup) && (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <X size={16} />
                Clear
              </button>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing{" "}
              {patients.length} of {pagination.total} patients
            </p>
          </div>
        </section>

        {/* =================================================
            PATIENT LIST
        ================================================= */}

        {loading ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

            <p className="mt-4 text-sm text-slate-500">
              Loading patients...
            </p>
          </div>
        ) : filteredPatients.length ===
          0 ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-12 text-center">
            <UserRound
              size={32}
              className="mx-auto text-slate-400"
            />

            <h2 className="mt-4 font-semibold text-slate-900">
              No patients found
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or
              filters.
            </p>
            {pagination.total > 0 && (
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                hasNext={pagination.hasNext}
                hasPrevious={pagination.hasPrevious}
                onPrevious={() => setPage((value) => Math.max(value - 1, 1))}
                onNext={() => setPage((value) => value + 1)}
              />
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {filteredPatients.map(
              (patient) => (
                <PatientCard
                  key={
                    patient._id
                  }
                  patient={
                    patient
                  }
                  onView={() =>
                    setSelectedPatient(
                      patient
                    )
                  }
                />
              )
            )}
            {!loading && pagination.totalPages > 1 && (
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                hasNext={pagination.hasNext}
                hasPrevious={pagination.hasPrevious}
                onPrevious={() => setPage((value) => Math.max(value - 1, 1))}
                onNext={() => setPage((value) => value + 1)}
              />
            )}
          </div>
        )}
      </main>

      {/* ===================================================
          PATIENT DETAILS MODAL
      =================================================== */}

      {selectedPatient && (
        <PatientDetailsModal
          patient={
            selectedPatient
          }
          onClose={() =>
            setSelectedPatient(
              null
            )
          }
        />
      )}
    </div>
  );
}

/*
 * =====================================================
 * SUMMARY CARD
 * =====================================================
 */

function SummaryCard({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
          <Icon size={19} />
        </div>

        <span className="text-2xl font-semibold text-slate-900">
          {value}
        </span>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        {label}
      </p>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  hasNext,
  hasPrevious,
  onPrevious,
  onNext,
}) {
  return (
    <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!hasPrevious}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>
      <span className="text-sm text-slate-600">
        Page {page} of {totalPages || 1}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!hasNext}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}

/*
 * =====================================================
 * PATIENT CARD
 * =====================================================
 */

function PatientCard({
  patient,
  onView,
}) {
  const profileImage =
    patient.user?.profileImage
      ?.url;

  const name =
    patient.user?.name ||
    "Patient";

  const email =
    patient.user?.email ||
    "Email not provided";

  const activeCount =
    Number(
      patient.activeAppointmentCount ||
        0
    );

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        {/* PATIENT */}

        <div className="flex min-w-0 items-center gap-4">
          {profileImage ? (
            <img
              src={profileImage}
              alt={name}
              className="h-14 w-14 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100">
              <UserRound
                size={23}
                className="text-slate-500"
              />
            </div>
          )}

          <div className="min-w-0">
            <h2 className="truncate font-semibold text-slate-900">
              {name}
            </h2>

            <p className="mt-1 flex items-center gap-2 truncate text-sm text-slate-500">
              <Mail size={14} />
              {email}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {patient.bloodGroup && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                  <Droplets size={12} />
                  {
                    patient.bloodGroup
                  }
                </span>
              )}

              {patient.gender && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs capitalize text-slate-600">
                  {
                    patient.gender
                  }
                </span>
              )}
            </div>
          </div>
        </div>

        {/* BASIC INFO */}

        <div className="grid gap-4 sm:grid-cols-3 xl:min-w-[500px]">
          <Info
            icon={Phone}
            label="Phone"
            value={
              patient.phone ||
              "Not provided"
            }
          />

          <Info
            icon={CalendarDays}
            label="Date of birth"
            value={
              patient.dateOfBirth
                ? formatDate(
                    patient.dateOfBirth
                  )
                : "Not provided"
            }
          />

          <Info
            icon={MapPin}
            label="Address"
            value={
              patient.address ||
              "Not provided"
            }
          />
        </div>

        {/* STATS */}

        <div className="grid grid-cols-3 gap-3 xl:min-w-[300px]">
          <Stat
            label="Appointments"
            value={
              patient.appointmentCount ||
              0
            }
          />

          <Stat
            label="Active"
            value={activeCount}
          />

          <Stat
            label="Completed"
            value={
              patient.completedAppointmentCount ||
              0
            }
          />
        </div>

        {/* ACTION */}

        <button
          type="button"
          onClick={onView}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          View Details
        </button>
      </div>
    </article>
  );
}

/*
 * =====================================================
 * INFO
 * =====================================================
 */

function Info({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs text-slate-400">
        <Icon size={13} />
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  );
}

/*
 * =====================================================
 * STAT
 * =====================================================
 */

function Stat({
  label,
  value,
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-center">
      <p className="text-lg font-semibold text-slate-900">
        {value}
      </p>

      <p className="mt-0.5 text-[11px] text-slate-500">
        {label}
      </p>
    </div>
  );
}

/*
 * =====================================================
 * PATIENT DETAILS MODAL
 * =====================================================
 */

function PatientDetailsModal({
  patient,
  onClose,
}) {
  const profileImage =
    patient.user?.profileImage
      ?.url;

  const name =
    patient.user?.name ||
    "Patient";

  const email =
    patient.user?.email ||
    "Not provided";

  const latest =
    patient.latestAppointment;

  const latestDoctor =
    latest?.doctor?.user
      ?.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* HEADER */}

        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div className="flex items-center gap-4">
            {profileImage ? (
              <img
                src={profileImage}
                alt={name}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <UserRound
                  size={22}
                />
              </div>
            )}

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Patient Details
              </p>

              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                {name}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={19} />
          </button>
        </div>

        {/* BODY */}

        <div className="space-y-7 p-6">
          {/* PROFILE */}

          <section>
            <h3 className="font-semibold text-slate-900">
              Personal Information
            </h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Detail
                label="Phone"
                value={
                  patient.phone ||
                  "Not provided"
                }
              />

              <Detail
                label="Date of birth"
                value={
                  patient.dateOfBirth
                    ? formatDate(
                        patient.dateOfBirth
                      )
                    : "Not provided"
                }
              />

              <Detail
                label="Gender"
                value={
                  patient.gender
                    ? capitalize(
                        patient.gender
                      )
                    : "Not provided"
                }
              />

              <Detail
                label="Blood group"
                value={
                  patient.bloodGroup ||
                  "Not provided"
                }
              />

              <Detail
                label="Address"
                value={
                  patient.address ||
                  "Not provided"
                }
              />

              <Detail
                label="Registered"
                value={
                  patient.user
                    ?.createdAt
                    ? formatDate(
                        patient.user
                          .createdAt
                      )
                    : "Not available"
                }
              />
            </div>
          </section>

          {/* APPOINTMENT SUMMARY */}

          <section className="border-t border-slate-100 pt-6">
            <h3 className="font-semibold text-slate-900">
              Appointment Summary
            </h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <SummaryBox
                icon={
                  CalendarDays
                }
                label="Total"
                value={
                  patient.appointmentCount ||
                  0
                }
              />

              <SummaryBox
                icon={Clock3}
                label="Active"
                value={
                  patient.activeAppointmentCount ||
                  0
                }
              />

              <SummaryBox
                icon={
                  CheckCircle2
                }
                label="Completed"
                value={
                  patient.completedAppointmentCount ||
                  0
                }
              />
            </div>
          </section>

          {/* LATEST APPOINTMENT */}

          <section className="border-t border-slate-100 pt-6">
            <h3 className="font-semibold text-slate-900">
              Latest Appointment
            </h3>

            {!latest ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-6 text-center">
                <CalendarDays
                  size={25}
                  className="mx-auto text-slate-400"
                />

                <p className="mt-3 text-sm text-slate-500">
                  No appointment history
                  available.
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-slate-200 p-5">
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <Detail
                    label="Date"
                    value={
                      latest.appointmentDate
                        ? formatDateTime(
                            latest.appointmentDate
                          )
                        : "Not available"
                    }
                  />

                  <Detail
                    label="Token"
                    value={
                      latest.tokenNumber
                        ? `#${latest.tokenNumber}`
                        : "Not available"
                    }
                  />

                  <Detail
                    label="Status"
                    value={
                      latest.status
                        ? capitalize(
                            latest.status.replace(
                              "-",
                              " "
                            )
                          )
                        : "Not available"
                    }
                  />

                  <Detail
                    label="Doctor"
                    value={
                      latestDoctor ||
                      "Not available"
                    }
                  />
                </div>

                {latest.reason && (
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-400">
                      Reason for visit
                    </p>

                    <p className="mt-1 text-sm text-slate-700">
                      {
                        latest.reason
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* CANCELLED */}

          {Number(
            patient.cancelledAppointmentCount ||
              0
          ) > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <XCircle
                size={19}
                className="text-amber-600"
              />

              <div>
                <p className="text-sm font-medium text-amber-800">
                  Cancelled appointments
                </p>

                <p className="mt-0.5 text-xs text-amber-700">
                  {
                    patient.cancelledAppointmentCount
                  }{" "}
                  cancelled appointment
                  {patient.cancelledAppointmentCount !==
                  1
                    ? "s"
                    : ""}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}

        <div className="border-t border-slate-200 bg-slate-50 p-4 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/*
 * =====================================================
 * DETAIL BOX
 * =====================================================
 */

function Detail({
  label,
  value,
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-slate-900">
        {value}
      </p>
    </div>
  );
}

/*
 * =====================================================
 * SUMMARY BOX
 * =====================================================
 */

function SummaryBox({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
        <Icon size={18} />
      </div>

      <div>
        <p className="text-lg font-semibold text-slate-900">
          {value}
        </p>

        <p className="text-xs text-slate-500">
          {label}
        </p>
      </div>
    </div>
  );
}

/*
 * =====================================================
 * HELPERS
 * =====================================================
 */

function capitalize(value) {
  if (!value) {
    return "";
  }

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

function formatDate(value) {
  return new Date(
    value
  ).toLocaleDateString(
    "en-IN",
    {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}

function formatDateTime(value) {
  return new Date(
    value
  ).toLocaleString(
    "en-US",
    {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  );
}

export default AdminPatients;