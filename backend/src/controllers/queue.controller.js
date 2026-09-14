const mongoose = require("mongoose");

const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const DoctorAvailability = require("../models/DoctorAvailability");
const QueueEntry = require("../models/QueueEntry");

const { getSocketIO } = require("../utils/socket");
const { recordAudit } = require("../services/audit.service");

const {
  getHospitalStartOfDay,
  getHospitalDayName,
  getHospitalDateParts,
} = require("../utils/dateTime");

/*
 * =====================================================
 * GET DOCTOR SLOT DURATION
 * =====================================================
 *
 * Uses the doctor's actual availability configuration.
 *
 * Important:
 * All weekday/time calculations are performed
 * according to the hospital timezone:
 *
 * Asia/Kolkata
 *
 * If multiple availability periods exist for the same day,
 * the matching availability period is used.
 */

const getSlotDurationForAppointment = async (
  doctorId,
  appointmentDate
) => {
  const dayOfWeek =
    getHospitalDayName(appointmentDate);

  const availability =
    await DoctorAvailability.find({
      doctor: doctorId,
      dayOfWeek,
      isActive: true,
    }).sort({
      startTime: 1,
    });

  if (!availability.length) {
    return null;
  }

  /*
   * appointmentDate is stored as UTC in MongoDB.
   *
   * We must convert it to hospital timezone
   * before extracting hour/minute.
   */
  const dateParts =
    getHospitalDateParts(
      appointmentDate
    );

  const appointmentMinutes =
    dateParts.hour * 60 +
    dateParts.minute;

  const matchingSchedule =
    availability.find((schedule) => {
      const [startHour, startMinute] =
        schedule.startTime
          .split(":")
          .map(Number);

      const [endHour, endMinute] =
        schedule.endTime
          .split(":")
          .map(Number);

      const startMinutes =
        startHour * 60 +
        startMinute;

      const endMinutes =
        endHour * 60 +
        endMinute;

      return (
        appointmentMinutes >=
          startMinutes &&
        appointmentMinutes <
          endMinutes
      );
    });

  if (!matchingSchedule) {
    return null;
  }

  const duration =
    Number(
      matchingSchedule.slotDuration
    );

  if (
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return null;
  }

  return duration;
};

/*
 * =====================================================
 * CALL NEXT PATIENT
 * =====================================================
 */

const queueCallLocks = new Set();

