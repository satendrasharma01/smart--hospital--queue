require("dotenv").config();

const mongoose = require("mongoose");

const QueueEntry = require("../src/models/QueueEntry");

const TARGET_KEYS = {
  doctor: 1,
  queueDate: 1,
  tokenNumber: 1,
};

const TARGET_PARTIAL = {
  status: {
    $ne: "cancelled",
  },
};

const sameKeys = (left, right) => {
  const leftKeys = Object.keys(left || {});
  const rightKeys = Object.keys(right || {});

  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] &&
        left[key] === right[key]
    )
  );
};

const samePartial = (left, right) =>
  JSON.stringify(left || null) ===
  JSON.stringify(right || null);

const migrate = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured.");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const collection = QueueEntry.collection;
  const indexes = await collection.indexes();

  for (const index of indexes) {
    if (
      !index.unique ||
      !sameKeys(index.key, TARGET_KEYS)
    ) {
      continue;
    }

    const isTargetIndex =
      samePartial(
        index.partialFilterExpression,
        TARGET_PARTIAL
      );

    if (isTargetIndex) {
      console.log(
        `Keeping correct queue token index: ${index.name}`
      );
      continue;
    }

    console.log(
      `Dropping legacy queue token index: ${index.name}`
    );

    await collection.dropIndex(index.name);
  }

  await collection.createIndex(TARGET_KEYS, {
    unique: true,
    partialFilterExpression: TARGET_PARTIAL,
  });

  console.log(
    "Queue token index migration completed."
  );
};

migrate()
  .catch((error) => {
    console.error(
      "Queue token index migration failed:",
      error.message
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
