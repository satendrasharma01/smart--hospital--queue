const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },

    appointmentDate: {
      type: Date,
      required: true,
      index: true,
    },

    tokenNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    /*
     * Calendar day used for queue/token numbering.
     *
     * Example:
     * 2026-08-14T00:00:00.000Z
     */
    tokenDate: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "booked",
        "waiting",
        "in-progress",
        "completed",
        "cancelled",
      ],
      default: "booked",
      index: true,
    },

    cancellationReason: {
      type: String,
      enum: ["missed", "patient", "system"],
      trim: true,
    },

    reason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * =====================================================
 * GENERAL APPOINTMENT QUERY INDEX
 * =====================================================
 *
 * Used for:
 * - doctor appointment history
 * - date based queries
 * - queue queries
 */
appointmentSchema.index({
  doctor: 1,
  appointmentDate: 1,
});

/*
 * =====================================================
 * DOCTOR + TOKEN DATE + TOKEN NUMBER
 * =====================================================
 *
 * Prevents duplicate active token numbers
 * for the same doctor on the same calendar day.
 *
 * Cancelled tokens can be reused because a cancelled
 * appointment no longer occupies the active queue.
 */
appointmentSchema.index(
  {
    doctor: 1,
    tokenDate: 1,
    tokenNumber: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      status: {
        $ne: "cancelled",
      },
    },
  }
);

/*
 * =====================================================
 * EXACT APPOINTMENT SLOT PROTECTION
 * =====================================================
 *
 * This is the important production-level protection.
 *
 * Application-level checks alone are not enough because
 * two requests can arrive at almost exactly the same time.
 *
 * MongoDB becomes the final authority here.
 *
 * Active appointments:
 *
 * booked
 * waiting
 * in-progress
 *
 * cannot occupy the same doctor's exact appointment slot.
 *
 * Completed/cancelled appointments do NOT block the slot.
 */
appointmentSchema.index(
  {
    doctor: 1,
    appointmentDate: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      status: {
        $in: [
          "booked",
          "waiting",
          "in-progress",
        ],
      },
    },

    name: "unique_active_doctor_appointment_slot",
  }
);

/*
 * =====================================================
 * PATIENT APPOINTMENT HISTORY
 * =====================================================
 *
 * Helps patient-specific appointment history queries.
 */
appointmentSchema.index({
  patient: 1,
  appointmentDate: -1,
});

appointmentSchema.index(
  { patient: 1, doctor: 1, tokenDate: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["booked", "waiting", "in-progress"] },
    },
    name: "unique_active_patient_doctor_day",
  }
);

appointmentSchema.index(
  { doctor: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "in-progress" },
    name: "one_active_consultation_per_doctor",
  }
);

/*
 * =====================================================
 * DOCTOR STATUS / QUEUE QUERIES
 * =====================================================
 *
 * Useful for:
 * - today's queue
 * - waiting patients
 * - active appointments
 */
appointmentSchema.index({
  doctor: 1,
  status: 1,
  appointmentDate: 1,
});

/*
 * =====================================================
 * EXPORT
 * =====================================================
 */

module.exports =
  mongoose.model(
    "Appointment",
    appointmentSchema
  );