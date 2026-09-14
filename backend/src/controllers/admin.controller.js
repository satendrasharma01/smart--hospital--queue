const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Department = require("../models/Department");
const DoctorAvailability = require("../models/DoctorAvailability");
const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");
const Session = require("../models/Session");

const { sendEmail } = require("../services/email.service");
const { getHospitalDayRange } = require("../utils/dateTime");

/*
 * =====================================================
 * CONSTANTS
 * =====================================================
 */

const VALID_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const VALID_APPOINTMENT_STATUSES = [
  "booked",
  "waiting",
  "in-progress",
  "completed",
  "cancelled",
];

const TIME_REGEX =
  /^([01]\d|2[0-3]):([0-5]\d)$/;

/*
 * =====================================================
 * HELPERS
 * =====================================================
 */

const normalizeAvailability = (
  availability
) => {
  if (!Array.isArray(availability)) {
    return [];
  }

  return availability.map((item) => ({
    dayOfWeek: String(
      item.dayOfWeek || ""
    )
      .trim()
      .toLowerCase(),

    startTime: String(
      item.startTime || ""
    ).trim(),

    endTime: String(
      item.endTime || ""
    ).trim(),

    slotDuration: Number(
      item.slotDuration
    ),

    isActive:
      item.isActive !== undefined
        ? Boolean(item.isActive)
        : true,
  }));
};

const validateAvailability = (
  availability
) => {
  if (!Array.isArray(availability)) {
    return "Availability must be an array";
  }

  for (const item of availability) {
    if (
      !VALID_DAYS.includes(
        item.dayOfWeek
      )
    ) {
      return `Invalid availability day: ${item.dayOfWeek}`;
    }

    if (
      !TIME_REGEX.test(
        item.startTime
      )
    ) {
      return `Invalid start time for ${item.dayOfWeek}`;
    }

    if (
      !TIME_REGEX.test(
        item.endTime
      )
    ) {
      return `Invalid end time for ${item.dayOfWeek}`;
    }

    if (
      !Number.isInteger(
        item.slotDuration
      ) ||
      item.slotDuration < 5 ||
      item.slotDuration > 120
    ) {
      return `Slot duration for ${item.dayOfWeek} must be between 5 and 120 minutes`;
    }

    const [
      startHour,
      startMinute,
    ] = item.startTime
      .split(":")
      .map(Number);

    const [
      endHour,
      endMinute,
    ] = item.endTime
      .split(":")
      .map(Number);

    const startTotal =
      startHour * 60 +
      startMinute;

    const endTotal =
      endHour * 60 +
      endMinute;

    if (endTotal <= startTotal) {
      return `End time must be after start time for ${item.dayOfWeek}`;
    }

    if (
      item.slotDuration >
      endTotal - startTotal
    ) {
      return `Slot duration cannot exceed availability period for ${item.dayOfWeek}`;
    }
  }

  /*
   * Prevent overlapping schedules
   * on same day.
   */

  for (const day of VALID_DAYS) {
    const daySlots =
      availability
        .filter(
          (item) =>
            item.dayOfWeek === day &&
            item.isActive
        )
        .sort((a, b) =>
          a.startTime.localeCompare(
            b.startTime
          )
        );

    for (
      let i = 1;
      i < daySlots.length;
      i++
    ) {
      const previous =
        daySlots[i - 1];

      const current =
        daySlots[i];

      if (
        current.startTime <
        previous.endTime
      ) {
        return `Availability periods overlap on ${day}`;
      }
    }
  }

  return null;
};

/*
 * =====================================================
 * DEPARTMENT HELPERS
 * =====================================================
 */

/*
 * Resolve department whether database
 * contains:
 *
 * 1. ObjectId
 * 2. ObjectId string
 * 3. Department name string
 */

const resolveDepartmentId =
  async (departmentValue) => {
    if (!departmentValue) {
      return null;
    }

    const value = String(
      departmentValue
    ).trim();

    if (!value) {
      return null;
    }

    /*
     * Already valid ObjectId
     */

    if (
      mongoose.Types.ObjectId.isValid(
        value
      )
    ) {
      const department =
        await Department.findById(
          value
        ).select("_id");

      if (department) {
        return department._id;
      }
    }

    /*
     * Department name
     */

    const department =
      await Department.findOne({
        name: {
          $regex: `^${value.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )}$`,
          $options: "i",
        },
      }).select("_id");

    if (department) {
      return department._id;
    }

    return null;
  };

