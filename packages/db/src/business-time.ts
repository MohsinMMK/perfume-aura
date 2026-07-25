import { DomainError } from "./domain-errors";

export const DEFAULT_BUSINESS_TIMEZONE = "Asia/Karachi";

export function validateBusinessTimeZone(value: string): string {
  const timezone = value.trim();
  if (!timezone) {
    throw new DomainError(
      "INVALID_INPUT",
      "BUSINESS_TIMEZONE cannot be empty",
    );
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(0);
  } catch (error) {
    throw new DomainError(
      "INVALID_INPUT",
      `Invalid BUSINESS_TIMEZONE: ${timezone}`,
      { cause: error },
    );
  }

  return timezone;
}

export const BUSINESS_TIMEZONE = validateBusinessTimeZone(
  process.env.BUSINESS_TIMEZONE ?? DEFAULT_BUSINESS_TIMEZONE,
);

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond?: number;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;

  const created = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hourCycle: "h23",
  });
  formatterCache.set(timeZone, created);
  return created;
}

function partsAt(instant: Date, timeZone: string): DateTimeParts {
  const values = Object.fromEntries(
    formatter(timeZone)
      .formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
    millisecond: values.fractionalSecond ?? 0,
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function businessDateAt(
  instant = new Date(),
  timeZone = BUSINESS_TIMEZONE,
): string {
  const parts = partsAt(instant, validateBusinessTimeZone(timeZone));
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function businessYearAt(
  instant = new Date(),
  timeZone = BUSINESS_TIMEZONE,
): number {
  return partsAt(instant, validateBusinessTimeZone(timeZone)).year;
}

/**
 * Convert a timezone-local wall time to its UTC instant using only the
 * standards-based Intl API. Iteration accounts for non-whole-hour offsets and
 * daylight-saving transitions; the approved Asia/Karachi zone has no DST.
 */
export function zonedDateTimeToInstant(
  local: DateTimeParts,
  timeZone = BUSINESS_TIMEZONE,
): Date {
  const zone = validateBusinessTimeZone(timeZone);
  const millisecond = local.millisecond ?? 0;
  const targetWall = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second,
    millisecond,
  );
  let candidate = targetWall;

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const observed = partsAt(new Date(candidate), zone);
    const observedWall = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second,
      observed.millisecond,
    );
    const difference = observedWall - targetWall;
    if (difference === 0) break;
    candidate -= difference;
  }

  const result = new Date(candidate);
  const verified = partsAt(result, zone);
  if (
    verified.year !== local.year ||
    verified.month !== local.month ||
    verified.day !== local.day ||
    verified.hour !== local.hour ||
    verified.minute !== local.minute ||
    verified.second !== local.second ||
    verified.millisecond !== millisecond
  ) {
    throw new DomainError(
      "INVALID_INPUT",
      "The supplied local date/time does not exist in the business timezone",
    );
  }

  return result;
}

const dateTimeLocalPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;
const explicitInstantPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/;

function milliseconds(value: string | undefined): number {
  return value ? Number(value.padEnd(3, "0")) : 0;
}

function hasValidCalendarFields(parts: DateTimeParts): boolean {
  const candidate = new Date(0);
  candidate.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  candidate.setUTCHours(
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond ?? 0,
  );
  return (
    candidate.getUTCFullYear() === parts.year &&
    candidate.getUTCMonth() + 1 === parts.month &&
    candidate.getUTCDate() === parts.day &&
    candidate.getUTCHours() === parts.hour &&
    candidate.getUTCMinutes() === parts.minute &&
    candidate.getUTCSeconds() === parts.second &&
    candidate.getUTCMilliseconds() === (parts.millisecond ?? 0)
  );
}

function utcTimestamp(parts: DateTimeParts): number {
  const candidate = new Date(0);
  candidate.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  candidate.setUTCHours(
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond ?? 0,
  );
  return candidate.getTime();
}

function invalidDateTime(): never {
  throw new DomainError(
    "INVALID_INPUT",
    "Date/time must be a datetime-local value or an ISO instant with Z/offset",
  );
}

/**
 * Parse a strict datetime-local wall time in the business timezone, or a strict
 * ISO instant that carries an explicit `Z`/numeric offset.
 *
 * Never delegate a timezone-less string to the host runtime's Date parser.
 */
export function parseBusinessDateTime(
  value: string | undefined,
  fallback = new Date(),
  timeZone = BUSINESS_TIMEZONE,
): Date {
  if (value === undefined) return fallback;

  const localMatch = dateTimeLocalPattern.exec(value);
  if (localMatch) {
    const parts = {
      year: Number(localMatch[1]),
      month: Number(localMatch[2]),
      day: Number(localMatch[3]),
      hour: Number(localMatch[4]),
      minute: Number(localMatch[5]),
      second: Number(localMatch[6] ?? 0),
      millisecond: milliseconds(localMatch[7]),
    };
    if (!hasValidCalendarFields(parts)) invalidDateTime();
    return zonedDateTimeToInstant(parts, timeZone);
  }

  const instantMatch = explicitInstantPattern.exec(value);
  if (!instantMatch) invalidDateTime();
  const parts = {
    year: Number(instantMatch[1]),
    month: Number(instantMatch[2]),
    day: Number(instantMatch[3]),
    hour: Number(instantMatch[4]),
    minute: Number(instantMatch[5]),
    second: Number(instantMatch[6]),
    millisecond: milliseconds(instantMatch[7]),
  };
  if (!hasValidCalendarFields(parts)) invalidDateTime();

  if (instantMatch[8] === "Z") return new Date(utcTimestamp(parts));

  const offsetHour = Number(instantMatch[10]);
  const offsetMinute = Number(instantMatch[11]);
  if (offsetHour > 23 || offsetMinute > 59) invalidDateTime();
  const offsetDirection = instantMatch[9] === "+" ? 1 : -1;
  const offsetMilliseconds =
    offsetDirection * (offsetHour * 60 + offsetMinute) * 60_000;
  return new Date(utcTimestamp(parts) - offsetMilliseconds);
}

export function businessPeriodBounds(
  days: number,
  now = new Date(),
  timeZone = BUSINESS_TIMEZONE,
): { from: Date; to: Date } {
  if (!Number.isInteger(days) || days <= 0 || days > 3660) {
    throw new DomainError("INVALID_INPUT", "Invalid finance period");
  }

  const zone = validateBusinessTimeZone(timeZone);
  const current = partsAt(now, zone);
  const startCalendar = new Date(
    Date.UTC(current.year, current.month - 1, current.day - days),
  );
  const from = zonedDateTimeToInstant(
    {
      year: startCalendar.getUTCFullYear(),
      month: startCalendar.getUTCMonth() + 1,
      day: startCalendar.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0,
    },
    zone,
  );

  return { from, to: now };
}

export function businessMonthBounds(
  now = new Date(),
  timeZone = BUSINESS_TIMEZONE,
): { from: Date; to: Date } {
  const zone = validateBusinessTimeZone(timeZone);
  const current = partsAt(now, zone);
  const from = zonedDateTimeToInstant(
    {
      year: current.year,
      month: current.month,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
    },
    zone,
  );
  const nextMonth = new Date(Date.UTC(current.year, current.month, 1));
  const to = zonedDateTimeToInstant(
    {
      year: nextMonth.getUTCFullYear(),
      month: nextMonth.getUTCMonth() + 1,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
    },
    zone,
  );
  return { from, to };
}
