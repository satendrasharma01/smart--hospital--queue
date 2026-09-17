import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const joinedDoctorRef = useRef(null);

  const fetchQueueStatus = useCallback(async () => {
    if (!token) {
      setQueue(null);
      setLoading(false);
      return null;
    }

    try {
      const response = await api.get("/queue/my-status", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const updatedQueue = response.data?.queue || null;
      setQueue(updatedQueue);
      setError("");
      return updatedQueue;
    } catch (err) {
      console.error("Fetch patient queue status error:", err);

      // Keep the last known queue during transient network errors.
      setError((current) =>
        queue ? current : (
          err.response?.data?.message ||
          "Unable to load queue status."
        )
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]); // Deliberately does not depend on queue.

  const joinCurrentDoctorQueue = useCallback(async () => {
    const latest = await fetchQueueStatus();
    const doctorId = latest?.doctorId;

    if (!doctorId) {
      joinedDoctorRef.current = null;
      return;
    }

    const normalized = String(doctorId);

    if (joinedDoctorRef.current === normalized) return;

    socket.emit("joinQueue", normalized);
    joinedDoctorRef.current = normalized;
  }, [fetchQueueStatus]);

  useEffect(() => {
    fetchQueueStatus();
  }, [fetchQueueStatus]);

  useEffect(() => {
    if (!token) return;

    let mounted = true;

    const handleConnect = async () => {
      if (!mounted) return;
      joinedDoctorRef.current = null;
      await joinCurrentDoctorQueue();
    };

    const handleDisconnect = () => {
      joinedDoctorRef.current = null;
    };

    const handleQueueUpdate = async () => {
      const latest = await fetchQueueStatus();

      if (!mounted || !latest?.doctorId) return;

      const normalized = String(latest.doctorId);

      if (joinedDoctorRef.current !== normalized) {
        socket.emit("joinQueue", normalized);
        joinedDoctorRef.current = normalized;
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("queueUpdated", handleQueueUpdate);

    if (!socket.connected) {
      socket.connect();
    } else {
      joinCurrentDoctorQueue();
    }

    // Socket.IO is the primary live transport. Polling is only a
    // low-frequency recovery path for missed events/reconnect gaps.
    const fallback = window.setInterval(() => {
      if (mounted) joinCurrentDoctorQueue();
    }, 10000);

    return () => {
      mounted = false;
      window.clearInterval(fallback);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("queueUpdated", handleQueueUpdate);
      joinedDoctorRef.current = null;
    };
  }, [token, fetchQueueStatus, joinCurrentDoctorQueue]);

  if (loading) {
    return (
      <div className="portal-shell min-h-screen bg-slate-50">
        <PatientSidebar />
        <main className="flex min-h-screen items-center justify-center px-4 lg:ml-64">
          <p className="text-sm text-slate-500">Loading queue status...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="portal-shell min-h-screen bg-slate-50">
      <PatientSidebar />

      <main className="min-w-0 flex-1">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
            <p className="text-sm text-slate-500">Patient Portal</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              Live Queue
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Track your position and live estimated wait.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          {error && queue && (
            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-700">
                Live refresh is temporarily unavailable. Showing the last
                confirmed queue state.
              </p>
            </div>
          )}

          {queue ? (
            <QueueContent queue={queue} />
          ) : (
            <EmptyQueue message={error || "No active appointment found."} />
          )}
        </div>
      </main>
    </div>
  );
}

function QueueContent({ queue }) {
  const isInProgress = queue.status === "in-progress";
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getRemainingSeconds(queue.estimatedStartAt)
  );

  useEffect(() => {
    setRemainingSeconds(getRemainingSeconds(queue.estimatedStartAt));

    if (!queue.estimatedStartAt || isInProgress) return undefined;

    const interval = window.setInterval(() => {
      setRemainingSeconds(getRemainingSeconds(queue.estimatedStartAt));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [queue.estimatedStartAt, isInProgress]);

  const formattedRemaining = useMemo(
    () => formatCountdown(remainingSeconds),
    [remainingSeconds]
  );

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
        <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-slate-500">Current doctor</p>
            <h2 className="mt-1 break-words text-2xl font-semibold text-slate-900">
              {queue.doctor}
            </h2>
            <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
              {queue.status}
            </span>
          </div>

          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-100 sm:h-20 sm:w-20">
            <Activity size={32} className="text-slate-700" />
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <QueueStat label="Your token" value={`#${queue.yourToken}`} icon={Activity} />
          <QueueStat
            label="Currently serving"
            value={
              queue.currentlyServing !== null
                ? `#${queue.currentlyServing}`
                : "—"
            }
            icon={UsersRound}
          />
          <QueueStat
            label="Patients ahead"
            value={queue.patientsAhead}
            icon={UsersRound}
          />
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Clock3 size={19} className="mt-1 shrink-0 text-slate-600" />
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900">
              Estimated waiting time
            </h3>

            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {queue.estimatedWaitMinutes !== null
                ? `${Math.ceil(remainingSeconds / 60)} min`
                : "Unavailable"}
            </p>

            {queue.estimatedWaitMinutes !== null && !isInProgress && (
              <p className="mt-2 text-sm text-slate-500">
                Appointment in{" "}
                <span className="font-medium text-slate-700">
                  {formattedRemaining}
                </span>
              </p>
            )}

            <p className="mt-2 text-xs leading-5 text-slate-400">
              Based on the confirmed queue state and the doctor's configured
              consultation duration. It updates when the queue changes.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="font-semibold text-slate-900">Queue position</h3>
        <p className="mt-1 text-sm text-slate-500">
          Your position is calculated from active appointments ahead of your
          token.
        </p>

        <div className="mt-4 flex max-w-full flex-wrap gap-2">
          {queue.queueStack?.length ? (
            queue.queueStack.map((entry) => (
              <span
                key={entry.tokenNumber}
                className={`max-w-full rounded-lg border px-3 py-2 text-xs sm:text-sm ${
                  entry.tokenNumber === queue.yourToken
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                #{entry.tokenNumber} · {entry.status}
              </span>
            ))
          ) : (
            <p className="text-sm text-slate-500">No queue records found.</p>
          )}
        </div>
      </section>

      {isInProgress && (
        <section className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-800">
            It is your turn.
          </p>
          <p className="mt-1 text-sm text-emerald-700">
            Please proceed to the doctor's consultation area.
          </p>
        </section>
      )}
    </>
  );
}

function getRemainingSeconds(value) {
  if (!value) return 0;

  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) return 0;

  return Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
}

function formatCountdown(totalSeconds) {
  const seconds = Math.max(0, totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      remaining
    ).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(
    2,
    "0"
  )}`;
}

function QueueStat({ label, value, icon: Icon }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={16} />
        <p className="truncate text-xs">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function EmptyQueue({ message }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center sm:p-10">
      <Activity size={28} className="mx-auto text-slate-400" />
      <h2 className="mt-4 font-medium text-slate-900">Queue unavailable</h2>
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
