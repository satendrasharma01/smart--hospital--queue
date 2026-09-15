import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Building2,
  CalendarDays,
  Clock3,
  LogOut,
  RefreshCw,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import AdminSidebar from "../../components/AdminSidebar";

function AdminDashboard() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchStats = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await api.get(
          "/admin/dashboard",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setStats(
          response.data?.stats || null
        );
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Unable to load admin dashboard."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token, fetchStats]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleRefresh = () => {
    fetchStats(true);
  };

  return (
    <>
      <AdminSidebar />
      <div className="min-h-screen bg-slate-50 lg:pl-64">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Activity size={18} />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Smart Hospital
              </p>

              <p className="text-xs text-slate-500">
                Administration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900">
                {user?.name ||
                  "Hospital Administrator"}
              </p>

              <p className="text-xs text-slate-500">
                Administrator
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:px-6 sm:py-8">
        {/* PAGE HEADER */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">
              Administration
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              Hospital Overview
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Monitor the hospital's current
              operational data.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-white p-4">
            <p className="text-sm text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                fetchStats(true)
              }
              className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* LOADING */}

        {loading ? (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />

            <p className="mt-4 text-sm text-slate-500">
              Loading dashboard...
            </p>
          </div>
        ) : stats ? (
          <>
            {/* =================================================
                STATISTICS
            ================================================= */}

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total Patients"
                value={
                  stats.totalPatients ??
                  0
                }
                description="Registered patients"
                icon={UsersRound}
              />

              <StatCard
                label="Total Doctors"
                value={
                  stats.totalDoctors ??
                  0
                }
                description="Registered doctors"
                icon={Stethoscope}
              />

              <StatCard
                label="Today's Appointments"
                value={
                  stats.todayAppointments ??
                  0
                }
                description="Scheduled today"
                icon={CalendarDays}
              />

              <StatCard
                label="Active Queues"
                value={
                  stats.activeQueues ??
                  0
                }
                description="Doctors with active queues"
                icon={Activity}
              />
            </div>

            {/* =================================================
                APPOINTMENT OVERVIEW
            ================================================= */}

            <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Appointment Overview
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Real appointment status
                  distribution from the hospital
                  database.
                </p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatusCard
                  label="Booked"
                  value={
                    stats
                      .appointmentStatus
                      ?.booked ?? 0
                  }
                />

                <StatusCard
                  label="Waiting"
                  value={
                    stats
                      .appointmentStatus
                      ?.waiting ?? 0
                  }
                />

                <StatusCard
                  label="In Progress"
                  value={
                    stats
                      .appointmentStatus?.[
                      "in-progress"
                    ] ?? 0
                  }
                />

                <StatusCard
                  label="Completed"
                  value={
                    stats
                      .appointmentStatus
                      ?.completed ?? 0
                  }
                />

                <StatusCard
                  label="Cancelled"
                  value={
                    stats
                      .appointmentStatus
                      ?.cancelled ?? 0
                  }
                />
              </div>
            </section>

            {/* =================================================
                TODAY STATUS
            ================================================= */}

            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Today's Appointment Status
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Breakdown of today's real
                  appointments.
                </p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatusCard
                  label="Booked"
                  value={
                    stats
                      .todayAppointmentStatus
                      ?.booked ?? 0
                  }
                />

                <StatusCard
                  label="Waiting"
                  value={
                    stats
                      .todayAppointmentStatus
                      ?.waiting ?? 0
                  }
                />

                <StatusCard
                  label="In Progress"
                  value={
                    stats
                      .todayAppointmentStatus?.[
                      "in-progress"
                    ] ?? 0
                  }
                />

                <StatusCard
                  label="Completed"
                  value={
                    stats
                      .todayAppointmentStatus
                      ?.completed ?? 0
                  }
                />

                <StatusCard
                  label="Cancelled"
                  value={
                    stats
                      .todayAppointmentStatus
                      ?.cancelled ?? 0
                  }
                />
              </div>
            </section>

            {/* =================================================
                ACTIVE QUEUES
            ================================================= */}

            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Active Queue Overview
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Doctors with active appointment
                  queues today.
                </p>
              </div>

              <div className="mt-6">
                {Array.isArray(
                  stats.queueOverview
                ) &&
                stats.queueOverview.length >
                  0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {stats.queueOverview.map(
                      (queue) => (
                        <div
                          key={
                            queue.doctorId
                          }
                          className="rounded-xl border border-slate-200 p-5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-semibold text-slate-900">
                                {formatDoctorName(
                                  queue.doctorName
                                )}
                              </h3>

                              {queue.specialization && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {
                                    queue.specialization
                                  }
                                </p>
                              )}

                              <p className="mt-1 text-xs text-slate-500">
                                {queue.department ||
                                  "Unassigned"}
                              </p>
                            </div>

                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                              {queue.total ??
                                0}{" "}
                              patients
                            </span>
                          </div>

                          <div className="mt-5 grid grid-cols-3 gap-2">
                            <QueueMetric
                              label="Booked"
                              value={
                                queue.booked ??
                                0
                              }
                            />

                            <QueueMetric
                              label="Waiting"
                              value={
                                queue.waiting ??
                                0
                              }
                            />

                            <QueueMetric
                              label="Active"
                              value={
                                queue.inProgress ??
                                0
                              }
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
                    <Activity
                      size={28}
                      className="mx-auto text-slate-400"
                    />

                    <p className="mt-3 text-sm font-medium text-slate-700">
                      No active queues right
                      now.
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Doctors currently handling
                      queues will appear here.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* =================================================
                DEPARTMENT OVERVIEW
            ================================================= */}

            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Department Overview
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Real doctor distribution across
                  departments.
                </p>
              </div>

              {Array.isArray(
                stats.departmentStats
              ) &&
              stats.departmentStats.length >
                0 ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {stats.departmentStats.map(
                    (department, index) => (
                      <div
                        key={`${department.department}-${index}`}
                        className="rounded-xl border border-slate-200 p-5"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                          <Stethoscope
                            size={18}
                          />
                        </div>

                        <p className="mt-4 text-sm font-semibold text-slate-900">
                          {department.department ||
                            "Unassigned"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Doctor count
                        </p>

                        <p className="mt-1 text-2xl font-semibold text-slate-900">
                          {department.doctorCount ??
                            0}
                        </p>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
                  <Stethoscope
                    size={28}
                    className="mx-auto text-slate-400"
                  />

                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No department data
                    available.
                  </p>
                </div>
              )}
            </section>

            {/* =================================================
                RECENT APPOINTMENTS
            ================================================= */}

            <section className="mt-6 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 p-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Recent Appointments
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Latest appointments recorded in
                    the system.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/admin/appointments"
                    )
                  }
                  className="text-sm font-medium text-slate-700 hover:text-slate-900"
                >
                  View all →
                </button>
              </div>

              {Array.isArray(
                stats.recentAppointments
              ) &&
              stats.recentAppointments.length >
                0 ? (
                <div>
                  {stats.recentAppointments.map(
                    (appointment) => {
                      const date =
                        appointment.appointmentDate
                          ? new Date(
                              appointment.appointmentDate
                            )
                          : null;

                      return (
                        <div
                          key={
                            appointment._id
                          }
                          className="border-b border-slate-100 p-6 last:border-b-0"
                        >
                          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                                  <UsersRound
                                    size={
                                      16
                                    }
                                  />
                                </div>

                                <div>
                                  <p className="font-medium text-slate-900">
                                    {appointment
                                      .patient
                                      ?.user
                                      ?.name ||
                                      "Patient"}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {formatDoctorName(
                                      appointment
                                        .doctor
                                        ?.user
                                        ?.name
                                    )}
                                  </p>
                                </div>
                              </div>

                              {date &&
                                !Number.isNaN(
                                  date.getTime()
                                ) && (
                                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                                    <span className="flex items-center gap-2">
                                      <CalendarDays
                                        size={
                                          14
                                        }
                                      />

                                      {formatDate(
                                        date
                                      )}
                                    </span>

                                    <span className="flex items-center gap-2">
                                      <Clock3
                                        size={
                                          14
                                        }
                                      />

                                      {formatTime(
                                        date
                                      )}
                                    </span>
                                  </div>
                                )}
                            </div>

                            <div className="flex items-center gap-4">
                              <span className="text-sm font-medium text-slate-700">
                                Token #
                                {appointment.tokenNumber ??
                                  "-"}
                              </span>

                              <StatusBadge
                                status={
                                  appointment.status
                                }
                              />
                            </div>
                          </div>

                          {appointment.reason && (
                            <div className="mt-5 border-t border-slate-100 pt-4">
                              <p className="text-xs text-slate-500">
                                Reason
                              </p>

                              <p className="mt-1 text-sm text-slate-700">
                                {
                                  appointment.reason
                                }
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="p-10 text-center">
                  <CalendarDays
                    size={30}
                    className="mx-auto text-slate-400"
                  />

                  <p className="mt-4 text-sm font-medium text-slate-700">
                    No recent appointments
                    found.
                  </p>
                </div>
              )}
            </section>

            {/* =================================================
                HOSPITAL MANAGEMENT
            ================================================= */}

            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Hospital Management
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Access the main administration
                  modules.
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {/* DOCTORS */}

                <ManagementCard
                  icon={Stethoscope}
                  title="Doctors"
                  description="Manage doctors, qualifications, availability and profiles."
                  buttonText="Manage Doctors"
                  onClick={() =>
                    navigate(
                      "/admin/doctors"
                    )
                  }
                />

                {/* PATIENTS */}

                <ManagementCard
                  icon={UsersRound}
                  title="Patients"
                  description="View registered patients and their appointment activity."
                  buttonText="Manage Patients"
                  onClick={() =>
                    navigate(
                      "/admin/patients"
                    )
                  }
                />

                {/* APPOINTMENTS */}

                <ManagementCard
                  icon={CalendarDays}
                  title="Appointments"
                  description="Monitor appointments, tokens, doctors and patients."
                  buttonText="Manage Appointments"
                  onClick={() =>
                    navigate(
                      "/admin/appointments"
                    )
                  }
                />
                
                {/* DEPARTMENTS */}

                <ManagementCard
                  icon={Building2}
                  title="Departments"
                  description="Create, activate, deactivate and manage hospital departments."
                  buttonText="Manage Departments"
                  onClick={() =>
                    navigate(
                      "/admin/departments"
                    )
                  }
                />
              </div>
            </section>
          </>
        ) : (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center">
            <Activity
              size={30}
              className="mx-auto text-slate-400"
            />

            <p className="mt-4 text-sm text-slate-500">
              No dashboard data available.
            </p>
          </div>
        )}
      </main>
    </div>
    </>
  );
}

/*
 * =====================================================
 * STAT CARD
 * =====================================================
 */

function StatCard({
  label,
  value,
  description,
  icon: Icon,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
        <Icon size={19} />
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

/*
 * =====================================================
 * STATUS CARD
 * =====================================================
 */

function StatusCard({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

/*
 * =====================================================
 * QUEUE METRIC
 * =====================================================
 */

function QueueMetric({
  label,
  value,
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-center">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold text-slate-900">
        {value}
      </p>
    </div>
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
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
      {formatStatus(status)}
    </span>
  );
}

/*
 * =====================================================
 * MANAGEMENT CARD
 * =====================================================
 */

function ManagementCard({
  icon: Icon,
  title,
  description,
  buttonText,
  onClick,
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
        <Icon size={18} />
      </div>

      <h3 className="mt-4 font-semibold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500">
        {description}
      </p>

      <button
        type="button"
        onClick={onClick}
        className="mt-5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
      >
        {buttonText}
      </button>
      </div>
  );
}

/*
 * =====================================================
 * HELPERS
 * =====================================================
 */

function formatDoctorName(name) {
  const value = String(
    name || "Doctor"
  ).trim();

  if (!value) {
    return "Dr. Doctor";
  }

  if (
    /^dr\.?\s/i.test(value)
  ) {
    return value;
  }

  return `Dr. ${value}`;
}

function formatDate(date) {
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

function formatTime(date) {
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

function formatStatus(status) {
  if (!status) {
    return "Unknown";
  }

  return String(status)
    .replace(/-/g, " ")
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase()
    );
}

export default AdminDashboard;
