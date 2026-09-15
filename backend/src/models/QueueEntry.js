const mongoose = require("mongoose");

const queueEntrySchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },

    queueDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      unique: true,
    },

    tokenNumber: {
      type: Number,
      required: true,
      min: 1,
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
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * =====================================================
 * ACTIVE QUEUE TOKEN UNIQUENESS
 * =====================================================
 *
 * Only active queue entries occupy a doctor/date/token
 * combination.
 *
 * Cancelled entries remain in the database for history
 * but their token can be reused by a new appointment.
 *
 * Active statuses:
 *   - booked
 *   - waiting
 *   - in-progress
 *
 * Cancelled/completed entries do not participate in this
 * uniqueness constraint.
 */
queueEntrySchema.index(
  {
    doctor: 1,
    queueDate: 1,
    tokenNumber: 1,
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
  }
);

/*
 * =====================================================
 * QUEUE LOOKUP INDEX
 * =====================================================
 *
 * Used for efficient doctor/date/status/token queries.
 *
 * This is intentionally non-unique.
 */
queueEntrySchema.index({
  doctor: 1,
  queueDate: 1,
  status: 1,
  tokenNumber: 1,
});

module.exports = mongoose.model("QueueEntry", queueEntrySchema);