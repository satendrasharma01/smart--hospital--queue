import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Activity,
  Clock3,
  UsersRound,
} from "lucide-react";

import { Link } from "react-router-dom";

import api from "../../services/api";
import socket from "../../services/socket";
import { useAuth } from "../../context/AuthContext";
import PatientSidebar from "../../components/PatientSidebar";

function PatientQueue() {
  const { token } = useAuth();

  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const socketJoinedDoctorRef =
    useRef(null);

  /*
   * =====================================================
   * FETCH QUEUE STATUS
   * =====================================================
   */

  const fetchQueueStatus =
    useCallback(async () => {
      if (!token) {
        setQueue(null);
        setLoading(false);
        return null;
      }

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

        const updatedQueue =
          response.data?.queue || null;

        setQueue(updatedQueue);

        setError("");

        return updatedQueue;
      } catch (error) {
        console.error(
          "Fetch patient queue status error:",
          error
        );

        /*
         * Don't immediately destroy existing
         * queue data because of a temporary
         * network/socket/API problem.
         */
        if (!queue) {
          setError(
            error.response?.data?.message ||
              "Unable to load queue status."
          );
        }

        return null;
      } finally {
        setLoading(false);
      }
    }, [token, queue]);

  /*
   * =====================================================
   * INITIAL LOAD
   * =====================================================
   */

  useEffect(() => {
    fetchQueueStatus();
  }, [fetchQueueStatus]);

  /*
   * =====================================================
   * 🔥 AUTOMATIC LIVE SYNC
   *
   * Socket.IO = instant update
   * Polling = backup synchronization
   *
   * This means the dashboard keeps updating even if
   * a socket event is missed temporarily.
   * =====================================================
   */

  useEffect(() => {
    if (!token) {
      return;
    }

    let mounted = true;

    /*
     * -----------------------------------------------------
     * Join doctor's queue room
     * -----------------------------------------------------
     */

    const joinDoctorQueue =
      async () => {
        if (!mounted) {
          return;
        }

        try {
          const latestQueue =
            await fetchQueueStatus();

          if (!mounted) {
            return;
          }

          const doctorId =
            latestQueue?.doctorId;

          /*
           * Patient has no active appointment yet.
           *
           * That's okay.
           *
           * Polling will detect the appointment
           * when it gets created.
           */
          if (!doctorId) {
            socketJoinedDoctorRef.current =
              null;

            return;
          }

          const normalizedDoctorId =
            String(doctorId);

          /*
           * Avoid duplicate room joins.
           */
          if (
            socketJoinedDoctorRef.current ===
            normalizedDoctorId
          ) {
            return;
          }

          socket.emit(
            "joinQueue",
            normalizedDoctorId
          );

          socketJoinedDoctorRef.current =
            normalizedDoctorId;

          console.log(
            "Patient joined doctor queue:",
            normalizedDoctorId
          );
        } catch (error) {
          console.error(
            "Patient queue socket setup error:",
            error
          );
        }
      };

    /*
     * -----------------------------------------------------
     * SOCKET CONNECT
     * -----------------------------------------------------
     */

    const handleSocketConnect =
      async () => {
        console.log(
          "Patient socket connected:",
          socket.id
        );

        /*
         * Rejoin room after reconnect.
         */
        socketJoinedDoctorRef.current =
          null;

        await joinDoctorQueue();
      };

    /*
     * -----------------------------------------------------
     * SOCKET DISCONNECT
     * -----------------------------------------------------
     */

    const handleSocketDisconnect =
      () => {
        console.log(
          "Patient socket disconnected"
        );

        /*
         * Allow room to be joined again
         * after reconnect.
         */
        socketJoinedDoctorRef.current =
          null;
      };

    /*
     * -----------------------------------------------------
     * LIVE QUEUE EVENT
     * -----------------------------------------------------
     */

    const handleQueueUpdate =
      async (data) => {
        console.log(
          "Patient received queueUpdated:",
          data
        );

        /*
         * Immediately fetch latest queue.
         */
        const latestQueue =
          await fetchQueueStatus();

        /*
         * If patient just received an appointment
         * or doctor changed, join the correct room.
         */
        if (
          latestQueue?.doctorId &&
          mounted
        ) {
          const normalizedDoctorId =
            String(
              latestQueue.doctorId
            );

          if (
            socketJoinedDoctorRef.current !==
            normalizedDoctorId
          ) {
            socket.emit(
              "joinQueue",
              normalizedDoctorId
            );

            socketJoinedDoctorRef.current =
              normalizedDoctorId;
          }
        }
      };

    /*
     * Register socket listeners.
     */

    socket.on(
      "connect",
      handleSocketConnect
    );

    socket.on(
      "disconnect",
      handleSocketDisconnect
    );

    socket.on(
      "queueUpdated",
      handleQueueUpdate
    );

    /*
     * Connect socket.
     */

    if (!socket.connected) {
      socket.connect();
    } else {
      joinDoctorQueue();
    }

    /*
     * =====================================================
     * 🔄 POLLING FALLBACK
     *
    * Every 2 seconds fetch latest queue.
     *
     * This makes the dashboard automatically update
     * even if Socket.IO temporarily misses an event.
     * =====================================================
     */

    const pollingInterval =
      setInterval(async () => {
        if (!mounted) {
          return;
        }

        const latestQueue =
          await fetchQueueStatus();

        if (
          !mounted ||
          !latestQueue?.doctorId
        ) {
          return;
        }

        const normalizedDoctorId =
          String(
            latestQueue.doctorId
          );

        /*
         * Join the room if we weren't already
         * connected to this doctor's queue.
         */
        if (
          socketJoinedDoctorRef.current !==
          normalizedDoctorId
        ) {
          socket.emit(
            "joinQueue",
            normalizedDoctorId
          );

          socketJoinedDoctorRef.current =
            normalizedDoctorId;

          console.log(
            "Patient joined queue through sync:",
            normalizedDoctorId
          );
        }
      }, 2000);

    /*
     * =====================================================
     * CLEANUP
     * =====================================================
     */

    return () => {
      mounted = false;

      clearInterval(
        pollingInterval
      );

      socket.off(
        "connect",
        handleSocketConnect
      );

      socket.off(
        "disconnect",
        handleSocketDisconnect
      );

      socket.off(
        "queueUpdated",
        handleQueueUpdate
      );

      socketJoinedDoctorRef.current =
        null;

    };
  }, [
    token,
    fetchQueueStatus,
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
          Loading queue status...
        </p>
      </div>
    );
  }

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PatientSidebar />

      <main className="min-w-0 flex-1">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
            <p className="text-sm text-slate-500">
              Patient Portal
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              Live Queue
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Track your position in the doctor's queue.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          {error && !queue ? (
            <EmptyQueue
              message={error}
            />
          ) : queue ? (
            <QueueContent
              queue={queue}
            />
          ) : (
            <EmptyQueue
              message="No active appointment found."
            />
          )}
        </div>
      </main>
    </div>
  );
}

