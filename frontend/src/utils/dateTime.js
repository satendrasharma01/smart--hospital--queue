export const HOSPITAL_TIMEZONE = "Asia/Kolkata";

export const parseAppointmentDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

export const formatAppointmentDate = (
  value,
  {
    weekday,
    month = "long",
    day = "2-digit",
    year = "numeric",
  } = {}
) => {
  const date = value instanceof Date
    ? value
    : parseAppointmentDate(value);

  if (!date) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    timeZone: HOSPITAL_TIMEZONE,
    ...(weekday ? { weekday } : {}),
    day,
    month,
    year,
  });
};

export const formatAppointmentTime = (value) => {
  const date = value instanceof Date
    ? value
    : parseAppointmentDate(value);

  if (!date) {
    return "—";
  }

  return date.toLocaleTimeString("en-US", {
    timeZone: HOSPITAL_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatAppointmentDateTime = (value) => {
  const date = value instanceof Date
    ? value
    : parseAppointmentDate(value);

  if (!date) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    timeZone: HOSPITAL_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const getHospitalDateKeyFromInstant = (value = new Date()) => {
  const date = value instanceof Date
    ? value
    : parseAppointmentDate(value);

  if (!date) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: HOSPITAL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const result = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      result[part.type] = part.value;
    }
  }

  return `${result.year}-${result.month}-${result.day}`;
};

export const getHospitalDayNameFromDateKey = (dateKey) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return "";
  }

  // Noon avoids any browser/server local-time boundary effects.
  const date = new Date(`${dateKey}T12:00:00+05:30`);

  return date.toLocaleDateString("en-US", {
    timeZone: HOSPITAL_TIMEZONE,
    weekday: "long",
  }).toLowerCase();
};

export const getHospitalDateParts = (value = new Date()) => {
  const date = value instanceof Date
    ? value
    : parseAppointmentDate(value);

  if (!date) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: HOSPITAL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

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
    hour: Number(result.hour),
    minute: Number(result.minute),
  };
};

