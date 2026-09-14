const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Doctor = require("../../src/models/Doctor");

const baseDoctor = () => ({
  user: new mongoose.Types.ObjectId(),
  specialization: "Cardiology",
  qualification: "MBBS",
  department: new mongoose.Types.ObjectId(),
});

test("stores and trims a doctor bio", () => {
  const doctor = new Doctor({
    ...baseDoctor(),
    bio: "  Doctor-provided information.  ",
  });

  assert.equal(doctor.bio, "Doctor-provided information.");
  assert.equal(doctor.validateSync(), undefined);
});

test("allows an empty bio and rejects an overlong bio", () => {
  const emptyDoctor = new Doctor({
    ...baseDoctor(),
    bio: "",
  });
  assert.equal(emptyDoctor.validateSync(), undefined);

  const longDoctor = new Doctor({
    ...baseDoctor(),
    bio: "x".repeat(2001),
  });
  assert.equal(longDoctor.validateSync().errors.bio.kind, "maxlength");
});