/*
 * =====================================================
 * CREATE DOCTOR
 * =====================================================
 */

const createDoctor = async (
  req,
  res
) => {
  const session =
    await mongoose.startSession();

  try {
    const {
      name,
      email,
      password,
      specialization,
      qualification,
      experience,
      consultationFee,
      department,
      availableDays,
      availability,
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !specialization ||
      !qualification ||
      !department
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, password, specialization, qualification and department are required",
      });
    }

    /*
     * Resolve department name/ObjectId
     */

    const departmentId =
      await resolveDepartmentId(
        department
      );

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid department. Please select a valid department.",
      });
    }

    const normalizedAvailability =
      normalizeAvailability(
        availability
      );

    const availabilityError =
      validateAvailability(
        normalizedAvailability
      );

    if (availabilityError) {
      return res.status(400).json({
        success: false,
        message: availabilityError,
      });
    }

    const normalizedAvailableDays =
      Array.isArray(availableDays)
        ? [
            ...new Set(
              availableDays.map(
                (day) =>
                  String(day)
                    .trim()
                    .toLowerCase()
              )
            ),
          ]
        : [];

    const availabilityDays = [
      ...new Set(
        normalizedAvailability
          .filter(
            (item) => item.isActive
          )
          .map(
            (item) =>
              item.dayOfWeek
          )
      ),
    ];

    if (
      normalizedAvailability.length >
      0
    ) {
      const missingDays =
        availabilityDays.filter(
          (day) =>
            !normalizedAvailableDays.includes(
              day
            )
        );

      if (missingDays.length > 0) {
        return res.status(400).json({
          success: false,
          message:
            "Every availability day must also be selected in availableDays",
          days: missingDays,
        });
      }
    }

    const normalizedEmail =
      email.toLowerCase().trim();

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "A user with this email already exists",
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        12
      );

    let createdDoctor;

    try {
      await session.withTransaction(
        async () => {
          const [user] =
            await User.create(
              [
                {
                  name: name.trim(),
                  email:
                    normalizedEmail,
                  password:
                    hashedPassword,
                  role: "doctor",
                },
              ],
              { session }
            );

          [createdDoctor] =
            await Doctor.create(
              [
                {
                  user: user._id,

                  specialization:
                    specialization.trim(),

                  qualification:
                    qualification.trim(),

                  experience:
                    experience !==
                      undefined &&
                    experience !== ""
                      ? Number(
                          experience
                        )
                      : 0,

                  consultationFee:
                    consultationFee !==
                      undefined &&
                    consultationFee !== ""
                      ? Number(
                          consultationFee
                        )
                      : 0,

                  department:
                    departmentId,

                  availableDays:
                    normalizedAvailableDays,

                },
              ],
              { session }
            );

          if (
            normalizedAvailability.length >
            0
          ) {
            const documents =
              normalizedAvailability.map(
                (item) => ({
                  doctor:
                    createdDoctor._id,

                  dayOfWeek:
                    item.dayOfWeek,

                  startTime:
                    item.startTime,

                  endTime:
                    item.endTime,

                  slotDuration:
                    item.slotDuration,

                  isActive:
                    item.isActive,
                })
              );

            await DoctorAvailability.insertMany(
              documents,
              { session }
            );
          }
        }
      );
    } catch (txError) {
      const message =
        txError?.message ||
        String(txError);

      /*
       * MongoDB transaction fallback
       */

      if (
        message.includes(
          "Transaction numbers are only allowed"
        ) ||
        message.includes(
          "retryable writes"
        ) ||
        txError?.code === 20
      ) {
        console.warn(
          "MongoDB transactions not supported. Using fallback."
        );

        const user =
          await User.create({
            name: name.trim(),
            email:
              normalizedEmail,
            password:
              hashedPassword,
            role: "doctor",
          });

        try {
          createdDoctor =
            await Doctor.create({
              user: user._id,

              specialization:
                specialization.trim(),

              qualification:
                qualification.trim(),

              experience:
                experience !==
                  undefined &&
                experience !== ""
                  ? Number(
                      experience
                    )
                  : 0,

              consultationFee:
                consultationFee !==
                  undefined &&
                consultationFee !== ""
                  ? Number(
                      consultationFee
                    )
                  : 0,

              department:
                departmentId,

              availableDays:
                normalizedAvailableDays,

            });

          if (
            normalizedAvailability.length >
            0
          ) {
            const documents =
              normalizedAvailability.map(
                (item) => ({
                  doctor:
                    createdDoctor._id,

                  dayOfWeek:
                    item.dayOfWeek,

                  startTime:
                    item.startTime,

                  endTime:
                    item.endTime,

                  slotDuration:
                    item.slotDuration,

                  isActive:
                    item.isActive,
                })
              );

            await DoctorAvailability.insertMany(
              documents
            );
          }
        } catch (creationError) {
          if (
            createdDoctor?._id
          ) {
            await Doctor.deleteOne({
              _id:
                createdDoctor._id,
            });
          }

          await User.deleteOne({
            _id: user._id,
          });

          throw creationError;
        }
      } else {
        throw txError;
      }
    }

    const doctor =
      await Doctor.findById(
        createdDoctor._id
      )
        .populate(
          "user",
          "name email role"
        )
        .populate(
          "department",
          "name"
        )
        .lean();

    const doctorAvailability =
      await DoctorAvailability.find(
        {
          doctor:
            createdDoctor._id,
          isActive: true,
        }
      )
        .sort({
          dayOfWeek: 1,
          startTime: 1,
        })
        .lean();

    return res.status(201).json({
      success: true,

      message:
        "Doctor created successfully",

      doctor,

      availability:
        doctorAvailability,
    });
  } catch (error) {
    console.error(
      "Create doctor error:",
      error
    );

    if (
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Doctor or user with these details already exists",
      });
    }

    return res.status(500).json({
      success: false,

      message: "Server error while creating doctor",
    });
  } finally {
    await session.endSession();
  }
};

