const HOSPITAL_TIMEZONE = "Asia/Kolkata";

/**
 * Returns date/time parts in hospital timezone.
 */
const getHospitalDateParts = (date = new Date()) => {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    throw new Error("Invalid date");
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: HOSPITAL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);

  const result = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      result[part.type] = part.value;
    }
  }

  return {
    year: Number(result.year),
    month: Number(result.month),
    day: Number(result.day),
    weekday: result.weekday,
    hour: Number(result.hour),
    minute: Number(result.minute),
    second: Number(result.second),
  };
};

/**
 * Returns YYYY-MM-DD in hospital timezone.
 */
const getHospitalDateKey = (date = new Date()) => {
  const parts = getHospitalDateParts(date);

  return [
    parts.year,
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
};

/**
 * Returns weekday name in hospital timezone.
 */
const getHospitalDayName = (date = new Date()) => {
  return getHospitalDateParts(date).weekday.toLowerCase();
};

/**
 * Returns start and end of hospital-local day as UTC Date objects.
 *
 * Example:
 * Hospital date 2026-09-13
 * -> start/end represented as absolute UTC instants.
 */
const getHospitalDayRange = (date = new Date()) => {
  const parts = getHospitalDateParts(date);

  const start = new Date(
    `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
      parts.day
    ).padStart(2, "0")}T00:00:00+05:30`
  );

  const end = new Date(
    `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
      parts.day
    ).padStart(2, "0")}T23:59:59.999+05:30`
  );

  return {
    start,
    end,
  };
};

/**
 * Returns start of hospital-local day.
 */
const getHospitalStartOfDay = (date = new Date()) => {
  return getHospitalDayRange(date).start;
};

/**
 * Formats a date using hospital timezone.
 *
 * Example:
 * 13 September 2026
 */
const formatHospitalDate = (date = new Date()) => {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    throw new Error("Invalid date");
  }

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: HOSPITAL_TIMEZONE,
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value);
};

module.exports = {
  HOSPITAL_TIMEZONE,
  getHospitalDateParts,
  getHospitalDateKey,
  getHospitalDayName,
  getHospitalDayRange,
  getHospitalStartOfDay,
  formatHospitalDate,
};