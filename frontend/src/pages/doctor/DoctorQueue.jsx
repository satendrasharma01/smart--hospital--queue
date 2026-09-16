import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  CheckCircle2,
  Clock3,
  PhoneCall,
  RefreshCw,
  UserRound,
} from "lucide-react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import DoctorSidebar from "../../components/DoctorSidebar";
import socket from "../../services/socket";

function DoctorQueue() {
  const { token } = useAuth();

  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /*
   * =====================================================
   * FETCH TODAY'S QUEUE
   * =====================================================
   */

  const fetchQueue = useCallback(
    async (showLoader = true) => {
      if (!token) {
        return [];
      }

      try {
        if (showLoader) {
          setLoading(true);
        }

        setError("");

        const response = await api.get(
          "/doctors/queue/today",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const updatedQueue =
          response.data?.queue || [];

        setQueue(updatedQueue);

        return updatedQueue;
      } catch (error) {
        console.error(
          "Fetch doctor queue error:",
          error
        );

        setError(
          error.response?.data?.message ||
            "Unable to load today's queue."
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
    fetchQueue();
  }, [fetchQueue]);

  /*
   * =====================================================
   * SOCKET.IO LIVE UPDATES
   * =====================================================
   */

  useEffect(() => {
    if (!token) {
      return;
    }

    let mounted = true;

    const joinDoctorQueue = async () => {
      if (!mounted) {
        return;
      }

      try {
        const latestQueue =
          await fetchQueue(false);

        if (!mounted) {
          return;
        }

        /*
         * Queue appointments contain doctor.
         * Join this doctor's socket room.
         */

        const firstAppointment =
          latestQueue?.[0];

        const doctorId =
          firstAppointment?.doctor?._id ||
          firstAppointment?.doctor;

        if (doctorId) {
          socket.emit(
            "joinQueue",
            String(doctorId)
          );

          console.log(
            "Doctor joined queue:",
            String(doctorId)
          );
        }
      } catch (error) {
        console.error(
          "Doctor queue socket setup error:",
          error
        );
      }
    };

    const handleQueueUpdated =
      () => {
        /*
         * Don't show loading screen
         * during live updates.
         */

        fetchQueue(false);
      };

    const handleSocketConnect =
      () => {
        joinDoctorQueue();
      };

    socket.on(
      "connect",
      handleSocketConnect
    );

    socket.on(
      "queueUpdated",
      handleQueueUpdated
    );

    if (!socket.connected) {
      socket.connect();
    } else {
      joinDoctorQueue();
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
    };
  }, [
    token,
    fetchQueue,
  ]);

  /*
   * =====================================================
   * CALL NEXT PATIENT
   * =====================================================
   */

  const handleCallNext =
    async () => {
      if (actionLoading) {
        return;
      }

      try {
        setActionLoading(true);
        setError("");
        setSuccess("");

        await api.patch(
          "/queue/next",
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setSuccess(
          "Next patient called successfully."
        );

        await fetchQueue(false);
      } catch (error) {
        console.error(
          "Call next patient error:",
          error
        );

        setError(
          error.response?.data?.message ||
            "Unable to call the next patient."
        );
      } finally {
        setActionLoading(false);
      }
    };

  /*
   * =====================================================
   * COMPLETE APPOINTMENT
   * =====================================================
   */

  const handleComplete =
    async (appointmentId) => {
      if (
        actionLoading ||
        !appointmentId
      ) {
        return;
      }

      try {
        setActionLoading(true);
        setError("");
        setSuccess("");

        /*
         * IMPORTANT:
         * Complete route belongs to queue router.
         */

        await api.patch(
          `/queue/${appointmentId}/complete`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setSuccess(
          "Appointment completed successfully."
        );

        await fetchQueue(false);
      } catch (error) {
        console.error(
          "Complete appointment error:",
          error
        );

        setError(
          error.response?.data?.message ||
            "Unable to complete appointment."
        );
      } finally {
        setActionLoading(false);
      }
    };

  /*
   * =====================================================
   * FORMAT DATE / TIME
   * =====================================================
   */

  const formatDateTime =
    (value) => {
      if (!value) {
        return "—";
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "—";
      }

      return date.toLocaleString(
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
    };

  /*
   * =====================================================
   * CURRENT PATIENT
   * =====================================================
   */

  const currentPatient =
    queue.find(
      (appointment) =>
        appointment.status ===
        "in-progress"
    );

  /*
   * =====================================================
   * WAITING PATIENTS
   * =====================================================
   */

  const waitingPatients =
    queue.filter(
      (appointment) =>
        appointment.status ===
          "booked" ||
        appointment.status ===
          "waiting"
    );

  /*
   * =====================================================
   * ACTIVE QUEUE
   * =====================================================
   */

  const activeQueue =
    queue.filter(
      (appointment) =>
        appointment.status !==
          "completed" &&
        appointment.status !==
          "cancelled"
    );

  /*
   * =====================================================
   * STATUS BADGE
   * =====================================================
   */

  const getStatusClass =
    (status) => {
      switch (status) {
        case "in-progress":
          return "bg-blue-50 text-blue-700";

        case "waiting":
          return "bg-amber-50 text-amber-700";

        case "booked":
          return "bg-slate-100 text-slate-700";

        case "completed":
          return "bg-emerald-50 text-emerald-700";

        case "cancelled":
          return "bg-red-50 text-red-700";

        default:
          return "bg-slate-100 text-slate-700";
      }
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
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Smart Hospital
              </p>

              <p className="text-xs text-slate-500">
                Doctor Queue
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                fetchQueue()
              }
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          {/* Heading */}

          <div>
            <p className="text-sm text-slate-500">
              Doctor Portal
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              Today's Queue
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Monitor and manage today's
              patient appointments.
            </p>
          </div>

          {/* Error */}

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* Success */}

          {success && (
            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-700">
                {success}
              </p>
            </div>
          )}

          {/* Stats */}

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">
                Total Today
              </p>

              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {queue.length}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">
                Waiting
              </p>

              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {
                  waitingPatients.length
                }
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">
                Currently Serving
              </p>

              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {currentPatient
                  ? `#${currentPatient.tokenNumber}`
                  : "—"}
              </p>
            </div>
          </div>

          {/* Currently Serving */}

          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Currently serving
                </p>

                {currentPatient ? (
                  <>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">
                      {currentPatient
                        .patient
                        ?.user
                        ?.name ||
                        "Patient"}
                    </h2>

                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                      <span>
                        Token #
                        {
                          currentPatient.tokenNumber
                        }
                      </span>

                      <span>
                        {formatDateTime(
                          currentPatient.appointmentDate
                        )}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">
                      No patient currently being served
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Call the next patient
                      when you are ready.
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={
                    handleCallNext
                  }
                  disabled={
                    actionLoading ||
                    Boolean(
                      currentPatient
                    ) ||
                    waitingPatients.length ===
                      0
                  }
                  className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PhoneCall
                    size={17}
                  />

                  {actionLoading
                    ? "Processing..."
                    : "Call Next"}
                </button>

                {currentPatient && (
                  <button
                    type="button"
                    onClick={() =>
                      handleComplete(
                        currentPatient._id
                      )
                    }
                    disabled={
                      actionLoading
                    }
                    className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2
                      size={17}
                    />

                    Complete
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Queue */}

          <section className="mt-6">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Patient Queue
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {activeQueue.length}{" "}
                  active appointment
                  {activeQueue.length !==
                  1
                    ? "s"
                    : ""}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-10 text-center">
                <RefreshCw
                  size={24}
                  className="mx-auto animate-spin text-slate-400"
                />

                <p className="mt-3 text-sm text-slate-500">
                  Loading today's queue...
                </p>
              </div>
            ) : queue.length ===
              0 ? (
              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-10 text-center">
                <Clock3
                  size={28}
                  className="mx-auto text-slate-400"
                />

                <h3 className="mt-4 font-medium text-slate-900">
                  No appointments today
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  The queue is currently empty.
                </p>
              </div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {/* Table Header */}

                <div className="hidden border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[80px_1.5fr_1fr_120px_120px] md:gap-4">
                  <span>
                    Token
                  </span>

                  <span>
                    Patient
                  </span>

                  <span>
                    Appointment
                  </span>

                  <span>
                    Status
                  </span>

                  <span>
                    Action
                  </span>
                </div>

                {queue.map(
                  (appointment) => {
                    const isCurrent =
                      appointment.status ===
                      "in-progress";

                    const isCompleted =
                      appointment.status ===
                      "completed";

                    const isCancelled =
                      appointment.status ===
                      "cancelled";

                    return (
                      <div
                        key={
                          appointment._id
                        }
                        className="border-b border-slate-100 p-5 last:border-b-0 md:grid md:grid-cols-[80px_1.5fr_1fr_120px_120px] md:items-center md:gap-4"
                      >
                        {/* Token */}

                        <div>
                          <p className="text-xs text-slate-500 md:hidden">
                            Token
                          </p>

                          <p className="mt-1 text-lg font-semibold text-slate-900 md:mt-0">
                            #
                            {
                              appointment.tokenNumber
                            }
                          </p>
                        </div>

                        {/* Patient */}

                        <div className="mt-4 flex items-center gap-3 md:mt-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <UserRound
                              size={17}
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {appointment
                                .patient
                                ?.user
                                ?.name ||
                                "Patient"}
                            </p>

                            <p className="truncate text-xs text-slate-500">
                              {appointment
                                .patient
                                ?.user
                                ?.email ||
                                "No email"}
                            </p>
                          </div>
                        </div>

                        {/* Appointment */}

                        <div className="mt-4 md:mt-0">
                          <p className="text-xs text-slate-500 md:hidden">
                            Appointment
                          </p>

                          <p className="mt-1 text-sm text-slate-700 md:mt-0">
                            {formatDateTime(
                              appointment.appointmentDate
                            )}
                          </p>
                        </div>

                        {/* Status */}

                        <div className="mt-4 md:mt-0">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusClass(
                              appointment.status
                            )}`}
                          >
                            {appointment.status.replace(
                              "-",
                              " "
                            )}
                          </span>
                        </div>

                        {/* Action */}

                        <div className="mt-4 md:mt-0">
                          {isCurrent ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleComplete(
                                  appointment._id
                                )
                              }
                              disabled={
                                actionLoading
                              }
                              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <CheckCircle2
                                size={
                                  15
                                }
                              />

                              Complete
                            </button>
                          ) : isCompleted ||
                            isCancelled ? (
                            <span className="text-xs text-slate-400">
                              No action
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">
                              Waiting
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default DoctorQueue;