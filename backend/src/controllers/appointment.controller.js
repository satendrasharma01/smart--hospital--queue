const Appointment = require("../models/Appointment");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const User = require("../models/User");
const QueueCounter = require("../models/QueueCounter");
const DoctorAvailability = require("../models/DoctorAvailability");
const QueueEntry = require("../models/QueueEntry");

const { getSocketIO } = require("../utils/socket");
const { recordAudit } = require("../services/audit.service");

const {
  sendAppointmentConfirmationEmail,
  sendNewAppointmentDoctorEmail,
  sendEmail,
  sendAppointmentCompletedEmail,
} = require("../services/email.service");

/*
 * =====================================================
 * HOSPITAL TIMEZONE
 * =====================================================
 */

const HOSPITAL_TIMEZONE = "Asia/Kolkata";

/*
 * =====================================================
 * DATE HELPERS
 * =====================================================
 */

/*
 * Returns date/time parts according to hospital timezone.
 *
 * Example:
 *
 * 2026-08-24T09:00:00+05:30
 *
 * becomes:
 *
 * {
 *   year: 2026,
 *   month: 8,
 *   day: 24,
 *   hour: 9,
 *   minute: 0,
 *   second: 0
 * }
 */

const getHospitalDateParts = (date) => {
  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: HOSPITAL_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }
  ).formatToParts(new Date(date));

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
};

/*
 * Returns hospital calendar date.
 *
 * Example:
 *
 * 2026-08-24
 */

const getHospitalDateKey = (date) => {
  const parts = getHospitalDateParts(date);

  return [
    parts.year,
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
};

/*
 * Returns weekday according to hospital timezone.
 */

const getHospitalDayName = (date) => {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: HOSPITAL_TIMEZONE,
      weekday: "long",
    }
  )
    .format(new Date(date))
    .toLowerCase();
};

/*
 * Returns the UTC range representing one
 * hospital calendar day.
 *
 * Example:
 *
 * 24 Aug 2026 00:00 IST
 * →
 * 23 Aug 2026 18:30 UTC
 */

const getHospitalDayRange = (date) => {
  const parts = getHospitalDateParts(date);

  const start = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day
    ) -
      5.5 * 60 * 60 * 1000
  );

  const end = new Date(
    start.getTime() +
      24 * 60 * 60 * 1000 -
      1
  );

  return {
    start,
    end,
  };
};

/*
 * =====================================================
 * TIME HELPERS
 * =====================================================
 */

const timeToMinutes = (time) => {
  const [hours, minutes] = String(time)
    .split(":")
    .map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
};

const dateToHospitalMinutes = (date) => {
  const parts = getHospitalDateParts(date);

  return (
    parts.hour * 60 +
    parts.minute
  );
};

/*
 * =====================================================
 * DISPLAY DATE HELPER
 * =====================================================
 */

const formatHospitalDate = (date) => {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      timeZone: HOSPITAL_TIMEZONE,
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(new Date(date));
};

/*
 * =====================================================
 * CREATE APPOINTMENT
 * =====================================================
 */

