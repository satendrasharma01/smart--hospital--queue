require("dotenv").config();
const mongoose = require("mongoose");
const Doctor = require("../src/models/Doctor");
const DoctorAvailability = require("../src/models/DoctorAvailability");

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  await mongoose.connect(`${process.env.MONGO_URI}${process.env.MONGO_URI.includes("?") ? "&" : "?"}retryWrites=false`);
  const doctors = await Doctor.find().select("+availability");
  let migrated = 0;
  for (const doctor of doctors) {
    if (!Array.isArray(doctor.availability) || doctor.availability.length === 0) continue;
    for (const schedule of doctor.availability) {
      await DoctorAvailability.updateOne(
        {
          doctor: doctor._id,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
        },
        {
          $setOnInsert: {
            slotDuration: schedule.slotDuration,
            isActive: schedule.isActive !== false,
          },
        },
        { upsert: true }
      );
      migrated += 1;
    }
  }
  console.log(`Migrated ${migrated} availability schedules`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
