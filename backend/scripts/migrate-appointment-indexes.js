require("dotenv").config();

const mongoose = require("mongoose");

const Appointment = require("../src/models/Appointment");
const QueueEntry = require("../src/models/QueueEntry");

const ACTIVE_STATUSES = [
  "booked",
  "waiting",
  "in-progress",
];

const sameKeys = (left, right) => {
  const leftEntries = Object.entries(left || {});
  const rightEntries = Object.entries(right || {});

  return (
    leftEntries.length === rightEntries.length &&
    leftEntries.every(
      ([key, value], index) =>
        rightEntries[index]?.[0] === key &&
        rightEntries[index]?.[1] === value
    )
  );
};

const samePartial = (left, right) =>
  JSON.stringify(left || null) === JSON.stringify(right || null);

const findDuplicateGroups = async (Model, pipeline) =>
  Model.aggregate([
    { $match: { status: { $in: ACTIVE_STATUSES } } },
    ...pipeline,
    { $match: { count: { $gt: 1 } } },
  ]);

const ensureIndex = async ({
  Model,
  keys,
  partialFilterExpression,
  name,
  duplicatePipeline,
}) => {
  const collection = Model.collection;
  const indexes = await collection.indexes();

  const duplicateGroups = await findDuplicateGroups(
    Model,
    duplicatePipeline
  );

  if (duplicateGroups.length > 0) {
    const examples = duplicateGroups
      .slice(0, 5)
      .map((group) => JSON.stringify(group))
      .join("\n");

    throw new Error(
      `Cannot create ${name}: active duplicate records already exist.\n${examples}`
    );
  }

  for (const index of indexes) {
    if (!index.unique || !sameKeys(index.key, keys)) {
      continue;
    }

    const isCorrect =
      samePartial(
        index.partialFilterExpression,
        partialFilterExpression
      );

    if (isCorrect) {
      console.log(`Keeping correct index: ${index.name}`);
      continue;
    }

    console.log(`Dropping legacy unique index: ${index.name}`);
    await collection.dropIndex(index.name);
  }

  const refreshed = await collection.indexes();
  const alreadyCorrect = refreshed.some(
    (index) =>
      index.unique &&
      sameKeys(index.key, keys) &&
      samePartial(
        index.partialFilterExpression,
        partialFilterExpression
      )
  );

  if (!alreadyCorrect) {
    await collection.createIndex(keys, {
      unique: true,
      partialFilterExpression,
      name,
    });
    console.log(`Created index: ${name}`);
  }
};

const migrate = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured.");
  }

  await mongoose.connect(process.env.MONGO_URI);

  await ensureIndex({
    Model: Appointment,
    keys: {
      doctor: 1,
      appointmentDate: 1,
    },
    partialFilterExpression: {
      status: { $in: ACTIVE_STATUSES },
    },
    name: "unique_active_doctor_appointment_slot",
    duplicatePipeline: [
      {
        $group: {
          _id: {
            doctor: "$doctor",
            appointmentDate: "$appointmentDate",
          },
          count: { $sum: 1 },
        },
      },
    ],
  });

  await ensureIndex({
    Model: Appointment,
    keys: {
      doctor: 1,
      tokenDate: 1,
      tokenNumber: 1,
    },
    partialFilterExpression: {
      status: { $in: ACTIVE_STATUSES },
    },
    name: "unique_active_doctor_token",
    duplicatePipeline: [
      {
        $group: {
          _id: {
            doctor: "$doctor",
            tokenDate: "$tokenDate",
            tokenNumber: "$tokenNumber",
          },
          count: { $sum: 1 },
        },
      },
    ],
  });

  await ensureIndex({
    Model: Appointment,
    keys: {
      patient: 1,
      doctor: 1,
      tokenDate: 1,
    },
    partialFilterExpression: {
      status: { $in: ACTIVE_STATUSES },
    },
    name: "unique_active_patient_doctor_day",
    duplicatePipeline: [
      {
        $group: {
          _id: {
            patient: "$patient",
            doctor: "$doctor",
            tokenDate: "$tokenDate",
          },
          count: { $sum: 1 },
        },
      },
    ],
  });

  await ensureIndex({
    Model: QueueEntry,
    keys: {
      doctor: 1,
      queueDate: 1,
      tokenNumber: 1,
    },
    partialFilterExpression: {
      status: { $in: ACTIVE_STATUSES },
    },
    name: "unique_active_doctor_queue_token",
    duplicatePipeline: [
      {
        $group: {
          _id: {
            doctor: "$doctor",
            queueDate: "$queueDate",
            tokenNumber: "$tokenNumber",
          },
          count: { $sum: 1 },
        },
      },
    ],
  });

  console.log("Appointment/queue index migration completed.");
};

migrate()
  .catch((error) => {
    console.error(
      "Appointment/queue index migration failed:",
      error.message
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