const createAppointment = async (
  req,
  res
) => {
  try {
    const {
      doctorId,
      appointmentDate,
      reason,
    } = req.body;

    /*
     * ---------------------------------------------------
     * BASIC VALIDATION
     * ---------------------------------------------------
     */

    if (
      !doctorId ||
      !appointmentDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Doctor and appointment date are required",
      });
    }

    /*
     * ---------------------------------------------------
     * FIND PATIENT
     * ---------------------------------------------------
     */

    const patient =
      await Patient.findOne({
        user: req.user.userId,
      });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message:
          "Patient profile not found",
      });
    }

    /*
     * ---------------------------------------------------
     * FIND DOCTOR
     * ---------------------------------------------------
     */

    const doctor =
      await Doctor.findById(
        doctorId
      );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    if (
      doctor.lifecycleStatus &&
      doctor.lifecycleStatus !== "active"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This doctor is not accepting new appointments",
      });
    }

    /*
     * ---------------------------------------------------
     * VALIDATE APPOINTMENT DATE
     * ---------------------------------------------------
     */

    const date = new Date(
      appointmentDate
    );

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid appointment date",
      });
    }

    /*
     * Appointment is an absolute instant.
     * Comparing Date objects is timezone-safe.
     */

    if (date <= new Date()) {
      return res.status(400).json({
        success: false,
        message:
          "Appointment date and time must be in the future",
      });
    }

    /*
     * ---------------------------------------------------
     * HOSPITAL DATE INFORMATION
     * ---------------------------------------------------
     */

    const dayName =
      getHospitalDayName(date);

    const appointmentMinutes =
      dateToHospitalMinutes(date);

    /*
     * ---------------------------------------------------
     * DOCTOR AVAILABILITY
     * ---------------------------------------------------
     */

    const availability =
      await DoctorAvailability.find({
        doctor: doctor._id,
        dayOfWeek: dayName,
        isActive: true,
      }).sort({
        startTime: 1,
      });

    if (availability.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          `Doctor is not available on ${dayName}. Please select another day.`,
      });
    }

    /*
     * ---------------------------------------------------
     * FIND MATCHING AVAILABILITY
     * ---------------------------------------------------
     */

    const matchingSchedule =
      availability.find(
        (schedule) => {
          const startMinutes =
            timeToMinutes(
              schedule.startTime
            );

          const endMinutes =
            timeToMinutes(
              schedule.endTime
            );

          if (
            startMinutes === null ||
            endMinutes === null
          ) {
            return false;
          }

          return (
            appointmentMinutes >=
              startMinutes &&
            appointmentMinutes <
              endMinutes
          );
        }
      );

    if (!matchingSchedule) {
      return res.status(400).json({
        success: false,
        message:
          "Selected time is outside the doctor's available hours.",
      });
    }

    /*
     * ---------------------------------------------------
     * VALIDATE SLOT DURATION
     * ---------------------------------------------------
     */

    const scheduleStart =
      timeToMinutes(
        matchingSchedule.startTime
      );

    const scheduleEnd =
      timeToMinutes(
        matchingSchedule.endTime
      );

    const slotDuration =
      Number(
        matchingSchedule.slotDuration
      );

    if (
      scheduleStart === null ||
      scheduleEnd === null ||
      !Number.isFinite(
        slotDuration
      ) ||
      slotDuration <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Doctor availability configuration is invalid.",
      });
    }

    const minutesFromStart =
      appointmentMinutes -
      scheduleStart;

    /*
     * Appointment must exactly match
     * configured slot interval.
     *
     * Example:
     *
     * 09:00
     * 09:10
     * 09:20
     */

    if (
      minutesFromStart %
        slotDuration !==
      0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selected time is not a valid appointment slot.",
      });
    }

    const slotEnd =
      appointmentMinutes +
      slotDuration;

    if (
      slotEnd > scheduleEnd
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selected appointment slot exceeds the doctor's available hours.",
      });
    }

    /*
     * ---------------------------------------------------
     * HOSPITAL CALENDAR DAY
     * ---------------------------------------------------
     */

    const {
      start: startOfDay,
      end: endOfDay,
    } = getHospitalDayRange(date);

    /*
     * IMPORTANT:
     *
     * QueueCounter now uses:
     *
     * YYYY-MM-DD
     *
     * instead of a Date.
     *
     * This prevents timezone-related counter
     * duplication.
     */

    const queueDate =
      getHospitalDateKey(date);

    /*
     * ---------------------------------------------------
     * PREVENT DUPLICATE PATIENT APPOINTMENT
     * ---------------------------------------------------
     *
     * Same patient + same doctor + same
     * hospital calendar day.
     *
     * Different dates are allowed.
     */

    const existingPatientAppointment =
      await Appointment.findOne({
        patient: patient._id,

        doctor: doctor._id,

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
      });

    if (
      existingPatientAppointment
    ) {
      return res.status(409).json({
        success: false,
        message:
          "You already have an active appointment with this doctor today.",
      });
    }

    /*
     * ---------------------------------------------------
     * EXACT SLOT DOUBLE BOOKING
     * ---------------------------------------------------
     */

    const existingDoctorSlot =
      await Appointment.findOne({
        doctor: doctor._id,

        appointmentDate: date,

        status: {
          $in: [
            "booked",
            "waiting",
            "in-progress",
          ],
        },
      });

    if (existingDoctorSlot) {
      return res.status(409).json({
        success: false,
        message:
          "This appointment slot is already booked. Please choose another time.",
      });
    }

    /*
     * ---------------------------------------------------
     * ATOMIC QUEUE TOKEN
     * ---------------------------------------------------
     *
     * Reuse the lowest cancelled token first.
     * If no recycled token is available, atomically
     * increment the counter.
     */

    let tokenNumber;

    for (
      let attempt = 0;
      attempt < 3 && !tokenNumber;
      attempt += 1
    ) {
      const counter =
        await QueueCounter.findOne({
          doctor: doctor._id,
          queueDate,
        }).lean();

      const available =
        Array.isArray(counter?.availableTokens)
          ? [...counter.availableTokens].sort(
              (a, b) => a - b
            )
          : [];

      for (const candidate of available) {
        const claimed =
          await QueueCounter.findOneAndUpdate(
            {
              doctor: doctor._id,
              queueDate,
              availableTokens: candidate,
            },
            {
              $pull: {
                availableTokens: candidate,
              },
            },
            {
              returnDocument: "after",
            }
          );

        if (claimed) {
          tokenNumber = candidate;
          break;
        }
      }
    }

    if (!tokenNumber) {
      let queueCounter;

      try {
        queueCounter =
          await QueueCounter.findOneAndUpdate(
            {
              doctor: doctor._id,
              queueDate,
            },
            {
              $inc: {
                lastToken: 1,
              },
              $setOnInsert: {
                doctor: doctor._id,
                queueDate,
              },
            },
            {
              upsert: true,
              returnDocument: "after",
              setDefaultsOnInsert: true,
            }
          );
      } catch (counterError) {
        if (
          counterError.code === 11000
        ) {
          queueCounter =
            await QueueCounter.findOneAndUpdate(
              {
                doctor: doctor._id,
                queueDate,
              },
              {
                $inc: {
                  lastToken: 1,
                },
              },
              {
                returnDocument: "after",
              }
            );
        } else {
          throw counterError;
        }
      }

      if (!queueCounter) {
        return res.status(500).json({
          success: false,
          message:
            "Unable to generate queue token",
        });
      }

      tokenNumber =
        queueCounter.lastToken;
    }

    /*
     * ---------------------------------------------------
     * CREATE APPOINTMENT
     * ---------------------------------------------------
     *
     * Appointment model still keeps tokenDate
     * as a Date for backward compatibility.
     *
     * It represents hospital midnight.
     */

    let appointment;

    try {
      appointment =
        await Appointment.create({
          patient: patient._id,

          doctor: doctor._id,

          appointmentDate: date,

          tokenDate: startOfDay,

          tokenNumber,

          reason:
            typeof reason ===
            "string"
              ? reason.trim()
              : undefined,

          status: "booked",
        });

      try {
        await QueueEntry.create({
          doctor: doctor._id,
          queueDate,
          appointment:
            appointment._id,
          tokenNumber,
          status:
            appointment.status,
        });
      } catch (queueError) {
        await Appointment.deleteOne({
          _id: appointment._id,
        });

        throw queueError;
      }
    } catch (error) {
      /*
       * The token was removed from QueueCounter before the
       * appointment/QueueEntry pair was persisted. If creation
       * fails, the token must never be lost -- regardless of
       * whether it came from the recycle pool or from lastToken.
       *
       * Check for an active appointment first so a late/ambiguous
       * database error cannot put a token back into the pool while
       * an active appointment is actually using it.
       */
      let tokenIsInUse = false;

      if (tokenNumber) {
        tokenIsInUse = Boolean(
          await Appointment.exists({
            doctor: doctor._id,
            tokenDate: startOfDay,
            tokenNumber,
            status: {
              $in: [
                "booked",
                "waiting",
                "in-progress",
              ],
            },
          })
        );
      }

      if (tokenNumber && !tokenIsInUse) {
        await QueueCounter.findOneAndUpdate(
          {
            doctor: doctor._id,
            queueDate,
          },
          {
            $addToSet: {
              availableTokens: tokenNumber,
            },
          },
          {
            upsert: true,
            setDefaultsOnInsert: true,
          }
        );
      }

      /*
       * MongoDB unique index protection.
       */

      if (
        error.code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            error.keyPattern?.patient
              ? "You already have an active appointment with this doctor today."
              : "This appointment slot was just booked by another patient. Please select another slot.",
        });
      }

      throw error;
    }

    await recordAudit({
      req,
      action:
        "appointment_created",
      resourceType:
        "Appointment",
      resourceId:
        appointment._id,
      targetId:
        patient._id,
      metadata: {
        doctorId:
          doctor._id,
        tokenDate:
          queueDate,
      },
    });

    /*
     * ---------------------------------------------------
     * LIVE QUEUE UPDATE
     * ---------------------------------------------------
     */

    const io = getSocketIO();

    if (io) {
      io.to(
        `queue:${doctor._id}`
      ).emit(
        "queueUpdated",
        {
          type:
            "appointment-booked",

          message:
            "New appointment added to the queue",

          appointmentId:
            appointment._id,

          tokenNumber:
            appointment.tokenNumber,

          appointmentDate:
            appointment.appointmentDate,
        }
      );
    }

    /*
     * ---------------------------------------------------
     * CONFIRMATION EMAIL
     * ---------------------------------------------------
     */

    let patientUser = null;
    let doctorWithUser = null;

    try {
      patientUser =
        await User.findById(
          req.user.userId
        ).select(
          "name email"
        );

      doctorWithUser =
        await Doctor.findById(
          doctor._id
        )
          .populate(
            "user",
            "name email"
          )
          .populate(
            "department",
            "name"
          );
    } catch (lookupError) {
      console.error(
        "Appointment email recipient lookup failed:",
        lookupError.message
      );
    }

    // Patient confirmation is independent from the doctor notification.
    try {
      if (patientUser?.email) {
        void sendAppointmentConfirmationEmail({
          patientName:
            patientUser.name ||
            "Patient",
          patientEmail:
            patientUser.email,
          doctorName:
            doctorWithUser?.user?.name ||
            "Doctor",
          departmentName:
            doctorWithUser?.department?.name ||
            "",
          appointmentDate:
            appointment.appointmentDate,
          tokenNumber:
            appointment.tokenNumber,
        })
          .then(() => {
            console.log(
              `Appointment confirmation email sent to ${patientUser.email}`
            );
          })
          .catch((emailError) => {
            console.error(
              "Appointment confirmation email failed:",
              emailError.message
            );
          });
      } else {
        console.warn(
          "Appointment confirmation email skipped: patient email not found"
        );
      }
    } catch (emailError) {
      console.error(
        "Appointment confirmation email failed:",
        emailError.message
      );
    }

    // Doctor notification is also best-effort and must never roll back the appointment.
    try {
      const doctorEmail =
        doctorWithUser?.user?.email;

      if (doctorEmail) {
        void sendNewAppointmentDoctorEmail({
          doctorName:
            doctorWithUser?.user?.name ||
            "Doctor",
          doctorEmail,
          patientName:
            patientUser?.name ||
            "Patient",
          appointmentDate:
            appointment.appointmentDate,
          tokenNumber:
            appointment.tokenNumber,
        })
          .then(() => {
            console.log(
              `New appointment notification sent to doctor ${doctorEmail}`
            );
          })
          .catch((emailError) => {
            console.error(
              "Doctor appointment email failed:",
              emailError.message
            );
          });
      } else {
        console.warn(
          "Doctor appointment email skipped: doctor email not found"
        );
      }
    } catch (emailError) {
      console.error(
        "Doctor appointment email failed:",
        emailError.message
      );
    }

    /*
     * ---------------------------------------------------
     * POPULATE APPOINTMENT
     * ---------------------------------------------------
     */

    const populatedAppointment =
      await Appointment.findById(
        appointment._id
      )
        .populate({
          path: "patient",

          populate: {
            path: "user",

            select:
              "name email profileImage avatar",
          },
        })

        .populate({
          path: "doctor",

          populate: [
            {
              path: "user",

              select:
                "name email profileImage avatar",
            },

            {
              path: "department",

              select:
                "name description",
            },
          ],
        });

    /*
     * ---------------------------------------------------
     * RESPONSE
     * ---------------------------------------------------
     */

    return res.status(201).json({
      success: true,

      message:
        "Appointment booked successfully",

      appointment:
        populatedAppointment,
    });
  } catch (error) {
    console.error(
      "Create appointment error:",
      error
    );

    if (
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This appointment slot or queue token is already in use. Please choose another slot.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Server error while booking appointment",
    });
  }
};

