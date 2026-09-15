require("dotenv").config();
const mongoose = require("mongoose");

const QUEUE_ENTRY_COLLECTION = "queueentries";
const INDEX_KEYS = {
  doctor: 1,
  queueDate: 1,
  tokenNumber: 1,
};

async function migrate() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  await mongoose.connect(process.env.MONGO_URI);
  const collection = mongoose.connection.collection(QUEUE_ENTRY_COLLECTION);
  const indexes = await collection.indexes();

  for (const index of indexes) {
    const sameKeys = JSON.stringify(index.key) === JSON.stringify(INDEX_KEYS);
    const isUnique = index.unique === true;
    const hasCorrectPartialFilter =
      JSON.stringify(index.partialFilterExpression || {}) ===
      JSON.stringify({ status: { $ne: "cancelled" } });

    if (sameKeys && isUnique && !hasCorrectPartialFilter) {
      console.log(`Dropping conflicting unique queue token index: ${index.name}`);
      await collection.dropIndex(index.name);
    } else if (sameKeys && isUnique && hasCorrectPartialFilter) {
      console.log(`Correct partial unique queue token index already exists: ${index.name}`);
    }
  }

  const refreshed = await collection.indexes();
  const exists = refreshed.some(
    (index) =>
      JSON.stringify(index.key) === JSON.stringify(INDEX_KEYS) &&
      index.unique === true &&
      JSON.stringify(index.partialFilterExpression || {}) ===
        JSON.stringify({ status: { $ne: "cancelled" } })
  );

  if (!exists) {
    await collection.createIndex(INDEX_KEYS, {
      unique: true,
      partialFilterExpression: {
        status: { $ne: "cancelled" },
      },
    });
    console.log("Created partial unique queue token index.");
  }

  console.log("Queue token index migration completed safely.");
}

migrate()
  .catch((error) => {
    console.error("Queue token index migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
