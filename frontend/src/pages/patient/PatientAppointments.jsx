import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Stethoscope,
  XCircle,
} from "lucide-react";
import { useLocation } from "react-router-dom";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import socket from "../../services/socket";

import PatientSidebar from "../../components/PatientSidebar";

function PatientAppointments() {
  const { token } = useAuth();
  const location = useLocation();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /*
   * =====================================================
   * FETCH APPOINTMENTS
   * =====================================================
   */

  const fetchAppointments = useCallback(
    async (showLoader = true) => {
      if (!token) {
        setAppointments([]);
        setLoading(false);
        return;
      }

      try {
        if (showLoader) {
          setLoading(true);
        }

        setError("");

        const response = await api.get(
          "/appointments/my",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const latestAppointments =
          response.data?.appointments || [];

        setAppointments(
          latestAppointments
        );
      } catch (error) {
        console.error(
          "Fetch appointments error:",
          error
        );

        setError(
          error.response?.data?.message ||
            "Unable to load your appointments."
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
    if (token) {
      fetchAppointments();
    }
  }, [token, fetchAppointments]);

  /*
   * =====================================================
   * HANDLE NEWLY BOOKED APPOINTMENT
   * =====================================================
   *
   * BookAppointment.jsx sends:
   *
   * state: {
   *   bookingSuccess: true,
   *   appointment,
   *   refreshAppointments: true
   * }
   *
   * Add the appointment immediately so the user
   * doesn't need to refresh the browser.
   */

  useEffect(() => {
    const state = location.state;

    if (
      !state?.bookingSuccess ||
      !state?.appointment
    ) {
      return;
    }

    const newAppointment =
      state.appointment;

    setAppointments((previousAppointments) => {
      const alreadyExists =
        previousAppointments.some(
          (appointment) =>
            appointment._id ===
            newAppointment._id
        );

      if (alreadyExists) {
        return previousAppointments;
      }

      return [
        newAppointment,
        ...previousAppointments,
      ];
    });

    setSuccess(
      "Appointment booked successfully."
    );

    /*
     * Fetch complete server-side appointment data
     * as a background refresh.
     *
     * UI already shows the appointment immediately.
     */
    fetchAppointments(false);

    /*
     * Clear navigation state so browser navigation
     * doesn't repeatedly show the same success message.
     */
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );
  }, [
    location.state,
    fetchAppointments,
  ]);

  /*
   * =====================================================
   * REAL-TIME SOCKET UPDATES
   * =====================================================
   *
   * When doctor calls/completes a patient,
   * backend emits queueUpdated.
   *
   * Patient appointments page will automatically
   * fetch the latest appointment status.
   */

  useEffect(() => {
    if (!token) {
      return;
    }

    const handleQueueUpdated = () => {
      console.log(
        "Appointment page: queue updated"
      );

      /*
       * Don't show loading screen for real-time
       * updates.
       */
      fetchAppointments(false);
    };

    socket.on(
      "queueUpdated",
      handleQueueUpdated
    );

    /*
     * Connect socket if necessary.
     */
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off(
        "queueUpdated",
        handleQueueUpdated
      );
    };
  }, [token, fetchAppointments]);

  /*
   * =====================================================
   * CANCEL APPOINTMENT
   * =====================================================
   */

  const handleCancel = async (
    appointmentId
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this appointment?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancellingId(
        appointmentId
      );

      setError("");
      setSuccess("");

      const response =
        await api.patch(
          `/appointments/${appointmentId}/cancel`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      setSuccess(
        response.data?.message ||
          "Appointment cancelled successfully."
      );

      /*
       * Immediately update UI.
       */
      setAppointments(
        (previousAppointments) =>
          previousAppointments.map(
            (appointment) =>
              appointment._id ===
              appointmentId
                ? {
                    ...appointment,
                    status: "cancelled",
                  }
                : appointment
          )
      );

      /*
       * Get latest server state in background.
       */
      await fetchAppointments(false);
    } catch (error) {
      console.error(
        "Cancel appointment error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to cancel appointment."
      );
    } finally {
      setCancellingId(null);
    }
  };

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
          <div className="mx-auto max-w-7xl px-6 py-7">
            <p className="text-sm text-slate-500">
              Patient Portal
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              My Appointments
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              View and manage your appointments.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-6 py-8">
          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-white p-4">
              <p className="text-sm text-red-600">
                {error}
              </p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-4 rounded-lg border border-green-200 bg-white p-4">
              <p className="text-sm text-green-700">
                {success}
              </p>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
              <p className="text-sm text-slate-500">
                Loading appointments...
              </p>
            </div>
          ) : appointments.length === 0 ? (
            /* Empty */
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
              <CalendarDays
                size={28}
                className="mx-auto text-slate-400"
              />

              <h2 className="mt-4 font-medium text-slate-900">
                No appointments yet
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your appointments will appear
                here after booking.
              </p>
            </div>
          ) : (
            /* Appointment list */
            <div className="grid gap-4 lg:grid-cols-2">
              {appointments.map(
                (appointment) => (
                  <AppointmentCard
                    key={
                      appointment._id
                    }
                    appointment={
                      appointment
                    }
                    cancelling={
                      cancellingId ===
                      appointment._id
                    }
                    onCancel={
                      handleCancel
                    }
                  />
                )
              )}
            </div>
          )}
        </div>
      </main>
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
  cancelling,
  onCancel,
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

  const canCancel = [
    "booked",
    "waiting",
  ].includes(
    appointment.status
  );

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            <Stethoscope size={20} />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">
              {doctorName}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {department}
            </p>
          </div>
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

      {appointment.reason && (
        <div className="mt-5 border-t border-slate-100 pt-5">
          <p className="text-xs text-slate-500">
            Reason for visit
          </p>

          <p className="mt-1 text-sm text-slate-700">
            {appointment.reason}
          </p>
        </div>
      )}

      {canCancel && (
        <button
          type="button"
          onClick={() =>
            onCancel(
              appointment._id
            )
          }
          disabled={cancelling}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <XCircle size={17} />

          {cancelling
            ? "Cancelling..."
            : "Cancel appointment"}
        </button>
      )}
    </article>
  );
}

export default PatientAppointments;