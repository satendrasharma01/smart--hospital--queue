import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Activity,
  CalendarDays,
  Clock3,
  Search,
  UserRound,
} from "lucide-react";

import { Link } from "react-router-dom";

import api from "../../services/api";
import socket from "../../services/socket";
import { useAuth } from "../../context/AuthContext";

import PatientSidebar from "../../components/PatientSidebar";

function PatientDashboard() {
  const { token, user } = useAuth();

  const [appointments, setAppointments] =
    useState([]);

  const [profile, setProfile] =
    useState(null);

  const [queue, setQueue] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const joinedDoctorRef =
    useRef(null);

  /*
   * =====================================================
   * FETCH DASHBOARD DATA
   * =====================================================
   */

  const fetchDashboardData =
    useCallback(
      async (showLoader = true) => {
        if (!token) {
          setAppointments([]);
          setProfile(null);
          setQueue(null);
          setLoading(false);
          return;
        }

        try {
          if (showLoader) {
            setLoading(true);
          }

          setError("");

          /*
           * Profile + appointments are both required
           * for the Overview page.
           */
          const [
            profileResponse,
            appointmentsResponse,
          ] = await Promise.all([
            api.get(
              "/patients/profile",
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            ),

            api.get(
              "/appointments/my",
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            ),
          ]);

          const latestProfile =
            profileResponse.data?.patient ||
            null;

          const latestAppointments =
            appointmentsResponse.data
              ?.appointments || [];

          setProfile(latestProfile);

          setAppointments(
            latestAppointments
          );

          /*
           * Try to get active queue.
           *
           * It is completely valid for the patient
           * to have no active appointment, so a 404
           * here should not break the dashboard.
           */
          try {
            const queueResponse =
              await api.get(
                "/queue/my-status",
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

            setQueue(
              queueResponse.data?.queue ||
                null
            );
          } catch (queueError) {
            /*
             * No active appointment is not
             * considered a dashboard error.
             */
            if (
              queueError.response?.status ===
              404
            ) {
              setQueue(null);
            } else {
              console.error(
                "Fetch dashboard queue error:",
                queueError
              );
            }
          }

          return latestAppointments;
        } catch (error) {
          console.error(
            "Fetch dashboard data error:",
            error
          );

          setError(
            error.response?.data?.message ||
              "Unable to load your dashboard."
          );

          return [];
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
    if (token) {
      fetchDashboardData();
    }
  }, [
    token,
    fetchDashboardData,
  ]);

  /*
   * =====================================================
   * REAL-TIME QUEUE
   * =====================================================
   *
   * Doctor actions:
   *
   * Call Next
   * Complete
   *
   * Backend emits:
   *
   * queueUpdated
   *
   * Dashboard receives that event and fetches
   * latest appointment + queue data.
   */

  useEffect(() => {
    if (!token) {
      return;
    }

    let mounted = true;

    const joinDoctorQueue =
      async () => {
        /*
         * Fetch latest queue first so that
         * we know which doctor room to join.
         */
        try {
          const response =
            await api.get(
              "/queue/my-status",
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

          if (!mounted) {
            return;
          }

          const latestQueue =
            response.data?.queue ||
            null;

          setQueue(latestQueue);

          const doctorId =
            latestQueue?.doctorId;

          if (!doctorId) {
            return;
          }

          const doctorRoom =
            String(doctorId);

          if (
            joinedDoctorRef.current !==
            doctorRoom
          ) {
            socket.emit(
              "joinQueue",
              doctorId
            );

            joinedDoctorRef.current =
              doctorRoom;

            console.log(
              "Dashboard joined doctor queue:",
              doctorId
            );
          }
        } catch (error) {
          /*
           * 404 simply means there is currently
           * no active appointment.
           */
          if (
            error.response?.status ===
            404
          ) {
            setQueue(null);
          } else {
            console.error(
              "Dashboard queue connection error:",
              error
            );
          }
        }
      };

    const handleQueueUpdated =
      async () => {
        console.log(
          "Dashboard received queueUpdated"
        );

        /*
         * Fetch latest appointment and queue
         * without showing loading screen.
         */
        await fetchDashboardData(false);

        /*
         * Re-check room after update because
         * active appointment/doctor information
         * may have changed.
         */
        await joinDoctorQueue();
      };

    const handleSocketConnect =
      async () => {
        console.log(
          "Dashboard socket connected:",
          socket.id
        );

        await joinDoctorQueue();
      };

    socket.on(
      "connect",
      handleSocketConnect
    );

    socket.on(
      "queueUpdated",
      handleQueueUpdated
    );

    /*
     * Connect socket if required.
     */
    if (!socket.connected) {
      socket.connect();
    } else {
      handleSocketConnect();
    }

    return () => {
      mounted = false;

      socket.off(
        "connect",
        handleSocketConnect
      );

      socket.off(
        "queueUpdated",
        handleQueueUpdated
      );

      joinedDoctorRef.current =
        null;
    };
  }, [
    token,
    fetchDashboardData,
  ]);

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">
          Loading your dashboard...
        </p>
      </div>
    );
  }

  /*
   * =====================================================
   * ERROR
   * =====================================================
   */

  if (error) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <PatientSidebar />

        <main className="flex min-w-0 flex-1 items-center justify-center px-6">
          <div className="rounded-xl border border-red-200 bg-white p-6 text-center">
            <p className="text-sm text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                fetchDashboardData()
              }
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  /*
   * =====================================================
   * PROFILE DATA
   * =====================================================
   */

  const patientName =
    profile?.user?.name ||
    user?.name ||
    "Patient";

  const patientEmail =
    profile?.user?.email ||
    user?.email ||
    "Not available";

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PatientSidebar />

      <div className="min-w-0 flex-1">
        {/* Header */}
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <div>
              <p className="text-sm text-slate-500">
                Smart Hospital
              </p>

              <h1 className="text-lg font-semibold text-slate-900">
                Patient Dashboard
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-slate-900">
                  {patientName}
                </p>

                <p className="text-xs text-slate-500">
                  Patient
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200">
                <UserRound size={17} />
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-8">
          {/* Welcome */}
          <div>
            <p className="text-sm text-slate-500">
              Welcome back
            </p>

            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {patientName}
            </h2>
          </div>

          {/* =================================================
              QUICK PROFILE
          ================================================= */}

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <UserRound
                    size={25}
                    className="text-slate-600"
                  />
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Patient Profile
                  </p>

                  <h3 className="mt-1 text-lg font-semibold text-slate-900">
                    {patientName}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {patientEmail}
                  </p>
                </div>
              </div>

              <Link
                to="/patient/profile"
                className="w-fit rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                View Profile
              </Link>
            </div>
          </section>

          {/* =================================================
              LIVE QUEUE OVERVIEW
          ================================================= */}

          {queue && (
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity
                      size={18}
                      className="text-slate-700"
                    />

                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Live Queue
                    </p>
                  </div>

                  <h3 className="mt-2 text-xl font-semibold text-slate-900">
                    Dr. {queue.doctor}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Your token #{queue.yourToken}
                  </p>
                </div>

                <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
                  {queue.status}
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <DashboardQueueStat
                  label="Your Token"
                  value={`#${queue.yourToken}`}
                  icon={Activity}
                />

                <DashboardQueueStat
                  label="Currently Serving"
                  value={
                    queue.currentlyServing !==
                    null
                      ? `#${queue.currentlyServing}`
                      : "—"
                  }
                  icon={UserRound}
                />

                <DashboardQueueStat
                  label="Patients Ahead"
                  value={
                    queue.patientsAhead
                  }
                  icon={Clock3}
                />
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Estimated wait:{" "}
                  <span className="font-semibold text-slate-900">
                    {queue.estimatedWaitMinutes !== null
                      ? `${queue.estimatedWaitMinutes} min`
                      : "Unavailable"}
                  </span>
                </p>

                <Link
                  to="/patient/queue"
                  className="flex w-fit items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                >
                  <Activity size={16} />
                  View Live Queue
                </Link>
              </div>

              {queue.status ===
                "in-progress" && (
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    It is your turn.
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Please proceed to the
                    doctor's consultation
                    area.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* =================================================
              NO ACTIVE QUEUE
          ================================================= */}

          {!queue &&
            appointments.length === 0 && (
              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100">
                    <CalendarDays size={20} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900">
                      No active appointment
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Book an appointment to
                      join a doctor's queue.
                    </p>
                  </div>
                </div>

                <Link
                  to="/patient/doctors"
                  className="mt-5 flex w-fit items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                >
                  <Search size={16} />
                  Find a Doctor
                </Link>
              </section>
            )}

          {/* =================================================
              UPCOMING APPOINTMENTS
          ================================================= */}

          <section className="mt-8">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Upcoming appointments
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Your scheduled hospital
                  visits.
                </p>
              </div>

              {appointments.length >
                0 && (
                <Link
                  to="/patient/appointments"
                  className="text-sm font-medium text-slate-700 hover:text-slate-900"
                >
                  View all
                </Link>
              )}
            </div>

            {appointments.length ===
            0 ? (
              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-10 text-center">
                <CalendarDays
                  size={28}
                  className="mx-auto text-slate-400"
                />

                <h4 className="mt-4 font-medium text-slate-900">
                  No appointments yet
                </h4>

                <p className="mt-1 text-sm text-slate-500">
                  Your upcoming appointments
                  will appear here.
                </p>

                <Link
                  to="/patient/doctors"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
                >
                  <Search size={16} />
                  Find Doctor
                </Link>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {appointments
                  .slice(0, 4)
                  .map(
                    (appointment) => (
                      <AppointmentCard
                        key={
                          appointment._id
                        }
                        appointment={
                          appointment
                        }
                      />
                    )
                  )}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

/*
 * =====================================================
 * QUEUE STAT
 * =====================================================
 */

function DashboardQueueStat({
  label,
  value,
  icon: Icon,
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={16} />

        <p className="text-xs">
          {label}
        </p>
      </div>

      <p className="mt-3 text-2xl font-semibold text-slate-900">
        {value}
      </p>
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
}) {
  const doctorName =
    appointment.doctor?.user?.name ||
    "Doctor";

  const department =
    appointment.doctor?.department
      ?.name || "Department";

  const appointmentDate =
    new Date(
      appointment.appointmentDate
    );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Appointment
          </p>

          <h4 className="mt-2 text-lg font-semibold text-slate-900">
            {doctorName}
          </h4>

          <p className="mt-1 text-sm text-slate-500">
            {department}
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
          {appointment.status}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">
        <div>
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <CalendarDays size={14} />
            Date
          </p>

          <p className="mt-1 text-sm font-medium text-slate-900">
            {appointmentDate.toLocaleDateString()}
          </p>
        </div>

        <div>
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Clock3 size={14} />
            Time
          </p>

          <p className="mt-1 text-sm font-medium text-slate-900">
            {appointmentDate.toLocaleTimeString(
              [],
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            )}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-5">
        <p className="text-xs text-slate-500">
          Queue token
        </p>

        <p className="mt-1 text-2xl font-semibold text-slate-900">
          #{appointment.tokenNumber}
        </p>
      </div>
    </div>
  );
}

export default PatientDashboard;