const mongoose = require("mongoose");

const queueCounterSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },

    /*
     * Hospital calendar day.
     *
     * IMPORTANT:
     * This is intentionally a STRING instead of Date.
     *
     * Example:
     *
     * "2026-08-24"
     * "2026-08-26"
     *
     * This prevents timezone-related duplicate
     * queue counters.
     */
    queueDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    /*
     * Last token issued for this doctor
     * on this hospital calendar day.
     */
    lastToken: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * One counter per doctor per hospital day.
 */
queueCounterSchema.index(
  {
    doctor: 1,
    queueDate: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "QueueCounter",
  queueCounterSchema
);