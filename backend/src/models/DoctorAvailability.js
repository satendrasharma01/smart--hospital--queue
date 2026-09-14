const mongoose = require("mongoose");

const doctorAvailabilitySchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },

    dayOfWeek: {
      type: String,
      enum: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      required: true,
    },

    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },

    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },

    slotDuration: {
      type: Number,
      required: true,
      min: 5,
      max: 120,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * One active availability period should not be
 * duplicated for the same doctor/day/start/end.
 */
doctorAvailabilitySchema.index(
  {
    doctor: 1,
    dayOfWeek: 1,
    startTime: 1,
    endTime: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "DoctorAvailability",
  doctorAvailabilitySchema
);