const mongoose = require("mongoose");

/*
 * =====================================================
 * DOCTOR AVAILABILITY SCHEMA
 * =====================================================
 *
 * Example:
 *
 * Monday
 * 09:00 - 13:00
 * 15 minutes per appointment
 *
 * Same day can have multiple schedules.
 */

const availabilitySchema = new mongoose.Schema(
  {
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
      lowercase: true,
      trim: true,
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
    _id: true,
  }
);

/*
 * =====================================================
 * DOCTOR SCHEMA
 * =====================================================
 */

const doctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    lifecycleStatus: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
      index: true,
    },

    specialization: {
      type: String,
      required: [true, "Specialization is required"],
      trim: true,
      maxlength: 100,
    },

    qualification: {
      type: String,
      required: [true, "Qualification is required"],
      trim: true,
      maxlength: 150,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    experience: {
      type: Number,
      default: 0,
      min: 0,
      max: 80,
    },

    consultationFee: {
      type: Number,
      default: 0,
      min: 0,
      max: 1000000,
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required"],
    },

    /*
     * Kept for backward compatibility.
     *
     * Existing frontend/backend code already uses this.
     */
    availableDays: {
      type: [String],
      default: [],
    },

    /*
     * Actual consultation schedule.
     *
     * A doctor can have multiple timings
     * on the same day.
     */
    availability: {
      type: [availabilitySchema],
      default: [],
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Doctor",
  doctorSchema
);