const callNextPatientUnsafe = async (
  req,
  res
) => {
  try {
    /*
     * ---------------------------------------------------
     * FIND DOCTOR
     * ---------------------------------------------------
     */

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

    if (doctor.lifecycleStatus && doctor.lifecycleStatus !== "active") {
      return res.status(409).json({
        success: false,
        message: "Doctor is not active",
      });
    }

    /*
     * ---------------------------------------------------
     * TODAY'S QUEUE DATE
     * ---------------------------------------------------
     *
     * IMPORTANT:
     *
     * Do NOT use:
     *
     * new Date().setHours(0, 0, 0, 0)
     *
     * because that depends on the server timezone.
     *
     * The hospital operates according to
     * Asia/Kolkata.
     */

    const tokenDate =
      getHospitalStartOfDay();

    /*
     * ---------------------------------------------------
     * CHECK CURRENT PATIENT
     * ---------------------------------------------------
     *
     * Only one patient can be
     * in-progress at a time.
     */

    const currentPatient =
      await Appointment.findOne({
        doctor: doctor._id,

        tokenDate,

        status:
          "in-progress",
      });

    if (currentPatient) {
      return res.status(409).json({
        success: false,
        message:
          "Complete the current appointment first",
      });
    }

    /*
     * ---------------------------------------------------
     * ATOMICALLY CALL NEXT PATIENT
     * ---------------------------------------------------
     *
     * This prevents two simultaneous
     * Call Next requests from selecting
     * the same patient.
     */

    const nextPatient =
      await Appointment.findOneAndUpdate(
        {
          doctor: doctor._id,

          tokenDate,

          status: {
            $in: [
              "booked",
              "waiting",
            ],
          },
        },

        {
          $set: {
            status:
              "in-progress",
          },
        },

        {
          sort: {
            tokenNumber: 1,
          },

          returnDocument:
            "after",
        }
      );

    if (!nextPatient) {
      return res.status(404).json({
        success: false,
        message:
          "No patients waiting in the queue",
      });
    }
    await QueueEntry.updateOne(
      { appointment: nextPatient._id },
      { $set: { status: "in-progress" } }
    );

    await recordAudit({
      req,
      action: "queue_call_next",
      resourceType: "Appointment",
      resourceId: nextPatient._id,
      targetId: nextPatient.patient,
      metadata: { tokenNumber: nextPatient.tokenNumber },
    });

    /*
     * ---------------------------------------------------
     * SOCKET UPDATE
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
            "patient-called",

          message:
            "Queue updated",

          appointmentId:
            nextPatient._id,

          currentlyServing:
            nextPatient.tokenNumber,
        }
      );
    }

    return res.status(200).json({
      success: true,

      message:
        "Next patient called successfully",

      appointment:
        nextPatient,
    });
  } catch (error) {
    console.error("Call next patient error:", error.code || error.name);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Another consultation was started. Complete it before calling the next patient.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Server error while calling next patient",
    });
  }
};

const callNextPatient = async (req, res) => {
  const lockKey = String(req.user.userId);

  if (queueCallLocks.has(lockKey)) {
    return res.status(409).json({
      success: false,
      message: "Another queue action is already being processed",
    });
  }

  queueCallLocks.add(lockKey);

  try {
    return await callNextPatientUnsafe(req, res);
  } finally {
    queueCallLocks.delete(lockKey);
  }
};

/*
 * =====================================================
 * COMPLETE APPOINTMENT
 * =====================================================
 */

const completeAppointment = async (
  req,
  res
) => {
  try {
    const {
      appointmentId,
    } = req.params;

    /*
     * ---------------------------------------------------
     * VALIDATE ID
     * ---------------------------------------------------
     */

    if (
      !mongoose.Types.ObjectId.isValid(
        appointmentId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid appointment ID",
      });
    }

    /*
     * ---------------------------------------------------
     * FIND DOCTOR
     * ---------------------------------------------------
     */

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

    /*
     * ---------------------------------------------------
     * FIND ACTIVE APPOINTMENT
     * ---------------------------------------------------
     */

    const appointment =
      await Appointment.findOne({
        _id: appointmentId,

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

    /*
     * ---------------------------------------------------
     * COMPLETE
     * ---------------------------------------------------
     */

    appointment.status =
      "completed";

    await appointment.save();
    await QueueEntry.updateOne(
      { appointment: appointment._id },
      { $set: { status: "completed" } }
    );
    await recordAudit({
      req,
      action: "appointment_completed",
      resourceType: "Appointment",
      resourceId: appointment._id,
      targetId: appointment.patient,
    });

    /*
     * ---------------------------------------------------
     * SOCKET UPDATE
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

    return res.status(200).json({
      success: true,

      message:
        "Appointment completed successfully",

      appointment,
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
 * GET MY QUEUE STATUS
 * =====================================================
 */

const getMyQueueStatus = async (
  req,
  res
) => {
  try {
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
     * FIND NEAREST ACTIVE APPOINTMENT
     * ---------------------------------------------------
     */

    const appointment =
      await Appointment.findOne({
        patient:
          patient._id,

        status: {
          $in: [
            "booked",
            "waiting",
            "in-progress",
          ],
        },
      })
        .sort({
          appointmentDate: 1,
        })
        .populate({
          path: "doctor",

          populate: {
            path: "user",

            select:
              "name",
          },
        });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message:
          "No active appointment found",
      });
    }

    /*
     * ---------------------------------------------------
     * SAFETY CHECK
     * ---------------------------------------------------
     */

    if (!appointment.doctor) {
      return res.status(500).json({
        success: false,
        message:
          "Doctor information is unavailable for this appointment",
      });
    }

    /*
     * ---------------------------------------------------
     * QUEUE DATE
     * ---------------------------------------------------
     *
     * tokenDate is the source of truth.
     *
     * We intentionally do NOT recalculate
     * the queue date from appointmentDate here.
     *
     * This ensures the queue always uses
     * the token date generated during booking.
     */

    const tokenDate =
      appointment.tokenDate;

    if (!tokenDate) {
      return res.status(500).json({
        success: false,
        message:
          "Appointment queue date is missing",
      });
    }

    /*
     * ---------------------------------------------------
     * GET ACTIVE QUEUE
     * ---------------------------------------------------
     */

    const queueAppointments =
      await Appointment.find({
        doctor:
          appointment.doctor._id,

        tokenDate,

        status: {
          $in: [
            "booked",
            "waiting",
            "in-progress",
          ],
        },
      }).sort({
        tokenNumber: 1,
      });

    /*
     * ---------------------------------------------------
     * CURRENTLY SERVING
     * ---------------------------------------------------
     */

    const currentPatient =
      queueAppointments.find(
        (item) =>
          item.status ===
          "in-progress"
      );

    /*
     * ---------------------------------------------------
     * PATIENT AHEAD
     * ---------------------------------------------------
     *
     * Only active patients with a
     * smaller token are counted.
     */

    const patientsAhead =
      queueAppointments.filter(
        (item) =>
          item.tokenNumber <
          appointment.tokenNumber
      ).length;

    /*
     * ---------------------------------------------------
     * SLOT DURATION
     * ---------------------------------------------------
     */

    let slotDuration =
      await getSlotDurationForAppointment(
        appointment.doctor._id,

        new Date(
          appointment.appointmentDate
        )
      );

    /*
     * Availability is authoritative for wait estimates.
     * Do not invent a duration when configuration is missing.
     */
    if (
      !Number.isFinite(slotDuration) ||
      slotDuration <= 0
    ) {
      slotDuration = null;
    }

    /*
     * ---------------------------------------------------
     * ESTIMATED WAIT
     * ---------------------------------------------------
     *
     * This is an estimate, not an exact
     * consultation duration.
     */

    let estimatedWaitMinutes = 0;

    if (currentPatient) {
      if (
        appointment.tokenNumber >
        currentPatient.tokenNumber
      ) {
        const activeBeforePatient =
          queueAppointments.filter(
            (item) =>
              item.tokenNumber <
              appointment.tokenNumber
          );

        estimatedWaitMinutes =
          activeBeforePatient.length *
          slotDuration;
      } else {
        estimatedWaitMinutes = 0;
      }
    } else {
      /*
       * Doctor is currently idle.
       *
       * Every active patient before
       * this patient represents one slot.
       */

      estimatedWaitMinutes =
        patientsAhead *
        slotDuration;
    }

    /*
     * ---------------------------------------------------
     * IF PATIENT IS CURRENTLY SERVING
     * ---------------------------------------------------
     */

    if (appointment.status === "in-progress") {
      estimatedWaitMinutes = 0;
    }

    if (slotDuration === null) {
      estimatedWaitMinutes = null;
    }

    /*
     * ---------------------------------------------------
     * RESPONSE
     * ---------------------------------------------------
     */

    return res.status(200).json({
      success: true,

      queue: {
        appointmentId:
          appointment._id,

        doctorId:
          appointment.doctor._id,

        doctor:
          appointment.doctor
            .user?.name ||
          "Doctor",

        yourToken:
          appointment.tokenNumber,

        status:
          appointment.status,

        currentlyServing:
          currentPatient
            ? currentPatient.tokenNumber
            : null,

        patientsAhead,

        estimatedWaitMinutes,

        slotDuration,

        appointmentDate:
          appointment.appointmentDate,

        tokenDate:
          appointment.tokenDate,

        queueStack: queueAppointments.map((item) => ({
          tokenNumber: item.tokenNumber,
          status: item.status,
        })),
      },
    });
  } catch (error) {
    console.error(
      "Get queue status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching queue status",
    });
  }
};

/*
 * =====================================================
 * EXPORTS
 * =====================================================
 */

module.exports = {
  callNextPatient,
  completeAppointment,
  getMyQueueStatus,
};