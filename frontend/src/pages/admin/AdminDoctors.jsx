import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DAY_LABELS = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const SLOT_DURATIONS = [
  10,
  15,
  20,
  30,
  45,
  60,
];

function AdminDoctors() {
  const { user } = useAuth();
  const token = user ? "session" : null;

  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [departmentFilter, setDepartmentFilter] =
    useState("");

  const [specializationFilter, setSpecializationFilter] =
    useState("");

  const [selectedDoctor, setSelectedDoctor] =
    useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    specialization: "",
    qualification: "",
    experience: "",
    consultationFee: "",
    department: "",
  });

  const [availableDays, setAvailableDays] =
    useState([]);

  const [availability, setAvailability] =
    useState([]);

  /*
   * =====================================================
   * LOAD DOCTORS + DEPARTMENTS
   * =====================================================
   */

  const fetchData = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError("");

      const [doctorsResponse, departmentsResponse] =
        await Promise.all([
          api.get("/doctors", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),

          api.get("/departments", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

      setDoctors(
        doctorsResponse.data?.doctors || []
      );

      setDepartments(
        departmentsResponse.data?.departments ||
          []
      );
    } catch (error) {
      console.error(
        "Load admin doctors data error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to load doctor data."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  const updateLifecycle = async (doctor, lifecycleStatus) => {
    if (!window.confirm(`Set ${doctor.user?.name || "doctor"} to ${lifecycleStatus}?`)) return;
    try {
      setError("");
      setSuccess("");
      await api.patch(`/admin/doctors/${doctor._id}/lifecycle`, { lifecycleStatus });
      await fetchData();
      setSuccess(`Doctor status updated to ${lifecycleStatus}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update doctor status.");
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, fetchData]);

  /*
   * =====================================================
   * FORM HANDLER
   * =====================================================
   */

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  /*
   * =====================================================
   * AVAILABLE DAYS
   * =====================================================
   */

  const toggleDay = (day) => {
    setAvailableDays((current) => {
      const exists =
        current.includes(day);

      if (exists) {
        setAvailability(
          (currentAvailability) =>
            currentAvailability.filter(
              (item) =>
                item.dayOfWeek !== day
            )
        );

        return current.filter(
          (item) => item !== day
        );
      }

      setAvailability(
        (currentAvailability) => [
          ...currentAvailability,
          {
            id: `${day}-${Date.now()}`,
            dayOfWeek: day,
            startTime: "09:00",
            endTime: "13:00",
            slotDuration: 15,
            isActive: true,
          },
        ]
      );

      return [...current, day];
    });
  };

  /*
   * =====================================================
   * AVAILABILITY HELPERS
   * =====================================================
   */

  const getDayAvailability = (day) => {
    return availability.filter(
      (item) =>
        item.dayOfWeek === day
    );
  };

  const addAvailability = (day) => {
    setAvailability((current) => [
      ...current,
      {
        id: `${day}-${Date.now()}-${Math.random()}`,
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "13:00",
        slotDuration: 15,
        isActive: true,
      },
    ]);
  };

  const removeAvailability = (id) => {
    setAvailability((current) =>
      current.filter(
        (item) => item.id !== id
      )
    );
  };

  const updateAvailability = (
    id,
    field,
    value
  ) => {
    setAvailability((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field ===
                "slotDuration"
                  ? Number(value)
                  : value,
            }
          : item
      )
    );
  };

  /*
   * =====================================================
   * AVAILABILITY VALIDATION
   * =====================================================
   */

  const validateAvailability = () => {
    if (
      availableDays.length === 0
    ) {
      return "Please select at least one available day.";
    }

    for (const day of availableDays) {
      const daySlots =
        getDayAvailability(day);

      if (daySlots.length === 0) {
        return `Please add a timing for ${DAY_LABELS[day]}.`;
      }

      for (const slot of daySlots) {
        if (
          !slot.startTime ||
          !slot.endTime
        ) {
          return `Start and end time are required for ${DAY_LABELS[day]}.`;
        }

        if (
          !slot.slotDuration ||
          slot.slotDuration < 5 ||
          slot.slotDuration > 120
        ) {
          return `Invalid slot duration for ${DAY_LABELS[day]}.`;
        }

        const startMinutes =
          timeToMinutes(
            slot.startTime
          );

        const endMinutes =
          timeToMinutes(
            slot.endTime
          );

        if (
          startMinutes === null ||
          endMinutes === null
        ) {
          return `Invalid time for ${DAY_LABELS[day]}.`;
        }

        if (
          endMinutes <=
          startMinutes
        ) {
          return `End time must be after start time for ${DAY_LABELS[day]}.`;
        }

        if (
          slot.slotDuration >
          endMinutes - startMinutes
        ) {
          return `Slot duration cannot exceed the consultation period for ${DAY_LABELS[day]}.`;
        }
      }

      const sortedSlots = [
        ...daySlots,
      ].sort(
        (a, b) =>
          timeToMinutes(
            a.startTime
          ) -
          timeToMinutes(
            b.startTime
          )
      );

      for (
        let index = 1;
        index < sortedSlots.length;
        index++
      ) {
        const previous =
          sortedSlots[index - 1];

        const current =
          sortedSlots[index];

        if (
          timeToMinutes(
            current.startTime
          ) <
          timeToMinutes(
            previous.endTime
          )
        ) {
          return `Availability timings overlap on ${DAY_LABELS[day]}.`;
        }
      }
    }

    return "";
  };

  /*
   * =====================================================
   * CREATE DOCTOR
   * =====================================================
   */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!token) {
      setError(
        "You are not authenticated."
      );
      return;
    }

    setError("");
    setSuccess("");

    const availabilityError =
      validateAvailability();

    if (availabilityError) {
      setError(
        availabilityError
      );
      return;
    }

    try {
      setCreating(true);

      const cleanAvailability =
        availability.map(
          (item) => ({
            dayOfWeek:
              item.dayOfWeek,
            startTime:
              item.startTime,
            endTime:
              item.endTime,
            slotDuration:
              Number(
                item.slotDuration
              ),
            isActive:
              Boolean(
                item.isActive
              ),
          })
        );

      const payload = {
        ...form,

        experience:
          form.experience === ""
            ? undefined
            : Number(
                form.experience
              ),

        consultationFee:
          form.consultationFee ===
          ""
            ? undefined
            : Number(
                form.consultationFee
              ),

        availableDays,

        availability:
          cleanAvailability,
      };

      const response =
        await api.post(
          "/admin/doctors",
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      setSuccess(
        response.data?.message ||
          "Doctor created successfully."
      );

      setForm({
        name: "",
        email: "",
        password: "",
        specialization: "",
        qualification: "",
        experience: "",
        consultationFee: "",
        department: "",
      });

      setAvailableDays([]);
      setAvailability([]);

      await fetchData();
    } catch (error) {
      console.error(
        "Create doctor error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to create doctor."
      );
    } finally {
      setCreating(false);
    }
  };

  /*
   * =====================================================
   * FILTER DOCTORS
   * =====================================================
   */

  const filteredDoctors =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase();

      const specializationValue =
        specializationFilter
          .trim()
          .toLowerCase();

      return doctors.filter(
        (doctor) => {
          const doctorName =
            doctor.user?.name ||
            "";

          const doctorEmail =
            doctor.user?.email ||
            "";

          const specialization =
            doctor.specialization ||
            "";

          const matchesSearch =
            !searchValue ||
            doctorName
              .toLowerCase()
              .includes(
                searchValue
              ) ||
            doctorEmail
              .toLowerCase()
              .includes(
                searchValue
              ) ||
            specialization
              .toLowerCase()
              .includes(
                searchValue
              );

          const matchesDepartment =
            !departmentFilter ||
            doctor.department?._id ===
              departmentFilter;

          const matchesSpecialization =
            !specializationValue ||
            specialization
              .toLowerCase()
              .includes(
                specializationValue
              );

          return (
            matchesSearch &&
            matchesDepartment &&
            matchesSpecialization
          );
        }
      );
    }, [
      doctors,
      search,
      departmentFilter,
      specializationFilter,
    ]);

  /*
   * =====================================================
   * GROUP AVAILABILITY
   * =====================================================
   */

  const groupedAvailability =
    useMemo(() => {
      return DAYS.reduce(
        (result, day) => {
          result[day] =
            availability.filter(
              (item) =>
                item.dayOfWeek ===
                day
            );

          return result;
        },
        {}
      );
    }, [availability]);

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="min-w-0">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-7">
            <p className="text-sm text-slate-500">
              Admin Portal
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              Doctors
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Create and manage hospital
              doctors and their consultation
              schedules.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-6 py-8">
          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm text-green-700">
                {success}
              </p>
            </div>
          )}

          {/* =================================================
              CREATE DOCTOR
          ================================================= */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                <Stethoscope
                  size={21}
                />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Create Doctor
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add doctor account, profile
                  and consultation availability.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-8"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  label="Doctor name"
                  name="name"
                  value={form.name}
                  onChange={
                    handleChange
                  }
                  placeholder="Dr. John Doe"
                  required
                />

                <FormField
                  label="Email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={
                    handleChange
                  }
                  placeholder="doctor@hospital.com"
                  required
                />

                <FormField
                  label="Password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={
                    handleChange
                  }
                  placeholder="Minimum 6 characters"
                  required
                />

                <FormField
                  label="Specialization"
                  name="specialization"
                  value={
                    form.specialization
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Cardiologist"
                  required
                />

                <FormField
                  label="Qualification"
                  name="qualification"
                  value={
                    form.qualification
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="MBBS, MD"
                  required
                />

                <FormField
                  label="Experience (years)"
                  name="experience"
                  type="number"
                  min="0"
                  max="80"
                  value={
                    form.experience
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="5"
                />

                <FormField
                  label="Consultation fee"
                  name="consultationFee"
                  type="number"
                  min="0"
                  value={
                    form.consultationFee
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="500"
                />

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Department
                  </label>

                  <select
                    name="department"
                    value={
                      form.department
                    }
                    onChange={
                      handleChange
                    }
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="">
                      Select department
                    </option>

                    {departments.map(
                      (department) => (
                        <option
                          key={
                            department._id
                          }
                          value={
                            department._id
                          }
                        >
                          {
                            department.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* AVAILABLE DAYS */}

              <div className="mt-8 border-t border-slate-100 pt-8">
                <div className="flex items-start gap-3">
                  <CalendarDays
                    size={19}
                    className="mt-0.5 text-slate-500"
                  />

                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Available Days
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Select the days on which
                      this doctor provides
                      consultations.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {DAYS.map(
                    (day) => {
                      const selected =
                        availableDays.includes(
                          day
                        );

                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() =>
                            toggleDay(
                              day
                            )
                          }
                          className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                            selected
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>
                              {
                                DAY_LABELS[
                                  day
                                ]
                              }
                            </span>

                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                                selected
                                  ? "border-white bg-white text-slate-900"
                                  : "border-slate-300"
                              }`}
                            >
                              {selected
                                ? "✓"
                                : ""}
                            </span>
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* CONSULTATION SCHEDULE */}

              {availableDays.length >
                0 && (
                <div className="mt-8 border-t border-slate-100 pt-8">
                  <div className="flex items-start gap-3">
                    <Clock3
                      size={19}
                      className="mt-0.5 text-slate-500"
                    />

                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Consultation Schedule
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Define consultation
                        timings and appointment
                        slot duration.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-5">
                    {availableDays.map(
                      (day) => {
                        const daySlots =
                          groupedAvailability[
                            day
                          ] || [];

                        return (
                          <div
                            key={day}
                            className="rounded-xl border border-slate-200 p-5"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <h4 className="font-semibold capitalize text-slate-900">
                                  {
                                    DAY_LABELS[
                                      day
                                    ]
                                  }
                                </h4>

                                <p className="mt-1 text-xs text-slate-500">
                                  {
                                    daySlots.length
                                  }{" "}
                                  timing
                                  {daySlots.length !==
                                  1
                                    ? "s"
                                    : ""}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  addAvailability(
                                    day
                                  )
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                              >
                                <Plus
                                  size={16}
                                />

                                Add timing
                              </button>
                            </div>

                            <div className="mt-5 space-y-3">
                              {daySlots.map(
                                (slot) => (
                                  <div
                                    key={
                                      slot.id
                                    }
                                    className="rounded-lg border border-slate-100 bg-slate-50 p-4"
                                  >
                                    <div className="grid gap-4 md:grid-cols-[1fr_1fr_180px_auto]">
                                      <div>
                                        <label className="mb-2 block text-xs font-medium text-slate-600">
                                          Start time
                                        </label>

                                        <input
                                          type="time"
                                          value={
                                            slot.startTime
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            updateAvailability(
                                              slot.id,
                                              "startTime",
                                              event
                                                .target
                                                .value
                                            )
                                          }
                                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                                        />
                                      </div>

                                      <div>
                                        <label className="mb-2 block text-xs font-medium text-slate-600">
                                          End time
                                        </label>

                                        <input
                                          type="time"
                                          value={
                                            slot.endTime
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            updateAvailability(
                                              slot.id,
                                              "endTime",
                                              event
                                                .target
                                                .value
                                            )
                                          }
                                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                                        />
                                      </div>

                                      <div>
                                        <label className="mb-2 block text-xs font-medium text-slate-600">
                                          Slot duration
                                        </label>

                                        <select
                                          value={
                                            slot.slotDuration
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            updateAvailability(
                                              slot.id,
                                              "slotDuration",
                                              event
                                                .target
                                                .value
                                            )
                                          }
                                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                                        >
                                          {SLOT_DURATIONS.map(
                                            (
                                              duration
                                            ) => (
                                              <option
                                                key={
                                                  duration
                                                }
                                                value={
                                                  duration
                                                }
                                              >
                                                {
                                                  duration
                                                }{" "}
                                                minutes
                                              </option>
                                            )
                                          )}
                                        </select>
                                      </div>

                                      <div className="flex items-end">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            removeAvailability(
                                              slot.id
                                            )
                                          }
                                          disabled={
                                            daySlots.length ===
                                            1
                                          }
                                          className="flex h-[42px] w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 md:w-auto"
                                        >
                                          <Trash2
                                            size={
                                              16
                                            }
                                          />

                                          <span className="md:hidden">
                                            Remove
                                          </span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
                <button
                  type="submit"
                  disabled={
                    creating
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Stethoscope
                    size={17}
                  />

                  {creating
                    ? "Creating Doctor..."
                    : "Create Doctor"}
                </button>
              </div>
            </form>
          </section>

          {/* =================================================
              EXISTING DOCTORS
          ================================================= */}

          <section className="mt-8">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Existing Doctors
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Doctors currently registered in
                the hospital system.
              </p>
            </div>

            {/* FILTERS */}

            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
              <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_auto]">
                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search doctor name, email or specialization..."
                    className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <select
                  value={
                    departmentFilter
                  }
                  onChange={(event) =>
                    setDepartmentFilter(
                      event.target.value
                    )
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                >
                  <option value="">
                    All departments
                  </option>

                  {departments.map(
                    (department) => (
                      <option
                        key={
                          department._id
                        }
                        value={
                          department._id
                        }
                      >
                        {
                          department.name
                        }
                      </option>
                    )
                  )}
                </select>

                <input
                  type="text"
                  value={
                    specializationFilter
                  }
                  onChange={(event) =>
                    setSpecializationFilter(
                      event.target.value
                    )
                  }
                  placeholder="Specialization"
                  className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900"
                />

                {(search ||
                  departmentFilter ||
                  specializationFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setDepartmentFilter(
                        ""
                      );
                      setSpecializationFilter(
                        ""
                      );
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <X size={16} />
                    Clear
                  </button>
                )}
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Showing{" "}
                {
                  filteredDoctors.length
                }{" "}
                of {doctors.length} doctors
              </p>
            </div>

            {loading ? (
              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-10 text-center">
                <p className="text-sm text-slate-500">
                  Loading doctors...
                </p>
              </div>
            ) : filteredDoctors.length ===
              0 ? (
              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-10 text-center">
                <Stethoscope
                  size={28}
                  className="mx-auto text-slate-400"
                />

                <p className="mt-4 text-sm text-slate-500">
                  No doctors match your
                  search.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredDoctors.map(
                  (doctor) => (
                    <DoctorCard
                      key={
                        doctor._id
                      }
                      doctor={
                        doctor
                      }
                      onView={() =>
                        setSelectedDoctor(
                          doctor
                        )
                      }
                      onLifecycle={(status) => updateLifecycle(doctor, status)}
                    />
                  )
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* =====================================================
          DOCTOR DETAILS MODAL
      ===================================================== */}

      {selectedDoctor && (
        <DoctorDetailsModal
          doctor={
            selectedDoctor
          }
          onClose={() =>
            setSelectedDoctor(
              null
            )
          }
        />
      )}
    </div>
  );
}

/*
 * =====================================================
 * FORM FIELD
 * =====================================================
 */

function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  min,
  max,
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
      />
    </div>
  );
}

/*
 * =====================================================
 * DOCTOR CARD
 * =====================================================
 */

function DoctorCard({
  doctor,
  onView,
  onLifecycle,
}) {
  const doctorName =
    doctor.user?.name ||
    "Doctor";

  const email =
    doctor.user?.email ||
    "No email";

  const department =
    doctor.department?.name ||
    "Department";

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100">
          <Stethoscope
            size={21}
          />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            doctor.lifecycleStatus === "suspended"
              ? "bg-red-100 text-red-700"
              : doctor.lifecycleStatus === "inactive"
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
          }`}>
            {doctor.lifecycleStatus || "active"}
          </span>
          <select
            value={doctor.lifecycleStatus || "active"}
            onChange={(event) => onLifecycle(event.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
            aria-label={`Lifecycle status for ${doctorName}`}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900">
            {doctorName}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {doctor.specialization ||
              "Specialist"}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {department}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
        <div>
          <p className="text-xs text-slate-400">
            Experience
          </p>

          <p className="mt-1 text-sm font-medium text-slate-900">
            {doctor.experience ??
              0}{" "}
            years
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-400">
            Consultation
          </p>

          <p className="mt-1 text-sm font-medium text-slate-900">
            ₹
            {doctor.consultationFee ??
              0}
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-400">
          Email
        </p>

        <p className="mt-1 truncate text-sm text-slate-700">
          {email}
        </p>
      </div>

      {doctor.availableDays?.length >
        0 && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-400">
            Available days
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {doctor.availableDays.map(
              (day) => (
                <span
                  key={day}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs capitalize text-slate-600"
                >
                  {day}
                </span>
              )
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onView}
        className="mt-5 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        View doctor details
      </button>
    </article>
  );
}

/*
 * =====================================================
 * DOCTOR DETAILS MODAL
 * =====================================================
 */

function DoctorDetailsModal({
  doctor,
  onClose,
}) {
  const doctorName =
    doctor.user?.name ||
    "Doctor";

  const department =
    doctor.department?.name ||
    "Department";

  const availableDays =
    doctor.availableDays || [];

  /*
   * Doctor model currently returns
   * availableDays, but availability
   * timings may not be populated by
   * GET /doctors.
   *
   * Therefore only display timing data
   * when it actually exists.
   */

  const schedules =
    Array.isArray(
      doctor.availability
    )
      ? doctor.availability
      : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Doctor Details
            </p>

            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              {doctorName}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {doctor.specialization ||
                "Specialist"}{" "}
              · {department}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={19} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Detail
              label="Qualification"
              value={
                doctor.qualification ||
                "Not provided"
              }
            />

            <Detail
              label="Experience"
              value={`${doctor.experience ?? 0} years`}
            />

            <Detail
              label="Consultation Fee"
              value={`₹${doctor.consultationFee ?? 0}`}
            />
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h3 className="font-semibold text-slate-900">
              Available Days
            </h3>

            {availableDays.length ===
            0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No availability configured.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {availableDays.map(
                  (day) => (
                    <span
                      key={day}
                      className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium capitalize text-slate-700"
                    >
                      {
                        DAY_LABELS[
                          day
                        ] || day
                      }
                    </span>
                  )
                )}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-5">
            <div className="flex items-center gap-2">
              <Clock3
                size={17}
                className="text-slate-500"
              />

              <h3 className="font-semibold text-slate-900">
                Consultation Schedule
              </h3>
            </div>

            {schedules.length ===
            0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Schedule timings are not included
                in the current doctor response.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {schedules.map(
                  (schedule) => (
                    <div
                      key={
                        schedule._id ||
                        `${schedule.dayOfWeek}-${schedule.startTime}`
                      }
                      className="flex items-center justify-between rounded-lg bg-slate-50 p-4"
                    >
                      <span className="font-medium capitalize text-slate-800">
                        {
                          DAY_LABELS[
                            schedule.dayOfWeek
                          ] ||
                          schedule.dayOfWeek
                        }
                      </span>

                      <span className="text-sm text-slate-600">
                        {
                          schedule.startTime
                        }{" "}
                        -{" "}
                        {
                          schedule.endTime
                        }
                        {" · "}
                        {
                          schedule.slotDuration
                        }{" "}
                        min
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/*
 * =====================================================
 * DETAIL
 * =====================================================
 */

function Detail({
  label,
  value,
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-900">
        {value}
      </p>
    </div>
  );
}

/*
 * =====================================================
 * TIME HELPER
 * =====================================================
 */

function timeToMinutes(time) {
  if (
    !time ||
    !/^\d{2}:\d{2}$/.test(
      time
    )
  ) {
    return null;
  }

  const [hours, minutes] =
    time.split(":").map(Number);

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return (
    hours * 60 + minutes
  );
}

export default AdminDoctors;