/*
 * =====================================================
 * GET MY APPOINTMENTS
 * =====================================================
 */

const getMyAppointments = async (
  req,
  res
) => {
  try {
    const patient =
      await Patient.findOne({
        user: req.user.userId,
      });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message:
          "Patient profile not found",
      });
    }

    const appointments =
      await Appointment.find({
        patient: patient._id,
        patientHistoryArchived: {
          $ne: true,
        },
      })
        .populate({
          path: "doctor",

          populate: [
            {
              path: "user",

              select:
                "name email profileImage avatar",
            },

            {
              path: "department",

              select:
                "name description",
            },
          ],
        })

        .sort({
          appointmentDate: 1,
        });

    return res.status(200).json({
      success: true,

      count:
        appointments.length,

      appointments,
    });
  } catch (error) {
    console.error(
      "Get patient appointments error:",
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
 * CLEAR PATIENT APPOINTMENT HISTORY
 * =====================================================
 *
 * Patient-only visibility operation. Appointment records are
 * preserved in MongoDB and remain visible to Doctor/Admin/audit
 * queries. Only this patient's portal view is cleared.
 */

const clearMyAppointmentHistory = async (req, res) => {
  try {
    const patient = await Patient.findOne({
      user: req.user.userId,
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    const result = await Appointment.updateMany(
      {
        patient: patient._id,
        status: {
          $in: ["completed", "cancelled"],
        },
        patientHistoryArchived: {
          $ne: true,
        },
      },
      {
        $set: {
          patientHistoryArchived: true,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: result.modifiedCount
        ? "Appointment history cleared from your view."
        : "There is no appointment history to clear.",
      clearedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error(
      "Clear patient appointment history error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while clearing appointment history.",
    });
  }
};

/*
 * =====================================================
 * CANCEL APPOINTMENT
 * =====================================================
 */

const cancelAppointment = async (
  req,
  res
) => {
  try {
    const patient =
      await Patient.findOne({
        user: req.user.userId,
      });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message:
          "Patient profile not found",
      });
    }

    const appointment =
      await Appointment.findOne({
        _id:
          req.params.appointmentId,

        patient: patient._id,
      });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message:
          "Appointment not found",
      });
    }

    if (
      appointment.status ===
      "completed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Completed appointment cannot be cancelled",
      });
    }

    if (
      appointment.status ===
      "cancelled"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Appointment is already cancelled",
      });
    }

    if (
      appointment.status ===
      "in-progress"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Appointment cannot be cancelled while consultation is in progress",
      });
    }

    if (
      appointment.appointmentDate <=
      new Date()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Past or active appointments cannot be cancelled",
      });
    }

    appointment.status =
      "cancelled";

    appointment.cancellationReason =
      "patient";

    await appointment.save();

    await QueueEntry.updateOne(
      {
        appointment:
          appointment._id,
      },
      {
        $set: {
          status: "cancelled",
        },
      }
    );

    /*
     * ---------------------------------------------------
     * RETURN CANCELLED TOKEN TO QUEUE COUNTER
     * ---------------------------------------------------
     *
     * The cancelled token is added back to the
     * availableTokens pool.
     *
     * The next appointment for the same doctor
     * and hospital date can reuse the lowest token.
     */

    const queueDate =
      getHospitalDateKey(
        appointment.appointmentDate
      );

    await QueueCounter.findOneAndUpdate(
      {
        doctor:
          appointment.doctor,

        queueDate,
      },
      {
        $addToSet: {
          availableTokens:
            appointment.tokenNumber,
        },

        $setOnInsert: {
          doctor:
            appointment.doctor,

          queueDate,
        },
      },
      {
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    await recordAudit({
      req,

      action:
        "appointment_cancelled",

      resourceType:
        "Appointment",

      resourceId:
        appointment._id,

      targetId:
        appointment.patient,
    });

    /*
     * ---------------------------------------------------
     * LIVE QUEUE UPDATE
     * ---------------------------------------------------
     */

    const io = getSocketIO();

    if (io) {
      io.to(
        `queue:${appointment.doctor}`
      ).emit(
        "queueUpdated",
        {
          type:
            "appointment-cancelled",

          message:
            "Appointment cancelled and queue updated",

          appointmentId:
            appointment._id,

          tokenNumber:
            appointment.tokenNumber,
        }
      );
    }

    /*
     * ---------------------------------------------------
     * CANCELLATION EMAIL
     * ---------------------------------------------------
     */

    try {
      const patientUser =
        await User.findById(
          req.user.userId
        ).select(
          "name email"
        );

      const doctorWithUser =
        await Doctor.findById(
          appointment.doctor
        ).populate(
          "user",
          "name email"
        );

      if (
        patientUser?.email
      ) {
        const formattedDate =
          formatHospitalDate(
            appointment.appointmentDate
          );

        await sendEmail({
          to:
            patientUser.email,

          subject:
            "Appointment Cancelled - Smart Hospital",

          html: `
<!DOCTYPE html>
<html>
  <body
    style="
      margin:0;
      padding:0;
      background:#f8fafc;
      font-family:Arial,sans-serif;
    "
  >
    <div
      style="
        max-width:600px;
        margin:40px auto;
        background:#ffffff;
        border:1px solid #e2e8f0;
        border-radius:12px;
        overflow:hidden;
      "
    >
      <div
        style="
          padding:24px;
          background:#0f172a;
          color:#ffffff;
        "
      >
        <h1
          style="
            margin:0;
            font-size:22px;
          "
        >
          Smart Hospital
        </h1>

        <p
          style="
            margin:6px 0 0;
            color:#cbd5e1;
          "
        >
          Appointment Cancellation
        </p>
      </div>

      <div
        style="
          padding:28px;
        "
      >
        <p
          style="
            font-size:16px;
            color:#0f172a;
          "
        >
          Hello ${
            patientUser?.name ||
            "Patient"
          },
        </p>

        <p
          style="
            font-size:14px;
            line-height:1.6;
            color:#475569;
          "
        >
          Your appointment has been successfully cancelled.
        </p>

        <div
          style="
            margin:24px 0;
            padding:20px;
            background:#f8fafc;
            border-radius:10px;
          "
        >
          <p
            style="
              margin:0 0 10px;
              color:#64748b;
              font-size:13px;
            "
          >
            Doctor
          </p>

          <p
            style="
              margin:0 0 18px;
              color:#0f172a;
              font-size:16px;
              font-weight:bold;
            "
          >
            Dr. ${
              doctorWithUser
                ?.user?.name ||
              "Doctor"
            }
          </p>

          <p
            style="
              margin:0 0 10px;
              color:#64748b;
              font-size:13px;
            "
          >
            Appointment Date
          </p>

          <p
            style="
              margin:0 0 18px;
              color:#0f172a;
              font-size:15px;
            "
          >
            ${formattedDate}
          </p>

          <p
            style="
              margin:0 0 10px;
              color:#64748b;
              font-size:13px;
            "
          >
            Queue Token
          </p>

          <p
            style="
              margin:0;
              color:#0f172a;
              font-size:22px;
              font-weight:bold;
            "
          >
            #${appointment.tokenNumber}
          </p>
        </div>

        <p
          style="
            font-size:14px;
            line-height:1.6;
            color:#475569;
          "
        >
          If you need medical consultation,
          please book a new appointment
          through the Smart Hospital portal.
        </p>

        <p
          style="
            margin-top:28px;
            font-size:13px;
            color:#94a3b8;
          "
        >
          This is an automated notification
          from Smart Hospital.
        </p>
      </div>
    </div>
  </body>
</html>
          `,
        });

        console.log(
          `Appointment cancellation email sent to ${patientUser.email}`
        );
      } else {
        console.warn(
          "Appointment cancellation email skipped: patient email not found"
        );
      }
    } catch (emailError) {
      console.error(
        "Appointment cancellation email failed:",
        emailError.message
      );
    }

    return res.status(200).json({
      success: true,

      message:
        "Appointment cancelled successfully",

      appointment,
    });
  } catch (error) {
    console.error(
      "Cancel appointment error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Server error while cancelling appointment",
    });
  }
};