/*
 * =====================================================
 * ADMIN DASHBOARD
 * =====================================================
 */

const getAdminDashboard =
  async (req, res) => {
    try {
      const { start: startOfDay, end: endOfDay } =
        getHospitalDayRange();

      /*
       * =================================================
       * BASIC COUNTS
       * =================================================
       */

      const [
        totalPatients,
        totalDoctors,
        todayAppointments,
        activeQueueDoctors,
      ] = await Promise.all([
        Patient.countDocuments(),

        Doctor.countDocuments(),

        Appointment.countDocuments({
          appointmentDate: {
            $gte: startOfDay,
            $lte: endOfDay,
          },

          status: {
            $ne: "cancelled",
          },
        }),

        Appointment.distinct(
          "doctor",
          {
            appointmentDate: {
              $gte: startOfDay,
              $lte: endOfDay,
            },

            status: {
              $in: [
                "booked",
                "waiting",
                "in-progress",
              ],
            },
          }
        ),
      ]);

      /*
       * =================================================
       * ALL APPOINTMENT STATUS
       * =================================================
       */

      const appointmentStatusCounts =
        await Appointment.aggregate([
          {
            $group: {
              _id: "$status",

              count: {
                $sum: 1,
              },
            },
          },
        ]);

      const statusBreakdown = {
        booked: 0,
        waiting: 0,
        "in-progress": 0,
        completed: 0,
        cancelled: 0,
      };

      appointmentStatusCounts.forEach(
        (item) => {
          if (
            VALID_APPOINTMENT_STATUSES.includes(
              item._id
            )
          ) {
            statusBreakdown[
              item._id
            ] = item.count;
          }
        }
      );

      /*
       * =================================================
       * TODAY STATUS
       * =================================================
       */

      const todayStatusCounts =
        await Appointment.aggregate([
          {
            $match: {
              appointmentDate: {
                $gte: startOfDay,
                $lte: endOfDay,
              },
            },
          },

          {
            $group: {
              _id: "$status",

              count: {
                $sum: 1,
              },
            },
          },
        ]);

      const todayStatusBreakdown = {
        booked: 0,
        waiting: 0,
        "in-progress": 0,
        completed: 0,
        cancelled: 0,
      };

      todayStatusCounts.forEach(
        (item) => {
          if (
            VALID_APPOINTMENT_STATUSES.includes(
              item._id
            )
          ) {
            todayStatusBreakdown[
              item._id
            ] = item.count;
          }
        }
      );

      /*
       * =================================================
       * RECENT APPOINTMENTS
       * =================================================
       */

      const recentAppointments =
        await Appointment.find()
          .populate({
            path: "patient",

            populate: {
              path: "user",

              select:
                "name email profileImage",
            },
          })
          .populate({
            path: "doctor",

            populate: {
              path: "user",

              select:
                "name email profileImage",
            },
          })
          .sort({
            appointmentDate: -1,
          })
          .limit(8)
          .lean();

      /*
       * =================================================
       * DEPARTMENT STATISTICS
       * =================================================
       *
       * Supports:
       *
       * department = ObjectId
       *
       * department = ObjectId string
       *
       * department = "Cardiology"
       *
       * No unsafe $in with names.
       * =================================================
       */

      let departmentStats = [];

      try {
        const doctors =
          await Doctor.find()
            .select(
              "department specialization"
            )
            .lean();

        const departmentMap =
          new Map();

        const departmentIds =
          [];

        /*
         * First pass
         */

        for (const doctor of doctors) {
          const raw =
            doctor.department;

          if (
            raw &&
            typeof raw ===
              "object" &&
            raw.name
          ) {
            const name =
              String(
                raw.name
              ).trim();

            const key =
              name.toLowerCase();

            const current =
              departmentMap.get(
                key
              ) || {
                department:
                  name,

                doctorCount: 0,
              };

            current.doctorCount +=
              1;

            departmentMap.set(
              key,
              current
            );

            continue;
          }

          if (
            typeof raw ===
            "string"
          ) {
            const value =
              raw.trim();

            if (!value) {
              continue;
            }

            if (
              mongoose.Types.ObjectId.isValid(
                value
              )
            ) {
              departmentIds.push(
                value
              );

              continue;
            }

            const key =
              value.toLowerCase();

            const current =
              departmentMap.get(
                key
              ) || {
                department:
                  value,

                doctorCount: 0,
              };

            current.doctorCount +=
              1;

            departmentMap.set(
              key,
              current
            );

            continue;
          }

          if (
            raw &&
            mongoose.Types.ObjectId.isValid(
              raw
            )
          ) {
            departmentIds.push(
              String(raw)
            );
          }
        }

        /*
         * Resolve ObjectIds only.
         */

        const uniqueDepartmentIds =
          [
            ...new Set(
              departmentIds
            ),
          ];

        if (
          uniqueDepartmentIds.length >
          0
        ) {
          const departments =
            await Department.find({
              _id: {
                $in:
                  uniqueDepartmentIds,
              },
            })
              .select("name")
              .lean();

          const departmentNameMap =
            new Map();

          departments.forEach(
            (department) => {
              departmentNameMap.set(
                String(
                  department._id
                ),
                String(
                  department.name
                ).trim()
              );
            }
          );

          /*
           * Second pass for ObjectIds
           */

          for (const doctor of doctors) {
            const raw =
              doctor.department;

            let id = null;

            if (
              typeof raw ===
              "string" &&
              mongoose.Types.ObjectId.isValid(
                raw
              )
            ) {
              id = raw;
            } else if (
              raw &&
              mongoose.Types.ObjectId.isValid(
                raw
              )
            ) {
              id = String(raw);
            }

            if (!id) {
              continue;
            }

            const name =
              departmentNameMap.get(
                id
              ) ||
              "Unassigned";

            const key =
              name.toLowerCase();

            const current =
              departmentMap.get(
                key
              ) || {
                department:
                  name,

                doctorCount: 0,
              };

            current.doctorCount +=
              1;

            departmentMap.set(
              key,
              current
            );
          }
        }

        departmentStats =
          Array.from(
            departmentMap.values()
          ).sort(
            (a, b) =>
              b.doctorCount -
              a.doctorCount
          );
      } catch (
        departmentError
      ) {
        console.error(
          "Department statistics error:",
          departmentError
        );

        departmentStats = [];
      }

      /*
       * =================================================
       * TODAY QUEUE DATA
       * =================================================
       */

      const todayQueueData =
        await Appointment.aggregate([
          {
            $match: {
              appointmentDate: {
                $gte: startOfDay,
                $lte: endOfDay,
              },

              status: {
                $in: [
                  "booked",
                  "waiting",
                  "in-progress",
                ],
              },
            },
          },

          {
            $group: {
              _id: "$doctor",

              total: {
                $sum: 1,
              },

              waiting: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$status",
                        "waiting",
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              inProgress: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$status",
                        "in-progress",
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              booked: {
                $sum: {
                  $cond: [
                    {
                      $eq: [
                        "$status",
                        "booked",
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },

          {
            $sort: {
              total: -1,
            },
          },

          {
            $limit: 10,
          },
        ]);

      /*
       * =================================================
       * QUEUE DOCTORS
       * =================================================
       */

      const queueDoctorIds =
        todayQueueData
          .map(
            (item) =>
              item._id
          )
          .filter(Boolean);

      let queueDoctors = [];

      if (
        queueDoctorIds.length >
        0
      ) {
        queueDoctors =
          await Doctor.find({
            _id: {
              $in:
                queueDoctorIds,
            },
          })
            .populate(
              "user",
              "name email profileImage"
            )
            .lean();
      }

      const queueDoctorMap =
        new Map();

      queueDoctors.forEach(
        (doctor) => {
          queueDoctorMap.set(
            doctor._id.toString(),
            doctor
          );
        }
      );

      const queueOverview =
        todayQueueData.map(
          (queue) => {
            const doctor =
              queueDoctorMap.get(
                queue._id.toString()
              );

            let departmentName =
              "Unassigned";

            if (
              typeof doctor?.department ===
              "string"
            ) {
              departmentName =
                doctor.department.trim() ||
                "Unassigned";
            } else if (
              doctor?.department?.name
            ) {
              departmentName =
                String(
                  doctor.department
                    .name
                ).trim() ||
                "Unassigned";
            }

            return {
              doctorId:
                queue._id,

              doctorName:
                doctor?.user?.name ||
                "Doctor",

              specialization:
                doctor?.specialization ||
                null,

              department:
                departmentName,

              total:
                queue.total,

              booked:
                queue.booked,

              waiting:
                queue.waiting,

              inProgress:
                queue.inProgress,
            };
          }
        );

      /*
       * =================================================
       * RESPONSE
       * =================================================
       */

      return res.status(200).json({
        success: true,

        stats: {
          totalPatients,

          totalDoctors,

          todayAppointments,

          activeQueues:
            activeQueueDoctors.length,

          appointmentStatus:
            statusBreakdown,

          todayAppointmentStatus:
            todayStatusBreakdown,

          recentAppointments,

          departmentStats,

          queueOverview,
        },
      });
    } catch (error) {
      console.error(
        "Get admin dashboard error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Server error while loading admin dashboard",

      });
    }
  };

/*
 * =====================================================
 * ADMIN - GET ALL PATIENTS
 * =====================================================
 */

const getAdminPatients =
  async (req, res) => {
    try {
      const {
        search = "",
        gender = "",
        bloodGroup = "",
      } = req.query;
      const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.min(
        Math.max(Number.parseInt(req.query.limit, 10) || 20, 1),
        100
      );

      const patientFilter = {};

      if (gender) {
        patientFilter.gender =
          String(gender)
            .trim()
            .toLowerCase();
      }

      if (bloodGroup) {
        patientFilter.bloodGroup =
          String(
            bloodGroup
          ).trim();
      }

      const searchValue = String(search).trim();
      if (searchValue) {
        const matchingUsers = await User.find({
          $or: [
            { name: { $regex: searchValue, $options: "i" } },
            { email: { $regex: searchValue, $options: "i" } },
          ],
        }).select("_id").lean();
        patientFilter.$or = [
          { user: { $in: matchingUsers.map((user) => user._id) } },
          { phone: { $regex: searchValue, $options: "i" } },
          { address: { $regex: searchValue, $options: "i" } },
        ];
      }

      const total = await Patient.countDocuments(patientFilter);
      const patients =
        await Patient.find(patientFilter)
          .populate(
            "user",
            "name email role profileImage createdAt"
          )
          .sort({
            createdAt: -1,
          })
          .skip((page - 1) * limit)
          .limit(limit);

      const patientIds =
        patients.map(
          (patient) =>
            patient._id
        );

      const appointments =
        patientIds.length > 0
          ? await Appointment.find(
              {
                patient: {
                  $in: patientIds,
                },
              }
            )
              .populate({
                path: "doctor",

                populate: {
                  path: "user",

                  select: "name",
                },
              })
              .sort({
                appointmentDate: -1,
              })
          : [];

      const patientsWithStats =
        patients.map(
          (patient) => {
            const patientAppointments =
              appointments.filter(
                (appointment) =>
                  appointment.patient
                    ?.toString() ===
                  patient._id.toString()
              );

            const activeAppointments =
              patientAppointments.filter(
                (appointment) =>
                  [
                    "booked",
                    "waiting",
                    "in-progress",
                  ].includes(
                    appointment.status
                  )
              );

            const completedAppointments =
              patientAppointments.filter(
                (appointment) =>
                  appointment.status ===
                  "completed"
              );

            const cancelledAppointments =
              patientAppointments.filter(
                (appointment) =>
                  appointment.status ===
                  "cancelled"
              );

            const latestAppointment =
              patientAppointments[0] ||
              null;

            return {
              ...patient.toObject(),

              appointmentCount:
                patientAppointments.length,

              activeAppointmentCount:
                activeAppointments.length,

              completedAppointmentCount:
                completedAppointments.length,

              cancelledAppointmentCount:
                cancelledAppointments.length,

              latestAppointment,
            };
          }
        );

      return res.status(200).json({
        success: true,

        count:
          patientsWithStats.length,

        patients:
          patientsWithStats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrevious: page > 1,
        },
      });
    } catch (error) {
      console.error(
        "Get admin patients error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Server error while fetching patients",
      });
    }
  };

/*
 * =====================================================
 * ADMIN - GET ALL APPOINTMENTS
 * =====================================================
 */

const getAdminAppointments =
  async (req, res) => {
    try {
      const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.min(
        Math.max(Number.parseInt(req.query.limit, 10) || 20, 1),
        100
      );
      const filter = {};
      const searchValue = String(req.query.search || "").trim();
      if (searchValue) {
        const matchingUsers = await User.find({
          $or: [
            { name: { $regex: searchValue, $options: "i" } },
            { email: { $regex: searchValue, $options: "i" } },
          ],
        }).select("_id").lean();
        const [patientIds, doctorIds] = await Promise.all([
          Patient.find({ user: { $in: matchingUsers.map((user) => user._id) } }).distinct("_id"),
          Doctor.find({ user: { $in: matchingUsers.map((user) => user._id) } }).distinct("_id"),
        ]);
        filter.$or = [
          { patient: { $in: patientIds } },
          { doctor: { $in: doctorIds } },
          { reason: { $regex: searchValue, $options: "i" } },
        ];
      }
      if (req.query.status) filter.status = String(req.query.status);
      if (req.query.doctor && mongoose.Types.ObjectId.isValid(req.query.doctor)) {
        filter.doctor = req.query.doctor;
      }
      if (req.query.patient && mongoose.Types.ObjectId.isValid(req.query.patient)) {
        filter.patient = req.query.patient;
      }
      if (req.query.dateFrom || req.query.dateTo) {
        filter.appointmentDate = {};
        if (req.query.dateFrom) {
          const dateFrom = new Date(req.query.dateFrom);
          if (Number.isNaN(dateFrom.getTime())) {
            return res.status(400).json({
              success: false,
              message: "Invalid dateFrom value",
            });
          }
          filter.appointmentDate.$gte = dateFrom;
        }
        if (req.query.dateTo) {
          const dateTo = new Date(req.query.dateTo);
          if (Number.isNaN(dateTo.getTime())) {
            return res.status(400).json({
              success: false,
              message: "Invalid dateTo value",
            });
          }
          filter.appointmentDate.$lte = dateTo;
        }
      }
      const total = await Appointment.countDocuments(filter);
      const appointments =
        await Appointment.find(filter)
          .populate({
            path: "patient",

            populate: {
              path: "user",

              select:
                "name email profileImage",
            },
          })
          .populate({
            path: "doctor",

            populate: {
              path: "user",

              select:
                "name email profileImage",
            },
          })
          .sort({
            appointmentDate: -1,
          })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean();

      /*
       * Resolve department safely
       */

      const doctorIds =
        appointments
          .map(
            (appointment) =>
              appointment.doctor
                ?._id
          )
          .filter(Boolean);

      const doctors =
        doctorIds.length > 0
          ? await Doctor.find({
              _id: {
                $in: doctorIds,
              },
            })
              .select(
                "_id department"
              )
              .lean()
          : [];

      const doctorMap =
        new Map(
          doctors.map(
            (doctor) => [
              String(
                doctor._id
              ),
              doctor,
            ]
          )
        );

      const objectIds = [];

      doctors.forEach(
        (doctor) => {
          const value =
            doctor.department;

          if (
            value &&
            mongoose.Types.ObjectId.isValid(
              value
            )
          ) {
            objectIds.push(
              String(value)
            );
          }
        }
      );

      const departments =
        objectIds.length > 0
          ? await Department.find({
              _id: {
                $in: [
                  ...new Set(
                    objectIds
                  ),
                ],
              },
            })
              .select("name")
              .lean()
          : [];

      const departmentMap =
        new Map(
          departments.map(
            (department) => [
              String(
                department._id
              ),
              department.name,
            ]
          )
        );

      const safeAppointments =
        appointments.map(
          (appointment) => {
            const doctor =
              appointment.doctor;

            if (!doctor) {
              return appointment;
            }

            const dbDoctor =
              doctorMap.get(
                String(doctor._id)
              );

            let department =
              "Unassigned";

            if (
              typeof dbDoctor?.department ===
              "string"
            ) {
              const value =
                dbDoctor.department.trim();

              if (
                value &&
                mongoose.Types.ObjectId.isValid(
                  value
                )
              ) {
                department =
                  departmentMap.get(
                    value
                  ) ||
                  "Unassigned";
              } else if (value) {
                department =
                  value;
              }
            } else if (
              dbDoctor?.department
            ) {
              department =
                departmentMap.get(
                  String(
                    dbDoctor.department
                  )
                ) ||
                "Unassigned";
            }

            return {
              ...appointment,

              doctor: {
                ...doctor,

                department,
              },
            };
          }
        );

      return res.status(200).json({
        success: true,

        count:
          safeAppointments.length,

        appointments:
          safeAppointments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrevious: page > 1,
        },
      });
    } catch (error) {
      console.error(
        "Get admin appointments error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Server error while fetching appointments",
      });
    }
  };

/*
 * =====================================================
 * TEST EMAIL
 * =====================================================
 */

const testEmail = async (
  req,
  res
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,

        message:
          "Email is required",
      });
    }

    await sendEmail({
      to: email,

      subject:
        "Smart Hospital Email Test",

      html: `
        <div
          style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: auto;
            padding: 24px;
          "
        >
          <h2>
            Smart Hospital
          </h2>

          <p>
            This is a real email delivery test.
          </p>

          <p>
            Your SMTP configuration is working correctly.
          </p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,

      message:
        "Test email sent successfully",
    });
  } catch (error) {
    console.error(
      "Test email error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to send test email",
    });
  }
};

const updateDoctorLifecycle = async (req, res) => {
  const { doctorId } = req.params;
  const { lifecycleStatus } = req.body;
  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    return res.status(400).json({ success: false, message: "Invalid doctor ID" });
  }
  if (!["active", "inactive", "suspended"].includes(lifecycleStatus)) {
    return res.status(400).json({ success: false, message: "Invalid lifecycle status" });
  }
  const existingDoctor = await Doctor.findById(doctorId).select("lifecycleStatus");
  if (!existingDoctor) {
    return res.status(404).json({ success: false, message: "Doctor not found" });
  }
  const previousStatus = existingDoctor.lifecycleStatus;
  const doctor = await Doctor.findByIdAndUpdate(
    doctorId,
    { lifecycleStatus },
    { new: true, runValidators: true }
  );
  if (lifecycleStatus === "suspended") {
    const doctorUser = await Doctor.findById(doctor._id).select("user");
    await Session.updateMany(
      { user: doctorUser.user, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );
  }
  const { recordAudit } = require("../services/audit.service");
  try {
    await recordAudit({
      req,
      action: "doctor_lifecycle_changed",
      resourceType: "Doctor",
      resourceId: doctor._id,
      metadata: { lifecycleStatus },
    });
  } catch (error) {
    await Doctor.updateOne(
      { _id: doctor._id, lifecycleStatus },
      { $set: { lifecycleStatus: previousStatus } }
    );
    throw error;
  }
  return res.json({ success: true, doctor });
};

/*
 * =====================================================
 * EXPORTS
 * =====================================================
 */

module.exports = {
  createDoctor,
  getAdminDashboard,
  getAdminPatients,
  getAdminAppointments,
  testEmail,
  updateDoctorLifecycle,
};