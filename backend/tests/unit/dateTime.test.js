const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getHospitalDateKey,
  getHospitalDayName,
  getHospitalDayRange,
} = require("../../src/utils/dateTime");

test("converts UTC midnight boundaries to the correct hospital day", () => {
  const instant = new Date("2026-09-12T18:29:59.999Z");
  assert.equal(getHospitalDateKey(instant), "2026-09-12");
  assert.equal(getHospitalDayName(instant), "saturday");
  const range = getHospitalDayRange(new Date("2026-09-13T10:00:00Z"));
  assert.equal(range.start.toISOString(), "2026-09-12T18:30:00.000Z");
  assert.equal(range.end.toISOString(), "2026-09-13T18:29:59.999Z");
});