/*
 * =====================================================
 * DOCTOR COMPLETES APPOINTMENT
 * =====================================================
 */

const completeAppointment = async (
  req,
  res
) => {
  try {
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

    const appointment =
      await Appointment.findOne({
        _id:
          req.params.appointmentId,

        doctor:
          doctor._id,

        status:
          "in-progress",
      });

    if (!appointment) {
      return res.status(404).json({
        success: false,

        message:
          "Active appointment not found",
      });
    }

    appointment.status =
      "completed";

    await appointment.save();

    /*
     * ---------------------------------------------------
     * LIVE QUEUE UPDATE
     * ---------------------------------------------------
     */

    const io = getSocketIO();

    if (io) {
      io.to(
        `queue:${doctor._id}`
      ).emit(
        "queueUpdated",
        {
          type:
            "appointment-completed",

          message:
            "Appointment completed and queue updated",

          appointmentId:
            appointment._id,

          completedToken:
            appointment.tokenNumber,
        }
      );
    }

    /*
     * ---------------------------------------------------
     * COMPLETION EMAIL
     * ---------------------------------------------------
     */

    try {
      const patientProfile =
        await Patient.findById(
          appointment.patient
        );

      if (!patientProfile) {
        console.warn(
          "Appointment completion email skipped: patient profile not found"
        );
      } else {
        const patientUser =
          await User.findById(
            patientProfile.user
          ).select(
            "name email"
          );

        const doctorWithUser =
          await Doctor.findById(
            doctor._id
          ).populate(
            "user",
            "name email"
          );

        if (
          patientUser?.email
        ) {
          await sendAppointmentCompletedEmail(
            {
              patientName:
                patientUser.name ||
                "Patient",

              patientEmail:
                patientUser.email,

              doctorName:
                doctorWithUser
                  ?.user?.name ||
                "Doctor",

              appointmentDate:
                appointment.appointmentDate,

              tokenNumber:
                appointment.tokenNumber,
            }
          );

          console.log(
            `Appointment completion email sent to ${patientUser.email}`
          );
        } else {
          console.warn(
            "Appointment completion email skipped: patient email not found"
          );
        }
      }
    } catch (emailError) {
      console.error(
        "Appointment completion email failed:",
        emailError.message
      );
    }

    /*
     * ---------------------------------------------------
     * POPULATE FINAL APPOINTMENT
     * ---------------------------------------------------
     */

    const populatedAppointment =
      await Appointment.findById(
        appointment._id
      )
        .populate({
          path: "patient",

          populate: {
            path: "user",

            select:
              "name email profileImage avatar",
          },
        })

        .populate({
          path: "doctor",

          populate: [
            {
              path: "user",

              select:
                "name email profileImage avatar",
            },

            {
              path: "department",

              select:
                "name description",
            },
          ],
        });

    return res.status(200).json({
      success: true,

      message:
        "Appointment completed successfully",

      appointment:
        populatedAppointment,
    });
  } catch (error) {
    console.error(
      "Complete appointment error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Server error while completing appointment",
    });
  }
};

/*
 * =====================================================
 * EXPORTS
 * =====================================================
 */

module.exports = {
  createAppointment,
  getMyAppointments,
  clearMyAppointmentHistory,
  cancelAppointment,
  completeAppointment,
};