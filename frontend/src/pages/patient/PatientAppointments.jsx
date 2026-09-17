import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  History,
  Stethoscope,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import { useLocation } from "react-router-dom";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import socket from "../../services/socket";

import PatientSidebar from "../../components/PatientSidebar";
import {
  formatAppointmentDate,
  formatAppointmentTime,
} from "../../utils/dateTime";

const ACTIVE_STATUSES = ["booked", "waiting", "in-progress"];
const HISTORY_STATUSES = ["completed", "cancelled"];

function isSameLocalDate(first, second = new Date()) {
  const a = new Date(first);
  const b = new Date(second);

  return (
    !Number.isNaN(a.getTime()) &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function PatientAppointments() {
  const { token } = useAuth();
  const location = useLocation();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchAppointments = useCallback(
    async (showLoader = true) => {
      if (!token) {
        setAppointments([]);
        setLoading(false);
        return;
      }

      try {
        if (showLoader) setLoading(true);
        setError("");

        const response = await api.get("/appointments/my", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setAppointments(response.data?.appointments || []);
      } catch (requestError) {
        console.error("Fetch appointments error:", requestError);
        setError(
          requestError.response?.data?.message ||
            "Unable to load your appointments."
        );
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (token) fetchAppointments();
  }, [token, fetchAppointments]);

  useEffect(() => {
    const state = location.state;

    if (!state?.bookingSuccess || !state?.appointment) return;

    const newAppointment = state.appointment;

    setAppointments((previous) => {
      if (previous.some((item) => item._id === newAppointment._id)) {
        return previous;
      }
      return [newAppointment, ...previous];
    });

    setSuccess("Appointment booked successfully.");
    fetchAppointments(false);

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );
  }, [location.state, fetchAppointments]);

  useEffect(() => {
    if (!token) return;

    const handleQueueUpdated = () => fetchAppointments(false);

    socket.on("queueUpdated", handleQueueUpdated);

    if (!socket.connected) socket.connect();

    return () => socket.off("queueUpdated", handleQueueUpdated);
  }, [token, fetchAppointments]);

  const groups = useMemo(() => {
    const today = [];
    const upcoming = [];
    const history = [];

    appointments.forEach((appointment) => {
      const status = appointment.status;
      const appointmentDate = new Date(appointment.appointmentDate);

      if (HISTORY_STATUSES.includes(status)) {
        history.push(appointment);
        return;
      }

      if (ACTIVE_STATUSES.includes(status)) {
        if (isSameLocalDate(appointmentDate)) today.push(appointment);
        else if (appointmentDate > new Date()) upcoming.push(appointment);
      }
    });

    const sortByDate = (a, b) =>
      new Date(a.appointmentDate) - new Date(b.appointmentDate);

    today.sort(sortByDate);
    upcoming.sort(sortByDate);
    history.sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));

    return { today, upcoming, history };
  }, [appointments]);

  const handleCancel = async (appointmentId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }

    try {
      setCancellingId(appointmentId);
      setError("");
      setSuccess("");

      const response = await api.patch(
        `/appointments/${appointmentId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(
        response.data?.message || "Appointment cancelled successfully."
      );
      await fetchAppointments(false);
    } catch (requestError) {
      console.error("Cancel appointment error:", requestError);
      setError(
        requestError.response?.data?.message ||
          "Unable to cancel appointment."
      );
    } finally {
      setCancellingId(null);
    }
  };

  const handleClearHistory = async () => {
    if (!groups.history.length) return;

    const confirmed = window.confirm(
      "Are you sure you want to clear your appointment history from your view? Hospital records will be retained and will remain available to doctors and administrators."
    );

    if (!confirmed) return;

    try {
      setClearingHistory(true);
      setError("");
      setSuccess("");

      const response = await api.patch(
        "/appointments/my/history/clear",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(
        response.data?.message ||
          "Appointment history cleared from your view."
      );

      await fetchAppointments(false);
    } catch (requestError) {
      console.error("Clear history error:", requestError);
      setError(
        requestError.response?.data?.message ||
          "Unable to clear appointment history."
      );
    } finally {
      setClearingHistory(false);
    }
  };

  return (
    <div className="portal-shell min-h-screen bg-slate-50">
      <PatientSidebar />

      <main className="min-w-0 flex-1">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7">
            <p className="text-sm text-slate-500">Patient Portal</p>
            <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  My Appointments
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Track today's queue, upcoming visits and your appointment history.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowHistory((current) => !current)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 sm:w-auto"
              >
                <History size={17} />
                {showHistory ? "Hide History" : "Appointment History"}
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-white p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg border border-green-200 bg-white p-4">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
              <p className="text-sm text-slate-500">Loading appointments...</p>
            </div>
          ) : (
            <>
              <AppointmentSection
                title="Today"
                description="Appointments scheduled for today."
                appointments={groups.today}
                emptyMessage="No appointments scheduled for today."
                cancellingId={cancellingId}
                onCancel={handleCancel}
              />

              <AppointmentSection
                title="Upcoming"
                description="Future active appointments."
                appointments={groups.upcoming}
                emptyMessage="No upcoming appointments."
                cancellingId={cancellingId}
                onCancel={handleCancel}
              />

              {showHistory && (
                <section className="mt-10">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <History size={18} className="text-slate-600" />
                        <h2 className="text-lg font-semibold text-slate-900">History</h2>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        Completed, cancelled and automatically missed appointments.
                      </p>
                    </div>

                    {groups.history.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearHistory}
                        disabled={clearingHistory}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                      >
                        <Trash2 size={16} />
                        {clearingHistory ? "Clearing..." : "Clear History"}
                      </button>
                    )}
                  </div>

                  {groups.history.length === 0 ? (
                    <EmptyState
                      icon={History}
                      message="No appointment history."
                    />
                  ) : (
                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      {groups.history.map((appointment) => (
                        <AppointmentCard
                          key={appointment._id}
                          appointment={appointment}
                          cancelling={false}
                          onCancel={handleCancel}
                          history
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function AppointmentSection({
  title,
  description,
  appointments,
  emptyMessage,
  cancellingId,
  onCancel,
}) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>

      {appointments.length === 0 ? (
        <EmptyState icon={CalendarDays} message={emptyMessage} />
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {appointments.map((appointment) => (
            <AppointmentCard
              key={appointment._id}
              appointment={appointment}
              cancelling={cancellingId === appointment._id}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-10">
      <Icon size={27} className="mx-auto text-slate-400" />
      <p className="mt-3 text-sm text-slate-500">{message}</p>
    </div>
  );
}

function AppointmentCard({ appointment, cancelling, onCancel, history = false }) {
  const doctorName = appointment.doctor?.user?.name || "Doctor";
  const department = appointment.doctor?.department?.name || "Department";
  const specialization = appointment.doctor?.specialization || "Specialist";
  const doctorImage = appointment.doctor?.user?.profileImage?.url || "";
  const appointmentDate = new Date(appointment.appointmentDate);
  const canCancel = !history && ["booked", "waiting"].includes(appointment.status);
  const isMissed =
    appointment.status === "cancelled" &&
    appointment.cancellationReason === "missed";

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          {doctorImage ? (
            <img
              src={doctorImage}
              alt={doctorName}
              className="h-12 w-12 shrink-0 rounded-xl object-cover sm:h-14 sm:w-14"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 sm:h-14 sm:w-14">
              <Stethoscope size={21} className="text-slate-600" />
            </div>
          )}

          <div className="min-w-0">
            <h3 className="truncate font-semibold text-slate-900">{doctorName}</h3>
            <p className="mt-1 text-sm text-slate-500">{department}</p>
            <p className="mt-0.5 truncate text-xs text-slate-400">{specialization}</p>
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
          {isMissed ? "Missed" : appointment.status}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-slate-100 pt-5">
        <Info icon={CalendarDays} label="Date" value={formatAppointmentDate(appointmentDate)} />
        <Info icon={Clock3} label="Time" value={formatAppointmentTime(appointmentDate)} />
        <Info icon={Clock3} label="Token" value={`#${appointment.tokenNumber || "—"}`} />
        <Info
          icon={UserRound}
          label="Consultation fee"
          value={
            appointment.doctor?.consultationFee !== undefined
              ? `₹${Number(appointment.doctor.consultationFee).toLocaleString("en-IN")}`
              : "Not available"
          }
        />
      </div>

      {appointment.reason && (
        <div className="mt-5 border-t border-slate-100 pt-5">
          <p className="text-xs text-slate-500">Reason for visit</p>
          <p className="mt-1 text-sm text-slate-700">{appointment.reason}</p>
        </div>
      )}

      {canCancel && (
        <button
          type="button"
          onClick={() => onCancel(appointment._id)}
          disabled={cancelling}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <XCircle size={17} />
          {cancelling ? "Cancelling..." : "Cancel appointment"}
        </button>
      )}
    </article>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Icon size={14} className="shrink-0" />
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

export default PatientAppointments;
