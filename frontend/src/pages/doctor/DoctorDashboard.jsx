import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Activity,
  CheckCircle2,
  Clock3,
  LogOut,
  PhoneCall,
  UserRound,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import socket from "../../services/socket";
import DoctorSidebar from "../../components/DoctorSidebar";

function DoctorDashboard() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const [queue, setQueue] = useState([]);
  const [doctorId, setDoctorId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] =
    useState(false);
  const [error, setError] = useState("");

  /*
   * Keeps track of the queue room
   * we already joined.
   */
  const joinedDoctorRef = useRef(null);

  /*
   * =====================================================
   * FETCH DOCTOR PROFILE
   * =====================================================
   *
   * IMPORTANT:
   * Do NOT get doctorId from queue[0].
   *
   * Queue can be empty when dashboard opens.
   * Doctor profile always gives us the real Doctor _id.
   */

  const fetchDoctorProfile = useCallback(
    async () => {
      if (!token) {
        return null;
      }

      try {
        const response = await api.get(
          "/doctors/profile",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const id =
          response.data?.doctor?._id;

        if (!id) {
          throw new Error(
            "Doctor ID was not returned by the server."
          );
        }

        setDoctorId(id);

        return id;
      } catch (error) {
        console.error(
          "Fetch doctor profile error:",
          error
        );

        setError(
          error.response?.data?.message ||
            "Unable to load doctor profile."
        );

        return null;
      }
    },
    [token]
  );

  /*
   * =====================================================
   * FETCH TODAY'S QUEUE
   * =====================================================
   */

  const fetchQueue = useCallback(
    async () => {
      if (!token) {
        return [];
      }

      try {
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

        /*
         * Clear previous queue error after
         * successful request.
         */
        setError("");

        return updatedQueue;
      } catch (error) {
        console.error(
          "Fetch doctor queue error:",
          error
        );

        /*
         * Don't unnecessarily destroy existing
         * queue state because of a temporary error.
         */
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
   * INITIAL DASHBOARD LOAD
   * =====================================================
   */

  useEffect(() => {
    if (!token) {
      setQueue([]);
      setDoctorId(null);
      setLoading(false);

      return;
    }

    const loadDashboard = async () => {
      await Promise.all([
        fetchDoctorProfile(),
        fetchQueue(),
      ]);
    };

    loadDashboard();
  }, [
    token,
    fetchDoctorProfile,
    fetchQueue,
  ]);

  /*
   * =====================================================
   * SOCKET.IO LIVE QUEUE
   * =====================================================
   */

  useEffect(() => {
    if (!token || !doctorId) {
      return;
    }

    let mounted = true;

    /*
     * Join doctor's queue room.
     */
    const joinDoctorQueue = () => {
      if (!mounted || !doctorId) {
        return;
      }

      const normalizedDoctorId =
        String(doctorId);

      /*
       * Don't emit duplicate join events.
       */
      if (
        joinedDoctorRef.current ===
        normalizedDoctorId
      ) {
        return;
      }

      socket.emit(
        "joinQueue",
        normalizedDoctorId
      );

      joinedDoctorRef.current =
        normalizedDoctorId;

      console.log(
        "Doctor joined queue room:",
        `queue:${normalizedDoctorId}`
      );
    };

    /*
     * Socket connected.
     */
    const handleConnect = () => {
      console.log(
        "Doctor socket connected:",
        socket.id
      );

      joinedDoctorRef.current = null;

      joinDoctorQueue();

      /*
       * Get latest data immediately
       * after socket reconnect.
       */
      fetchQueue();
    };

    /*
     * Socket disconnected.
     */
    const handleDisconnect = () => {
      console.log(
        "Doctor socket disconnected"
      );

      /*
       * Allow room to be joined again
       * after reconnect.
       */
      joinedDoctorRef.current = null;
    };

    /*
     * Backend emits this event when:
     *
     * 1. Patient is called
     * 2. Appointment is completed
     * 3. Queue changes
     */
    const handleQueueUpdated = (
      data
    ) => {
      console.log(
        "Live queue update received:",
        data
      );

      /*
       * Immediately fetch fresh server state.
       */
      fetchQueue();
    };

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    socket.on(
      "queueUpdated",
      handleQueueUpdated
    );

    /*
     * If already connected,
     * join immediately.
     */
    if (socket.connected) {
      joinDoctorQueue();
    } else {
      socket.connect();
    }

    return () => {
      mounted = false;

      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.off(
        "queueUpdated",
        handleQueueUpdated
      );

      joinedDoctorRef.current = null;
    };
  }, [
    token,
    doctorId,
    fetchQueue,
  ]);

  /*
   * =====================================================
   * CALL NEXT PATIENT
   * =====================================================
   */

  const handleCallNext = async () => {
    if (
      actionLoading ||
      !token
    ) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      await api.patch(
        "/queue/next",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      /*
       * Socket will also update dashboard,
       * but this gives immediate fallback behavior.
       */
      await fetchQueue();
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
   * COMPLETE CURRENT APPOINTMENT
   * =====================================================
   */

  const handleComplete = async (
    appointmentId
  ) => {
    if (
      actionLoading ||
      !appointmentId ||
      !token
    ) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      await api.patch(
        `/appointments/${appointmentId}/complete`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      /*
       * Optimistic update.
       */
      setQueue((previousQueue) =>
        previousQueue.map(
          (appointment) =>
            appointment._id ===
            appointmentId
              ? {
                  ...appointment,
                  status:
                    "completed",
                }
              : appointment
        )
      );

      /*
       * Fetch latest backend state.
       */
      await fetchQueue();
    } catch (error) {
      console.error(
        "Complete appointment error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to complete the appointment."
      );
    } finally {
      setActionLoading(false);
    }
  };

  /*
   * =====================================================
   * LOGOUT
   * =====================================================
   */

  const handleLogout = () => {
    joinedDoctorRef.current = null;

    if (socket.connected) {
      socket.disconnect();
    }

    logout();

    navigate("/login");
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
   * UI
   * =====================================================
   */

  return (
    <div className="portal-shell min-h-screen bg-slate-50">
      {/* =================================================
          DOCTOR SIDEBAR
          ================================================= */}

      <DoctorSidebar />

      {/* =================================================
          MAIN CONTENT
          ================================================= */}

      <div className="min-w-0 flex-1">
        {/* Header */}

        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Activity size={18} />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Smart Hospital
                </p>

                <p className="text-xs text-slate-500">
                  Doctor Portal
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-slate-900">
                  {user?.name}
                </p>

                <p className="text-xs text-slate-500">
                  Doctor
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Main */}

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <div>
            <p className="text-sm text-slate-500">
              Doctor Portal
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              Today's Queue
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage your appointments and patient queue.
            </p>
          </div>

          {/* =================================================
              ERROR
              ================================================= */}

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-red-600">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={fetchQueue}
                  className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* =================================================
              CURRENT PATIENT
              ================================================= */}

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Currently serving
                </p>

                {currentPatient ? (
                  <>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                      {currentPatient.patient
                        ?.user?.name ||
                        "Patient"}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Token #
                      {
                        currentPatient.tokenNumber
                      }
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">
                      No patient currently being served
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Call the next patient when you are ready.
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleCallNext}
                  disabled={
                    actionLoading ||
                    Boolean(currentPatient) ||
                    waitingPatients.length ===
                      0
                  }
                  className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PhoneCall size={17} />

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
                    className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2
                      size={17}
                    />

                    {actionLoading
                      ? "Completing..."
                      : "Complete"}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* =================================================
              WAITING QUEUE
              ================================================= */}

          <section className="mt-6">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Waiting Queue
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {waitingPatients.length}{" "}
                  patient
                  {waitingPatients.length !==
                  1
                    ? "s"
                    : ""}{" "}
                  waiting
                </p>
              </div>
            </div>

            {loading ? (
              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-10 text-center">
                <p className="text-sm text-slate-500">
                  Loading today's queue...
                </p>
              </div>
            ) : error &&
              queue.length === 0 ? (
              <div className="mt-5 rounded-xl border border-red-200 bg-white p-10 text-center">
                <Clock3
                  size={28}
                  className="mx-auto text-red-400"
                />

                <h3 className="mt-4 font-medium text-slate-900">
                  Queue could not be loaded
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Please retry to get the latest queue.
                </p>

                <button
                  type="button"
                  onClick={fetchQueue}
                  className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Retry
                </button>
              </div>
            ) : waitingPatients.length ===
              0 ? (
              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-10 text-center">
                <Clock3
                  size={28}
                  className="mx-auto text-slate-400"
                />

                <h3 className="mt-4 font-medium text-slate-900">
                  Queue is empty
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  There are no waiting patients right now.
                </p>
              </div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {waitingPatients.map(
                  (appointment) => {
                    const patientId =
                      appointment.patient?._id;

                    return (
                      <div
                        key={
                          appointment._id
                        }
                        className="flex flex-col gap-4 border-b border-slate-100 p-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                            <UserRound
                              size={18}
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

                            <p className="mt-1 text-sm text-slate-500">
                              Token #
                              {
                                appointment.tokenNumber
                              }
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
                            {
                              appointment.status
                            }
                          </span>

                          {patientId && (
                            <Link
                              to={`/doctor/patients/${patientId}`}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              View Patient
                            </Link>
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

export default DoctorDashboard;