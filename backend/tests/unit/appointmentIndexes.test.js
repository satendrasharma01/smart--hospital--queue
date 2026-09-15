const test = require("node:test");
const assert = require("node:assert/strict");

const Appointment = require("../../src/models/Appointment");
const QueueEntry = require("../../src/models/QueueEntry");

const ACTIVE_STATUSES = [
  "booked",
  "waiting",
  "in-progress",
];

const findIndex = (Model, keys) =>
  Model.schema.indexes().find(([indexKeys, options]) =>
    JSON.stringify(indexKeys) === JSON.stringify(keys) &&
    options?.unique === true
  );

const assertActivePartialIndex = (Model, keys) => {
  const entry = findIndex(Model, keys);

  assert.ok(entry, `Missing index for ${JSON.stringify(keys)}`);

  const options = entry[1];

  assert.equal(options.unique, true);
  assert.deepEqual(
    options.partialFilterExpression,
    { status: { $in: ACTIVE_STATUSES } }
  );
};

test("appointment slot index only blocks active appointments", () => {
  assertActivePartialIndex(
    Appointment,
    { doctor: 1, appointmentDate: 1 }
  );
});

test("appointment token index allows cancelled-token reuse", () => {
  assertActivePartialIndex(
    Appointment,
    { doctor: 1, tokenDate: 1, tokenNumber: 1 }
  );
});

test("queue token index allows cancelled-token reuse", () => {
  assertActivePartialIndex(
    QueueEntry,
    { doctor: 1, queueDate: 1, tokenNumber: 1 }
  );
});