/*
 * =====================================================
 * QUEUE CONTENT
 * =====================================================
 */

function QueueContent({
  queue,
}) {
  const isInProgress =
    queue.status ===
    "in-progress";

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">
              Current doctor
            </p>

            <h2 className="mt-1 text-2xl font-semibold text-slate-900">
              {queue.doctor}
            </h2>

            <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
              {queue.status}
            </span>
          </div>

          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100">
            <Activity
              size={34}
              className="text-slate-700"
            />
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <QueueStat
            label="Your token"
            value={`#${queue.yourToken}`}
            icon={Activity}
          />

          <QueueStat
            label="Currently serving"
            value={
              queue.currentlyServing !==
              null
                ? `#${queue.currentlyServing}`
                : "—"
            }
            icon={UsersRound}
          />

          <QueueStat
            label="Patients ahead"
            value={
              queue.patientsAhead
            }
            icon={UsersRound}
          />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-900">Queue order</h3>
        <p className="mt-1 text-sm text-slate-500">
          Patients are served from the front by the lowest eligible token.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {queue.queueStack?.length ? (
            queue.queueStack.map((entry) => (
              <span
                key={entry.tokenNumber}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  entry.tokenNumber === queue.yourToken
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                #{entry.tokenNumber} · {entry.status}
              </span>
            ))
          ) : (
            <p className="text-sm text-slate-500">No records found</p>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            <Clock3 size={19} />
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">
              Estimated waiting time
            </h3>

            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
              {queue.estimatedWaitMinutes !== null
                ? `${queue.estimatedWaitMinutes} min`
                : "Unavailable"}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              This estimate is based on the current queue.
            </p>
          </div>
        </div>
      </section>

      {isInProgress && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-900">
            It is your turn.
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Please proceed to the doctor's consultation area.
          </p>
        </section>
      )}
    </>
  );
}

/*
 * =====================================================
 * QUEUE STAT
 * =====================================================
 */

function QueueStat({
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
 * EMPTY QUEUE
 * =====================================================
 */

function EmptyQueue({
  message,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
      <Activity
        size={28}
        className="mx-auto text-slate-400"
      />

      <h2 className="mt-4 font-medium text-slate-900">
        Queue unavailable
      </h2>

      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        {message}
      </p>

      <Link
        to="/patient/appointments"
        className="mt-5 inline-block rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
      >
        View appointments
      </Link>
    </div>
  );
}

export default PatientQueue;