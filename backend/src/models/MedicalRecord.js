const mongoose = require("mongoose");

const medicalRecordSchema = new mongoose.Schema(
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

    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      unique: true,
    },

    symptoms: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    diagnosis: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 5000,
    },

    prescription: {
      type: String,
      trim: true,
      maxlength: 5000,
    },

    followUpDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Fast patient medical-history queries.
 */
medicalRecordSchema.index({
  patient: 1,
  createdAt: -1,
});

/*
 * Fast doctor history queries.
 */
medicalRecordSchema.index({
  doctor: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "MedicalRecord",
  medicalRecordSchema
);