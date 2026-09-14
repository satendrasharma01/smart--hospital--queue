const Appointment = require("../models/Appointment");
const QueueEntry = require("../models/QueueEntry");
const { recordAudit } = require("./audit.service");

const runMissedAppointmentCancellation = async () => {
  const candidates = await Appointment.findOneAndUpdate(
    {
      appointmentDate: { $lt: new Date() },
      status: { $in: ["booked", "waiting"] },
    },
    {
      $set: { status: "cancelled", cancellationReason: "missed" },
    },
    { sort: { appointmentDate: 1 }, new: true }
  );

  if (!candidates) return 0;

  await QueueEntry.updateOne(
    { appointment: candidates._id },
    { $set: { status: "cancelled" } }
  );
  await recordAudit({
    action: "APPOINTMENT_AUTO_CANCELLED",
    resourceType: "Appointment",
    resourceId: candidates._id,
    targetId: candidates.patient,
    metadata: { reason: "missed" },
  });
  return 1;
};

const startMissedAppointmentWorker = (intervalMs = 60 * 1000) => {
  const timer = setInterval(async () => {
    try {
      while (await runMissedAppointmentCancellation()) {
        // Drain all currently eligible appointments in this pass.
      }
    } catch (error) {
      console.error("Missed appointment worker failed:", error);
    }
  }, intervalMs);
  timer.unref?.();
  return timer;
};

module.exports = {
  runMissedAppointmentCancellation,
  startMissedAppointmentWorker,
};
