import { useEffect, useState } from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Search,
  Stethoscope,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const STATUS_OPTIONS = [
  "booked",
  "waiting",
  "in-progress",
  "completed",
  "cancelled",
];

function AdminAppointments() {
  const { user } = useAuth();
  const token = user ? "session" : null;

  const [appointments, setAppointments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [dateFilter, setDateFilter] =
    useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  });

  const [selectedAppointment, setSelectedAppointment] =
    useState(null);

  /*
   * =====================================================
   * FETCH APPOINTMENTS
   * =====================================================
   */

  useEffect(() => {
    const fetchAppointments =
      async () => {
        if (!token) return;

        try {
          setLoading(true);
          setError("");

          const response =
            await api.get(
              `/admin/appointments?page=${page}&limit=20&search=${encodeURIComponent(search.trim())}&status=${encodeURIComponent(status)}${dateFilter ? `&dateFrom=${dateFilter}T00:00:00&dateTo=${dateFilter}T23:59:59` : ""}`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          setAppointments(
            response.data
              ?.appointments || []
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
            "Admin appointments error:",
            error
          );

          setError(
            error.response?.data
              ?.message ||
              "Unable to load appointments."
          );
        } finally {
          setLoading(false);
        }
      };

    fetchAppointments();
  }, [token, page, search, status, dateFilter]);

  /*
   * =====================================================
   * FILTER APPOINTMENTS
   * =====================================================
   */

  const filteredAppointments = appointments;

  /*
   * =====================================================
   * SUMMARY
   * =====================================================
   */

  const total = pagination.total;

  const booked =
    appointments.filter(
      (item) =>
        item.status ===
        "booked"
    ).length;

  const active =
    appointments.filter(
      (item) =>
        [
          "waiting",
          "in-progress",
        ].includes(
          item.status
        )
    ).length;

  const completed =
    appointments.filter(
      (item) =>
        item.status ===
        "completed"
    ).length;

  const cancelled =
    appointments.filter(
      (item) =>
        item.status ===
        "cancelled"
    ).length;

  /*
   * =====================================================
   * CLEAR FILTERS
   * =====================================================
   */

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setDateFilter("");
    setPage(1);
  };

  const hasFilters =
    search ||
    status ||
    dateFilter;

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <p className="text-sm font-medium text-slate-500">
            Smart Hospital
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Appointment Management
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Monitor appointments across the
            hospital system.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* SUMMARY */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            icon={CalendarDays}
            label="Total"
            value={total}
          />

          <SummaryCard
            icon={Clock3}
            label="Booked"
            value={booked}
          />

          <SummaryCard
            icon={Activity}
            label="Active"
            value={active}
          />

          <SummaryCard
            icon={CheckCircle2}
            label="Completed"
            value={completed}
          />

          <SummaryCard
            icon={XCircle}
            label="Cancelled"
            value={cancelled}
          />
        </div>

        {/* FILTERS */}

        <section className="mt-7 rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_auto]">
            {/* SEARCH */}

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
                placeholder="Search patient, doctor, email or reason..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {/* STATUS */}

            <select
              value={status}
              onChange={(event) =>
                (setStatus(event.target.value), setPage(1))
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900"
            >
              <option value="">
                All statuses
              </option>

              {STATUS_OPTIONS.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {formatStatus(
                      item
                    )}
                  </option>
                )
              )}
            </select>

            {/* DATE */}

            <input
              type="date"
              value={dateFilter}
              onChange={(event) =>
                (setDateFilter(event.target.value), setPage(1))
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900"
            />

            {/* CLEAR */}

            {hasFilters ? (
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
            ) : (
              <div />
            )}
          </div>

          <div className="mt-3">
            <p className="text-xs text-slate-500">
              Showing{" "}
              {
                filteredAppointments.length
              }{" "}
              of {total} appointments
            </p>
          </div>
        </section>

        {/* LIST */}

        {loading ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

            <p className="mt-4 text-sm text-slate-500">
              Loading appointments...
            </p>
          </div>
        ) : filteredAppointments.length ===
          0 ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-12 text-center">
            <CalendarDays
              size={32}
              className="mx-auto text-slate-400"
            />

            <h2 className="mt-4 font-semibold text-slate-900">
              No appointments found
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
            {filteredAppointments.map(
              (appointment) => (
                <AppointmentCard
                  key={
                    appointment._id
                  }
                  appointment={
                    appointment
                  }
                  onView={() =>
                    setSelectedAppointment(
                      appointment
                    )
                  }
                />
              )
            )}
          </div>
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
      </main>

      {/* DETAILS MODAL */}

      {selectedAppointment && (
        <AppointmentDetailsModal
          appointment={
            selectedAppointment
          }
          onClose={() =>
            setSelectedAppointment(
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
      <button type="button" onClick={onPrevious} disabled={!hasPrevious} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">
        Previous
      </button>
      <span className="text-sm text-slate-600">Page {page} of {totalPages || 1}</span>
      <button type="button" onClick={onNext} disabled={!hasNext} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">
        Next
      </button>
    </div>
  );
}

/*
 * =====================================================
 * APPOINTMENT CARD
 * =====================================================
 */

function AppointmentCard({
  appointment,
  onView,
}) {
  const patientName =
    appointment.patient?.user
      ?.name || "Patient";

  const doctorName =
    appointment.doctor?.user
      ?.name || "Doctor";

  const patientEmail =
    appointment.patient?.user
      ?.email || "";

  const doctorDepartment =
    appointment.doctor
      ?.department?.name || "";

  const patientImage =
    appointment.patient
      ?.user?.profileImage?.url;

  const appointmentDate =
    appointment.appointmentDate
      ? new Date(
          appointment.appointmentDate
        )
      : null;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        {/* PATIENT */}

        <div className="flex min-w-0 items-center gap-4">
          {patientImage ? (
            <img
              src={patientImage}
              alt={patientName}
              className="h-12 w-12 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100">
              <UserRound
                size={20}
                className="text-slate-500"
              />
            </div>
          )}

          <div className="min-w-0">
            <p className="text-xs text-slate-400">
              Patient
            </p>

            <h2 className="truncate font-semibold text-slate-900">
              {patientName}
            </h2>

            {patientEmail && (
              <p className="mt-1 truncate text-xs text-slate-500">
                {patientEmail}
              </p>
            )}
          </div>
        </div>

        {/* DOCTOR */}

        <div className="min-w-[200px]">
          <p className="flex items-center gap-2 text-xs text-slate-400">
            <Stethoscope size={13} />
            Doctor
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-900">
            {doctorName}
          </p>

          {doctorDepartment && (
            <p className="mt-1 text-xs text-slate-500">
              {doctorDepartment}
            </p>
          )}
        </div>

        {/* DATE */}

        <div>
          <p className="flex items-center gap-2 text-xs text-slate-400">
            <CalendarDays size={13} />
            Appointment
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-900">
            {appointmentDate
              ? formatDate(
                  appointmentDate
                )
              : "Not available"}
          </p>

          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <Clock3 size={13} />

            {appointmentDate
              ? formatTime(
                  appointmentDate
                )
              : "--"}
          </p>
        </div>

        {/* TOKEN */}

        <div>
          <p className="text-xs text-slate-400">
            Token
          </p>

          <p className="mt-1 text-lg font-semibold text-slate-900">
            #
            {appointment.tokenNumber ||
              "--"}
          </p>
        </div>

        {/* STATUS */}

        <StatusBadge
          status={
            appointment.status
          }
        />

        {/* VIEW */}

        <button
          type="button"
          onClick={onView}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          View
        </button>
      </div>

      {appointment.reason && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-400">
            Reason for visit
          </p>

          <p className="mt-1 text-sm text-slate-700">
            {appointment.reason}
          </p>
        </div>
      )}
    </article>
  );
}

/*
 * =====================================================
 * STATUS BADGE
 * =====================================================
 */

function StatusBadge({
  status,
}) {
  const normalized =
    status || "unknown";

  const styles = {
    booked:
      "bg-blue-50 text-blue-700 border-blue-100",

    waiting:
      "bg-amber-50 text-amber-700 border-amber-100",

    "in-progress":
      "bg-purple-50 text-purple-700 border-purple-100",

    completed:
      "bg-emerald-50 text-emerald-700 border-emerald-100",

    cancelled:
      "bg-red-50 text-red-700 border-red-100",
  };

  return (
    <span
      className={[
        "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium",
        styles[
          normalized
        ] ||
          "bg-slate-100 text-slate-700 border-slate-200",
      ].join(" ")}
    >
      {formatStatus(
        normalized
      )}
    </span>
  );
}

/*
 * =====================================================
 * DETAILS MODAL
 * =====================================================
 */

function AppointmentDetailsModal({
  appointment,
  onClose,
}) {
  const patient =
    appointment.patient;

  const doctor =
    appointment.doctor;

  const patientName =
    patient?.user?.name ||
    "Patient";

  const doctorName =
    doctor?.user?.name ||
    "Doctor";

  const patientImage =
    patient?.user?.profileImage
      ?.url;

  const doctorImage =
    doctor?.user?.profileImage
      ?.url;

  const appointmentDate =
    appointment.appointmentDate
      ? new Date(
          appointment.appointmentDate
        )
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* HEADER */}

        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Appointment Details
            </p>

            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              Appointment #
              {appointment.tokenNumber ||
                "--"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={19} />
          </button>
        </div>

        <div className="space-y-7 p-6">
          {/* STATUS */}

          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
            <div>
              <p className="text-xs text-slate-400">
                Current status
              </p>

              <p className="mt-1 text-sm font-medium text-slate-900">
                {formatStatus(
                  appointment.status
                )}
              </p>
            </div>

            <StatusBadge
              status={
                appointment.status
              }
            />
          </div>

          {/* PATIENT */}

          <section>
            <h3 className="font-semibold text-slate-900">
              Patient
            </h3>

            <div className="mt-4 flex items-center gap-4 rounded-xl border border-slate-200 p-4">
              {patientImage ? (
                <img
                  src={patientImage}
                  alt={patientName}
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
                <p className="font-semibold text-slate-900">
                  {patientName}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {patient?.user
                    ?.email ||
                    "Email not provided"}
                </p>

                {patient?.phone && (
                  <p className="mt-1 text-xs text-slate-500">
                    {patient.phone}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* DOCTOR */}

          <section>
            <h3 className="font-semibold text-slate-900">
              Doctor
            </h3>

            <div className="mt-4 flex items-center gap-4 rounded-xl border border-slate-200 p-4">
              {doctorImage ? (
                <img
                  src={doctorImage}
                  alt={doctorName}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <Stethoscope
                    size={22}
                  />
                </div>
              )}

              <div>
                <p className="font-semibold text-slate-900">
                  {doctorName}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {doctor?.specialization ||
                    "Specialization not provided"}
                </p>

                {doctor
                  ?.department
                  ?.name && (
                  <p className="mt-1 text-xs text-slate-500">
                    {
                      doctor
                        .department
                        .name
                    }
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* APPOINTMENT INFO */}

          <section>
            <h3 className="font-semibold text-slate-900">
              Appointment Information
            </h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Detail
                label="Date"
                value={
                  appointmentDate
                    ? formatDate(
                        appointmentDate
                      )
                    : "Not available"
                }
              />

              <Detail
                label="Time"
                value={
                  appointmentDate
                    ? formatTime(
                        appointmentDate
                      )
                    : "Not available"
                }
              />

              <Detail
                label="Token"
                value={
                  appointment.tokenNumber
                    ? `#${appointment.tokenNumber}`
                    : "Not available"
                }
              />

              <Detail
                label="Token Date"
                value={
                  appointment.tokenDate
                    ? formatDate(
                        new Date(
                          appointment.tokenDate
                        )
                      )
                    : "Not available"
                }
              />
            </div>
          </section>

          {/* REASON */}

          {appointment.reason && (
            <section>
              <h3 className="font-semibold text-slate-900">
                Reason for Visit
              </h3>

              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <p className="text-sm leading-6 text-slate-700">
                  {
                    appointment.reason
                  }
                </p>
              </div>
            </section>
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
 * DETAIL
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
 * HELPERS
 * =====================================================
 */

function formatStatus(
  status
) {
  if (!status) {
    return "Unknown";
  }

  return status
    .replace(
      /-/g,
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatDate(
  date
) {
  return date.toLocaleDateString(
    "en-IN",
    {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
}

function formatTime(
  date
) {
  return date.toLocaleTimeString(
    "en-US",
    {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  );
}

export default AdminAppointments;