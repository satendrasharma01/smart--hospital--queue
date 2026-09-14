import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Plus,
  Trash2,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import DoctorSidebar from "../../components/DoctorSidebar";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function DoctorAvailability() {
  const { token } = useAuth();

  const [availability, setAvailability] =
    useState([]);

  const [dayOfWeek, setDayOfWeek] =
    useState("monday");

  const [startTime, setStartTime] =
    useState("09:00");

  const [endTime, setEndTime] =
    useState("12:00");

  const [slotDuration, setSlotDuration] =
    useState("15");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /*
   * =====================================================
   * FETCH AVAILABILITY
   * =====================================================
   */

  const fetchAvailability = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/doctor-availability/my",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAvailability(
        response.data?.availability || []
      );
    } catch (error) {
      console.error(
        "Fetch availability error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to load doctor availability."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchAvailability();
    }
  }, [token, fetchAvailability]);

  /*
   * =====================================================
   * CREATE AVAILABILITY
   * =====================================================
   */

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await api.post(
        "/doctor-availability",
        {
          dayOfWeek,
          startTime,
          endTime,
          slotDuration: Number(
            slotDuration
          ),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const newAvailability =
        response.data?.availability;

      if (newAvailability) {
        setAvailability((current) => [
          ...current,
          newAvailability,
        ]);
      } else {
        await fetchAvailability();
      }

      setSuccess(
        "Availability added successfully."
      );
    } catch (error) {
      console.error(
        "Create availability error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to create availability."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * =====================================================
   * DELETE AVAILABILITY
   * =====================================================
   */

  const handleDelete = async (
    availabilityId
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to remove this availability schedule?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        availabilityId
      );

      setError("");
      setSuccess("");

      await api.delete(
        `/doctor-availability/${availabilityId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAvailability((current) =>
        current.filter(
          (item) =>
            item._id !==
            availabilityId
        )
      );

      setSuccess(
        "Availability removed successfully."
      );
    } catch (error) {
      console.error(
        "Delete availability error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to remove availability."
      );
    } finally {
      setDeletingId("");
    }
  };

  /*
   * =====================================================
   * FORMAT HELPERS
   * =====================================================
   */

  const formatDay = (day) => {
    return (
      day.charAt(0).toUpperCase() +
      day.slice(1)
    );
  };

  const formatTime = (time) => {
    const [hours, minutes] =
      time.split(":");

    const hour =
      Number(hours);

    const suffix =
      hour >= 12 ? "PM" : "AM";

    const displayHour =
      hour % 12 || 12;

    return `${displayHour}:${minutes} ${suffix}`;
  };

  /*
   * =====================================================
   * GENERATE SLOT PREVIEW
   * =====================================================
   */

  const generateSlotPreview = (
    start,
    end,
    duration
  ) => {
    const toMinutes = (time) => {
      const [hours, minutes] =
        time
          .split(":")
          .map(Number);

      return (
        hours * 60 +
        minutes
      );
    };

    const startMinutes =
      toMinutes(start);

    const endMinutes =
      toMinutes(end);

    const slotMinutes =
      Number(duration);

    if (
      !Number.isFinite(
        startMinutes
      ) ||
      !Number.isFinite(
        endMinutes
      ) ||
      !Number.isFinite(
        slotMinutes
      ) ||
      slotMinutes <= 0 ||
      endMinutes <= startMinutes
    ) {
      return [];
    }

    const slots = [];

    for (
      let minutes = startMinutes;
      minutes + slotMinutes <=
        endMinutes;
      minutes += slotMinutes
    ) {
      const hours = Math.floor(
        minutes / 60
      );

      const mins =
        minutes % 60;

      slots.push(
        `${String(hours).padStart(
          2,
          "0"
        )}:${String(mins).padStart(
          2,
          "0"
        )}`
      );
    }

    return slots;
  };

  const previewSlots =
    generateSlotPreview(
      startTime,
      endTime,
      slotDuration
    );

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <DoctorSidebar />

        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-slate-500">
            Loading availability...
          </p>
        </main>
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
      <DoctorSidebar />

      <div className="min-w-0 flex-1">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
            <div>
              <p className="text-sm text-slate-500">
                Smart Hospital
              </p>

              <h1 className="text-lg font-semibold text-slate-900">
                Doctor Availability
              </h1>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-8">
          <div>
            <p className="text-sm text-slate-500">
              Schedule management
            </p>

            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              Manage your availability
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Set the days and time periods when
              patients can book appointments with
              you.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          )}

          {success && (
            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-700">
                {success}
              </p>
            </div>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
            {/* Add schedule */}
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                  <Plus size={19} />
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">
                    Add availability
                  </h3>

                  <p className="text-xs text-slate-500">
                    Create a new appointment period
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className="mt-6 space-y-5"
              >
                <div>
                  <label
                    htmlFor="dayOfWeek"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Day
                  </label>

                  <select
                    id="dayOfWeek"
                    value={dayOfWeek}
                    onChange={(event) =>
                      setDayOfWeek(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  >
                    {DAYS.map((day) => (
                      <option
                        key={day}
                        value={day}
                      >
                        {formatDay(day)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="startTime"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Start time
                    </label>

                    <input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(event) =>
                        setStartTime(
                          event.target.value
                        )
                      }
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="endTime"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      End time
                    </label>

                    <input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(event) =>
                        setEndTime(
                          event.target.value
                        )
                      }
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="slotDuration"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Slot duration
                  </label>

                  <select
                    id="slotDuration"
                    value={slotDuration}
                    onChange={(event) =>
                      setSlotDuration(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="5">
                      5 minutes
                    </option>

                    <option value="10">
                      10 minutes
                    </option>

                    <option value="15">
                      15 minutes
                    </option>

                    <option value="20">
                      20 minutes
                    </option>

                    <option value="30">
                      30 minutes
                    </option>

                    <option value="45">
                      45 minutes
                    </option>

                    <option value="60">
                      60 minutes
                    </option>
                  </select>
                </div>

                {/* Preview */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <Clock3
                      size={15}
                      className="text-slate-500"
                    />

                    <p className="text-xs font-medium text-slate-700">
                      Slot preview
                    </p>
                  </div>

                  {previewSlots.length ===
                  0 ? (
                    <p className="mt-3 text-xs text-red-600">
                      Please choose a valid time
                      range.
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {previewSlots.map(
                        (slot) => (
                          <span
                            key={slot}
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                          >
                            {formatTime(
                              slot
                            )}
                          </span>
                        )
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    previewSlots.length ===
                      0
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus size={17} />

                  {saving
                    ? "Adding..."
                    : "Add availability"}
                </button>
              </form>
            </section>

            {/* Existing schedules */}
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Your schedules
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Active appointment availability
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {availability.length} schedule
                  {availability.length !==
                  1
                    ? "s"
                    : ""}
                </span>
              </div>

              {availability.length ===
              0 ? (
                <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-10 text-center">
                  <CalendarDays
                    size={28}
                    className="mx-auto text-slate-400"
                  />

                  <h4 className="mt-4 font-medium text-slate-900">
                    No availability configured
                  </h4>

                  <p className="mt-1 text-sm text-slate-500">
                    Add your first schedule to
                    allow patients to book appointments.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {DAYS.map((day) => {
                    const daySchedules =
                      availability.filter(
                        (item) =>
                          item.dayOfWeek ===
                          day
                      );

                    if (
                      daySchedules.length ===
                      0
                    ) {
                      return null;
                    }

                    return (
                      <div
                        key={day}
                        className="rounded-lg border border-slate-200 p-4"
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <CalendarDays
                            size={16}
                            className="text-slate-500"
                          />

                          <h4 className="text-sm font-semibold text-slate-900">
                            {formatDay(
                              day
                            )}
                          </h4>
                        </div>

                        <div className="space-y-2">
                          {daySchedules.map(
                            (item) => (
                              <div
                                key={
                                  item._id
                                }
                                className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-4 py-3"
                              >
                                <div>
                                  <p className="text-sm font-medium text-slate-900">
                                    {formatTime(
                                      item.startTime
                                    )}{" "}
                                    –{" "}
                                    {formatTime(
                                      item.endTime
                                    )}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {item.slotDuration}{" "}
                                    minute
                                    slots
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDelete(
                                      item._id
                                    )
                                  }
                                  disabled={
                                    deletingId ===
                                    item._id
                                  }
                                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                  title="Remove availability"
                                >
                                  <Trash2
                                    size={
                                      17
                                    }
                                  />
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default DoctorAvailability;