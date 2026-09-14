const mongoose = require("mongoose");

const Doctor = require("../models/Doctor");
const DoctorAvailability = require("../models/DoctorAvailability");
const Appointment = require("../models/Appointment");

const {
  getHospitalDateParts,
} = require("../utils/dateTime");

const VALID_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

/*
 * =====================================================
 * TIME HELPERS
 * =====================================================
 */

const timeToMinutes = (time) => {
  const [hours, minutes] = String(time)
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    mins
  ).padStart(2, "0")}`;
};

/*
 * =====================================================
 * CREATE AVAILABILITY
 * =====================================================
 */

const createAvailability = async (req, res) => {
  try {
    const {
      dayOfWeek,
      startTime,
      endTime,
      slotDuration,
    } = req.body;

    if (
      !dayOfWeek ||
      !startTime ||
      !endTime ||
      slotDuration === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Day, start time, end time and slot duration are required",
      });
    }

    const doctor = await Doctor.findOne({
      user: req.user.userId,
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    if (doctor.lifecycleStatus !== "active") {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const normalizedDay = String(dayOfWeek)
      .trim()
      .toLowerCase();

    const normalizedStart = String(startTime).trim();
    const normalizedEnd = String(endTime).trim();

    const duration = Number(slotDuration);

    if (!VALID_DAYS.includes(normalizedDay)) {
      return res.status(400).json({
        success: false,
        message: "Invalid day of week",
      });
    }

    const timeRegex =
      /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (
      !timeRegex.test(normalizedStart) ||
      !timeRegex.test(normalizedEnd)
    ) {
      return res.status(400).json({
        success: false,
        message: "Time must use HH:MM format",
      });
    }

    const startMinutes =
      timeToMinutes(normalizedStart);

    const endMinutes =
      timeToMinutes(normalizedEnd);

    if (endMinutes <= startMinutes) {
      return res.status(400).json({
        success: false,
        message:
          "End time must be after start time",
      });
    }

    if (
      !Number.isInteger(duration) ||
      duration < 5 ||
      duration > 120
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Slot duration must be between 5 and 120 minutes",
      });
    }

    if (
      duration >
      endMinutes - startMinutes
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Slot duration cannot exceed the availability period",
      });
    }

    /*
     * ---------------------------------------------------
     * CHECK OVERLAPPING ACTIVE SCHEDULES
     * ---------------------------------------------------
     */

    const existing =
      await DoctorAvailability.find({
        doctor: doctor._id,
        dayOfWeek: normalizedDay,
        isActive: true,
      });

    const hasOverlap = existing.some((item) => {
      const existingStart =
        timeToMinutes(item.startTime);

      const existingEnd =
        timeToMinutes(item.endTime);

      return (
        startMinutes < existingEnd &&
        endMinutes > existingStart
      );
    });

    if (hasOverlap) {
      return res.status(409).json({
        success: false,
        message:
          "This availability period overlaps with an existing schedule",
      });
    }

    /*
     * ---------------------------------------------------
     * CREATE AVAILABILITY
     * ---------------------------------------------------
     */

    const availability =
      await DoctorAvailability.create({
        doctor: doctor._id,
        dayOfWeek: normalizedDay,
        startTime: normalizedStart,
        endTime: normalizedEnd,
        slotDuration: duration,
        isActive: true,
      });

    return res.status(201).json({
      success: true,
      message:
        "Doctor availability created successfully",
      availability,
    });
  } catch (error) {
    console.error(
      "Create doctor availability error:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "This availability schedule already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Server error while creating doctor availability",
    });
  }
};

/*
 * =====================================================
 * GET MY AVAILABILITY
 * =====================================================
 */

const getMyAvailability = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({
      user: req.user.userId,
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    const availability =
      await DoctorAvailability.find({
        doctor: doctor._id,
      }).sort({
        dayOfWeek: 1,
        startTime: 1,
      });

    return res.status(200).json({
      success: true,
      count: availability.length,
      availability,
    });
  } catch (error) {
    console.error(
      "Get doctor availability error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching doctor availability",
    });
  }
};

/*
 * =====================================================
 * GET DOCTOR AVAILABILITY FOR PATIENT
 *
 * GET /:doctorId
 *
 * Returns:
 * - Doctor availability
 * - Generated slots
 * - Already booked slots
 * =====================================================
 */

const getDoctorAvailabilityForPatient =
  async (req, res) => {
    try {
      const { doctorId } = req.params;

      /*
       * ---------------------------------------------------
       * VALIDATE DOCTOR ID
       * ---------------------------------------------------
       */

      if (
        !mongoose.Types.ObjectId.isValid(
          doctorId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid doctor ID",
        });
      }

      /*
       * ---------------------------------------------------
       * CHECK DOCTOR EXISTS
       * ---------------------------------------------------
       */

      const doctor =
        await Doctor.findById(doctorId);

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      if (doctor.lifecycleStatus !== "active") {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      /*
       * ---------------------------------------------------
       * GET ACTIVE AVAILABILITY
       * ---------------------------------------------------
       */

      const availability =
        await DoctorAvailability.find({
          doctor: doctor._id,
          isActive: true,
        }).sort({
          dayOfWeek: 1,
          startTime: 1,
        });

      /*
       * ---------------------------------------------------
       * GENERATE CONFIGURED SLOTS
       * ---------------------------------------------------
       */

      const slots = [];

      availability.forEach((schedule) => {
        const start =
          timeToMinutes(
            schedule.startTime
          );

        const end =
          timeToMinutes(
            schedule.endTime
          );

        const duration =
          Number(
            schedule.slotDuration
          );

        if (
          !Number.isFinite(start) ||
          !Number.isFinite(end) ||
          !Number.isFinite(duration) ||
          duration <= 0 ||
          end <= start
        ) {
          return;
        }

        for (
          let current = start;
          current + duration <= end;
          current += duration
        ) {
          slots.push({
            dayOfWeek:
              schedule.dayOfWeek,

            startTime:
              minutesToTime(current),

            endTime:
              minutesToTime(
                current + duration
              ),

            slotDuration:
              duration,
          });
        }
      });

      /*
       * =================================================
       * GET BOOKED APPOINTMENTS
       * =================================================
       */

      const bookedAppointments =
        await Appointment.find({
          doctor: doctor._id,

          status: {
            $in: [
              "booked",
              "waiting",
              "in-progress",
            ],
          },
        })
          .select(
            "appointmentDate tokenNumber status"
          )
          .sort({
            appointmentDate: 1,
          })
          .lean();

      /*
       * =================================================
       * CONVERT BOOKED APPOINTMENTS
       *
       * IMPORTANT:
       *
       * appointmentDate is stored as an absolute
       * MongoDB Date.
       *
       * Never use:
       *
       * date.getFullYear()
       * date.getMonth()
       * date.getDate()
       * date.getHours()
       * date.getMinutes()
       *
       * because those use the SERVER timezone.
       *
       * Hospital timezone is Asia/Kolkata.
       * =================================================
       */

      const bookedSlots =
        bookedAppointments.map(
          (appointment) => {
            const parts =
              getHospitalDateParts(
                appointment.appointmentDate
              );

            const date =
              `${parts.year}-${String(
                parts.month
              ).padStart(2, "0")}-${String(
                parts.day
              ).padStart(2, "0")}`;

            const time =
              `${String(
                parts.hour
              ).padStart(2, "0")}:${String(
                parts.minute
              ).padStart(2, "0")}`;

            return {
              date,

              time,

              appointmentDate:
                appointment.appointmentDate,

              tokenNumber:
                appointment.tokenNumber,

              status:
                appointment.status,
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

        doctorId: doctor._id,

        availability,

        slots,

        bookedSlots,

        count: availability.length,
      });
    } catch (error) {
      console.error(
        "Get patient doctor availability error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while fetching doctor availability",
      });
    }
  };

/*
 * =====================================================
 * DELETE AVAILABILITY
 * =====================================================
 */

const deleteAvailability = async (
  req,
  res
) => {
  try {
    const {
      availabilityId,
    } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        availabilityId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid availability ID",
      });
    }

    const doctor =
      await Doctor.findOne({
        user: req.user.userId,
      });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message:
          "Doctor profile not found",
      });
    }

    const availability =
      await DoctorAvailability.findOne({
        _id: availabilityId,
        doctor: doctor._id,
      });

    if (!availability) {
      return res.status(404).json({
        success: false,
        message:
          "Availability schedule not found",
      });
    }

    await DoctorAvailability.deleteOne({
      _id: availability._id,
    });

    return res.status(200).json({
      success: true,
      message:
        "Availability schedule deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete doctor availability error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while deleting doctor availability",
    });
  }
};

module.exports = {
  createAvailability,
  getMyAvailability,
  getDoctorAvailabilityForPatient,
  deleteAvailability,
};