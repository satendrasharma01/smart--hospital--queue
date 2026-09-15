import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Stethoscope,
} from "lucide-react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  formatAppointmentDate,
  getHospitalDateKeyFromInstant,
  getHospitalDayNameFromDateKey,
  getHospitalDateParts,
} from "../../utils/dateTime";

function BookAppointment() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [doctor, setDoctor] =
    useState(null);

  const [availability, setAvailability] =
    useState([]);

  const [bookedSlots, setBookedSlots] =
    useState([]);

  const [selectedDate, setSelectedDate] =
    useState("");

  const [selectedTime, setSelectedTime] =
    useState("");

  const [reason, setReason] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [booking, setBooking] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * =====================================================
   * FETCH DOCTOR + AVAILABILITY + BOOKED SLOTS
   * =====================================================
   */

  useEffect(() => {
    const fetchBookingData = async () => {
      if (!token || !doctorId) {
        return;
      }

      try {
        setLoading(true);
        setError("");

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [
          doctorResponse,
          availabilityResponse,
        ] = await Promise.all([
          api.get(
            `/doctors/${doctorId}`,
            {
              headers,
            }
          ),

          api.get(
            `/doctor-availability/${doctorId}`,
            {
              headers,
            }
          ),
        ]);

        /*
         * =================================================
         * DOCTOR
         * =================================================
         */

        setDoctor(
          doctorResponse.data?.doctor ||
            null
        );

        /*
         * =================================================
         * NORMALIZE AVAILABILITY
         * =================================================
         *
         * Backend may return:
         *
         * 1. { availability: [] }
         * 2. { slots: [] }
         * 3. []
         *
         * Always convert it to an array.
         */

        const availabilityData =
          availabilityResponse.data;

        let normalizedAvailability = [];

        if (
          Array.isArray(
            availabilityData
          )
        ) {
          normalizedAvailability =
            availabilityData;
        } else if (
          Array.isArray(
            availabilityData?.availability
          )
        ) {
          normalizedAvailability =
            availabilityData.availability;
        } else if (
          Array.isArray(
            availabilityData?.slots
          )
        ) {
          normalizedAvailability =
            availabilityData.slots;
        }

        /*
         * Only keep valid availability objects.
         */

        normalizedAvailability =
          normalizedAvailability.filter(
            (item) =>
              item &&
              typeof item ===
                "object" &&
              typeof item.dayOfWeek ===
                "string" &&
              typeof item.startTime ===
                "string" &&
              typeof item.endTime ===
                "string"
          );

        setAvailability(
          normalizedAvailability
        );

        /*
         * =================================================
         * OPTIONAL BOOKED SLOT DATA
         * =================================================
         *
         * If your backend availability endpoint already
         * returns booked slots, use them.
         *
         * Otherwise this safely remains [].
         */

        const responseData =
          availabilityResponse.data;

        let existingBookedSlots = [];

        if (
          Array.isArray(
            responseData?.bookedSlots
          )
        ) {
          existingBookedSlots =
            responseData.bookedSlots;
        }

        setBookedSlots(
          existingBookedSlots
        );
      } catch (error) {
        console.error(
          "Fetch booking data error:",
          error
        );

        setDoctor(null);
        setAvailability([]);
        setBookedSlots([]);

        setError(
          error.response?.data?.message ||
            "Unable to load doctor availability."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBookingData();
  }, [token, doctorId]);

  /*
   * =====================================================
   * ACTIVE AVAILABILITY
   * =====================================================
   */

  const activeAvailability = useMemo(() => {
    if (
      !Array.isArray(availability)
    ) {
      return [];
    }

    return availability.filter(
      (item) =>
        item &&
        item.isActive !== false
    );
  }, [availability]);

  /*
   * =====================================================
   * AVAILABLE DAY NAMES
   * =====================================================
   */

  const availableDayNames = useMemo(() => {
    if (
      !Array.isArray(
        activeAvailability
      )
    ) {
      return [];
    }

    return [
      ...new Set(
        activeAvailability
          .map(
            (item) =>
              String(
                item.dayOfWeek || ""
              ).toLowerCase()
          )
          .filter(Boolean)
      ),
    ];
  }, [activeAvailability]);

  /*
   * =====================================================
   * DATE HELPERS
   * =====================================================
   */

  const getTodayDate = () =>
    getHospitalDateKeyFromInstant(new Date());

  const getDayName = (dateString) =>
    getHospitalDayNameFromDateKey(dateString);

  /*
   * =====================================================
   * NEXT AVAILABLE DATE
   * =====================================================
   */

  const nextAvailableDate =
    useMemo(() => {
      if (
        availableDayNames.length ===
        0
      ) {
        return "";
      }

      const todayKey =
        getTodayDate();

      const today =
        new Date(`${todayKey}T12:00:00Z`);

      for (
        let i = 0;
        i < 90;
        i++
      ) {
        const date =
          new Date(today);

        date.setUTCDate(
          today.getUTCDate() + i
        );

        const dateKey =
          date.toISOString().slice(0, 10);

        const dayName =
          getDayName(dateKey);

        if (
          availableDayNames.includes(
            dayName
          )
        ) {
          return dateKey;
        }
      }

      return "";
    }, [
      availableDayNames,
    ]);

  /*
   * Automatically select next available
   * date.
   */

  useEffect(() => {
    if (
      !selectedDate &&
      nextAvailableDate
    ) {
      setSelectedDate(
        nextAvailableDate
      );
    }
  }, [
    selectedDate,
    nextAvailableDate,
  ]);

  /*
   * =====================================================
   * SELECTED DAY AVAILABILITY
   * =====================================================
   */

  const selectedDayAvailability =
    useMemo(() => {
      if (!selectedDate) {
        return [];
      }

      const dayName =
        getDayName(
          selectedDate
        );

      if (!dayName) {
        return [];
      }

      return activeAvailability.filter(
        (item) =>
          String(
            item.dayOfWeek ||
              ""
          ).toLowerCase() ===
          dayName
      );
    }, [
      selectedDate,
      activeAvailability,
    ]);

  /*
   * =====================================================
   * TIME CONVERSION
   * =====================================================
   */

  const timeToMinutes = (
    time
  ) => {
    if (
      typeof time !==
      "string"
    ) {
      return null;
    }

    const parts =
      time.split(":");

    if (
      parts.length !== 2
    ) {
      return null;
    }

    const hour =
      Number(parts[0]);

    const minute =
      Number(parts[1]);

    if (
      !Number.isInteger(
        hour
      ) ||
      !Number.isInteger(
        minute
      ) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return null;
    }

    return (
      hour * 60 + minute
    );
  };

  /*
   * =====================================================
   * GENERATE ALL TIME SLOTS
   * =====================================================
   */

  const allTimeSlots =
    useMemo(() => {
      if (
        selectedDayAvailability.length ===
        0
      ) {
        return [];
      }

      const slots = [];

      selectedDayAvailability.forEach(
        (schedule) => {
          const startTotal =
            timeToMinutes(
              schedule.startTime
            );

          const endTotal =
            timeToMinutes(
              schedule.endTime
            );

          const duration =
            Number(
              schedule.slotDuration
            );

          if (
            startTotal ===
              null ||
            endTotal ===
              null ||
            !Number.isFinite(
              duration
            ) ||
            duration <= 0 ||
            endTotal <=
              startTotal
          ) {
            return;
          }

          for (
            let minutes =
              startTotal;
            minutes +
              duration <=
              endTotal;
            minutes += duration
          ) {
            const hour =
              Math.floor(
                minutes / 60
              );

            const minute =
              minutes % 60;

            const time = `${String(
              hour
            ).padStart(
              2,
              "0"
            )}:${String(
              minute
            ).padStart(
              2,
              "0"
            )}`;

            slots.push(time);
          }
        }
      );

      return [
        ...new Set(slots),
      ].sort();
    }, [
      selectedDayAvailability,
    ]);

  /*
   * =====================================================
   * BOOKED SLOT NORMALIZATION
   * =====================================================
   */

  const getBookedTimeKeys =
    useMemo(() => {
      const result =
        new Set();

      if (
        !Array.isArray(
          bookedSlots
        )
      ) {
        return result;
      }

      bookedSlots.forEach(
        (item) => {
          if (
            typeof item ===
            "string"
          ) {
            result.add(item);
            return;
          }

          if (
            !item ||
            typeof item !==
              "object"
          ) {
            return;
          }

          /*
           * Supported formats:
           *
           * "10:00"
           * { time: "10:00" }
           * { appointmentDate: "..." }
           */

          if (
            typeof item.time ===
            "string"
          ) {
            result.add(
              item.time.slice(
                0,
                5
              )
            );
          }

          if (
            item.appointmentDate
          ) {
            const date =
              new Date(
                item.appointmentDate
              );

            if (
              !Number.isNaN(
                date.getTime()
              )
            ) {
              const dateKey =
                getHospitalDateKeyFromInstant(
                  date
                );

              if (
                dateKey ===
                selectedDate
              ) {
                const time =
                  `${String(
                    date.getHours()
                  ).padStart(
                    2,
                    "0"
                  )}:${String(
                    date.getMinutes()
                  ).padStart(
                    2,
                    "0"
                  )}`;

                result.add(
                  time
                );
              }
            }
          }
        }
      );

      return result;
    }, [
      bookedSlots,
      selectedDate,
    ]);

  /*
   * =====================================================
   * PAST TIME CHECK
   * =====================================================
   */

  const isPastTime = (
    dateString,
    time
  ) => {
    if (
      !dateString ||
      !time
    ) {
      return false;
    }

    const today =
      getTodayDate();

    if (
      dateString !==
      today
    ) {
      return false;
    }

    const now =
      getHospitalDateParts(new Date());

    const currentMinutes =
      now.hour * 60 +
      now.minute;

    const selectedMinutes =
      timeToMinutes(time);

    if (
      selectedMinutes ===
      null
    ) {
      return true;
    }

    return (
      selectedMinutes <=
      currentMinutes
    );
  };

  /*
   * =====================================================
   * AVAILABLE TIME SLOTS
   * =====================================================
   */

  const timeSlots =
    useMemo(() => {
      return allTimeSlots.filter(
        (time) => {
          /*
           * Hide already booked slot.
           */

          if (
            getBookedTimeKeys.has(
              time
            )
          ) {
            return false;
          }

          /*
           * Hide past slots for today.
           */

          if (
            isPastTime(
              selectedDate,
              time
            )
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      allTimeSlots,
      getBookedTimeKeys,
      selectedDate,
    ]);

  /*
   * =====================================================
   * DATE AVAILABLE?
   * =====================================================
   */

  const isDateAvailable = (
    dateKey
  ) => {
    const dayName =
      getDayName(dateKey);

    return availableDayNames.includes(
      dayName
    );
  };

  /*
   * =====================================================
   * FORMAT TIME
   * =====================================================
   */

  const formatTime = (
    time
  ) => {
    const total =
      timeToMinutes(time);

    if (total === null) {
      return time;
    }

    const hour =
      Math.floor(
        total / 60
      );

    const minute =
      total % 60;

    const date =
      new Date();

    date.setHours(
      hour,
      minute,
      0,
      0
    );

    return date.toLocaleTimeString(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  };

  /*
   * =====================================================
   * CREATE APPOINTMENT DATE
   * =====================================================
   */

  const createAppointmentDate =
    () => {
      if (
        !selectedDate ||
        !selectedTime
      ) {
        return null;
      }

      return `${selectedDate}T${selectedTime}:00+05:30`;
    };

  /*
   * =====================================================
   * HANDLE DATE CHANGE
   * =====================================================
   */

  const handleDateChange =
    (event) => {
      const value =
        event.target.value;

      setSelectedTime("");
      setError("");

      if (!value) {
        setSelectedDate("");
        return;
      }

      const date =
        new Date(`${value}T12:00:00+05:30`);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        setSelectedDate("");
        setError(
          "Invalid appointment date."
        );
        return;
      }

      if (
        !isDateAvailable(value)
      ) {
        setSelectedDate("");

        setError(
          `Doctor is not available on ${getDayName(
            value
          )}. Please choose an available day.`
        );

        return;
      }

      setSelectedDate(value);
    };

  /*
   * =====================================================
   * HANDLE TIME SELECTION
   * =====================================================
   */

  const handleTimeSelection =
    (time) => {
      setError("");

      if (
        getBookedTimeKeys.has(
          time
        )
      ) {
        setError(
          "This appointment slot has already been booked."
        );

        return;
      }

      if (
        isPastTime(
          selectedDate,
          time
        )
      ) {
        setError(
          "This time has already passed."
        );

        return;
      }

      setSelectedTime(time);
    };

  /*
   * =====================================================
   * BOOK APPOINTMENT
   * =====================================================
   */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");

    if (!token) {
      setError(
        "You are not authenticated."
      );
      return;
    }

    if (!doctorId) {
      setError(
        "Doctor information is missing."
      );
      return;
    }

    if (!selectedDate) {
      setError(
        "Please select an appointment date."
      );
      return;
    }

    if (!isDateAvailable(selectedDate)) {
      setError(
        "The doctor is not available on the selected day."
      );
      return;
    }

    if (!selectedTime) {
      setError(
        "Please select an available time slot."
      );
      return;
    }

    /*
     * Client-side protection against
     * already booked slots.
     */

    if (
      getBookedTimeKeys.has(
        selectedTime
      )
    ) {
      setError(
        "This slot has already been booked. Please choose another time."
      );

      setSelectedTime("");
      return;
    }

    /*
     * Client-side protection against
     * past time.
     */

    if (
      isPastTime(
        selectedDate,
        selectedTime
      )
    ) {
      setError(
        "This appointment time has already passed."
      );

      setSelectedTime("");
      return;
    }

    /*
     * Ensure selected slot actually exists
     * in doctor's schedule.
     */

    if (
      !allTimeSlots.includes(
        selectedTime
      )
    ) {
      setError(
        "Selected time is not part of the doctor's availability."
      );

      setSelectedTime("");
      return;
    }

    const appointmentDate =
      createAppointmentDate();

    if (!appointmentDate) {
      setError(
        "Unable to create appointment date."
      );
      return;
    }

    try {
      setBooking(true);

      const response =
        await api.post(
          "/appointments",
          {
            doctorId,
            appointmentDate,
            reason:
              reason.trim(),
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      const appointment =
        response.data?.appointment;

      if (!appointment) {
        throw new Error(
          "Appointment was created but no appointment data was returned."
        );
      }

      navigate(
        "/patient/appointments",
        {
          replace: true,
          state: {
            bookingSuccess:
              true,

            appointment,

            refreshAppointments:
              true,
          },
        }
      );
    } catch (error) {
      console.error(
        "Book appointment error:",
        error.response?.data ||
          error
      );

      /*
       * If another patient booked the same
       * slot milliseconds before this request,
       * backend must reject it.
       */

      setError(
        error.response?.data
          ?.message ||
          error.message ||
          "Unable to book appointment."
      );
    } finally {
      setBooking(false);
    }
  };

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />

          <p className="mt-4 text-sm text-slate-500">
            Loading doctor availability...
          </p>
        </div>
      </div>
    );
  }

  /*
   * =====================================================
   * DOCTOR NOT FOUND
   * =====================================================
   */

  if (!doctor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 sm:px-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <Stethoscope
            size={30}
            className="mx-auto text-slate-400"
          />

          <h2 className="mt-4 font-semibold text-slate-900">
            Doctor information unavailable
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            We could not load this doctor's
            information.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            className="mt-5 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  /*
   * =====================================================
   * DOCTOR DATA
   * =====================================================
   */

  const doctorName =
    doctor.user?.name ||
    "Doctor";

  const department =
    doctor.department?.name ||
    "Department";

  const doctorImage =
    doctor.user?.profileImage
      ?.url || "";

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-5">
          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            className="flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft
              size={16}
            />

            Back
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        {/* PAGE HEADER */}

        <div>
          <p className="text-sm text-slate-500">
            Patient Portal
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Book an appointment
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Select a day and an available
            consultation time.
          </p>
        </div>

        {/* DOCTOR CARD */}

        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-4">
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
                  className="text-slate-500"
                />
              </div>
            )}

            <div>
              <h2 className="font-semibold text-slate-900">
                {doctorName}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {doctor.specialization ||
                  "Specialist"}{" "}
                · {department}
              </p>

              {doctor.qualification && (
                <p className="mt-1 text-xs text-slate-400">
                  {
                    doctor.qualification
                  }
                </p>
              )}
            </div>
          </div>
        </section>

        {/* NO AVAILABILITY */}

        {activeAvailability.length ===
          0 && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-medium text-amber-800">
              No consultation schedule is
              available for this doctor.
            </p>

            <p className="mt-1 text-xs text-amber-700">
              Please choose another doctor or
              contact the hospital.
            </p>
          </div>
        )}

        {/* BOOKING FORM */}

        {activeAvailability.length >
          0 && (
          <form
            onSubmit={
              handleSubmit
            }
            className="mt-6 rounded-xl border border-slate-200 bg-white p-6"
          >
            {/* AVAILABLE DAYS */}

            <div>
              <div className="flex items-center gap-2">
                <CalendarDays
                  size={18}
                  className="text-slate-600"
                />

                <label className="text-sm font-medium text-slate-700">
                  Available days
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {availableDayNames.map(
                  (day) => {
                    const label =
                      day
                        .charAt(0)
                        .toUpperCase() +
                      day.slice(1);

                    const daySchedules =
                      activeAvailability.filter(
                        (item) =>
                          String(
                            item.dayOfWeek ||
                              ""
                          ).toLowerCase() ===
                          day
                      );

                    return (
                      <div
                        key={day}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <p className="text-sm font-medium text-slate-900">
                          {label}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {daySchedules
                            .map(
                              (
                                item
                              ) =>
                                `${formatTime(
                                  item.startTime
                                )} - ${formatTime(
                                  item.endTime
                                )}`
                            )
                            .join(
                              " • "
                            )}
                        </p>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* DATE */}

            <div className="mt-8">
              <label
                htmlFor="appointmentDate"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Select appointment date
              </label>

              <input
                id="appointmentDate"
                type="date"
                value={
                  selectedDate
                }
                min={
                  getTodayDate()
                }
                onChange={
                  handleDateChange
                }
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />

              <p className="mt-2 text-xs text-slate-500">
                Only the doctor's available
                days can be selected.
              </p>
            </div>

            {/* TIME SLOTS */}

            <div className="mt-8">
              <div className="flex items-center gap-2">
                <Clock3
                  size={18}
                  className="text-slate-600"
                />

                <label className="text-sm font-medium text-slate-700">
                  Available time slots
                </label>
              </div>

              {!selectedDate ? (
                <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-center">
                  <p className="text-sm text-slate-500">
                    Select a date to see
                    available time slots.
                  </p>
                </div>
              ) : timeSlots.length ===
                0 ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-5">
                  <p className="text-sm font-medium text-amber-800">
                    No available time slots
                    for this date.
                  </p>

                  <p className="mt-1 text-xs text-amber-700">
                    The doctor's schedule may
                    be full or all remaining
                    slots may already be booked.
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {timeSlots.map(
                    (time) => {
                      const selected =
                        selectedTime ===
                        time;

                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() =>
                            handleTimeSelection(
                              time
                            )
                          }
                          disabled={
                            booking
                          }
                          className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                            selected
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {formatTime(
                            time
                          )}
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            {/* SELECTED APPOINTMENT */}

            {selectedDate &&
              selectedTime && (
                <div className="mt-6 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <CheckCircle2
                    size={18}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                      Selected appointment
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatAppointmentDate(
                        `${selectedDate}T12:00:00+05:30`,
                        {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      {formatTime(
                        selectedTime
                      )}
                    </p>
                  </div>
                </div>
              )}

            {/* REASON */}

            <div className="mt-8">
              <label
                htmlFor="reason"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Reason for visit
              </label>

              <textarea
                id="reason"
                value={reason}
                onChange={(
                  event
                ) =>
                  setReason(
                    event.target
                      .value
                  )
                }
                rows={4}
                maxLength={500}
                placeholder="Briefly describe why you are visiting..."
                className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />

              <p className="mt-2 text-xs text-slate-400">
                {reason.length}/500
              </p>
            </div>

            {/* ERROR */}

            {error && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-600">
                  {error}
                </p>
              </div>
            )}

            {/* ACTIONS */}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  navigate(-1)
                }
                disabled={booking}
                className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  booking ||
                  !selectedDate ||
                  !selectedTime
                }
                className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Clock3
                  size={16}
                />

                {booking
                  ? "Booking..."
                  : "Confirm appointment"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

export default BookAppointment;