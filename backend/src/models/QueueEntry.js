const mongoose = require("mongoose");

const queueEntrySchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    queueDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true },
    tokenNumber: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["booked", "waiting", "in-progress", "completed", "cancelled"],
      required: true,
    },
    joinedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

queueEntrySchema.index({ appointment: 1 }, { unique: true });
queueEntrySchema.index({ doctor: 1, queueDate: 1, tokenNumber: 1 }, { unique: true });
queueEntrySchema.index({ doctor: 1, queueDate: 1, status: 1, tokenNumber: 1 });

module.exports = mongoose.model("QueueEntry", queueEntrySchema);
