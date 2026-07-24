import {
  BUSINESS_TIMEZONE,
  parseBusinessDateTime,
} from "@perfume-aura/db";

const businessDateFormatter = new Intl.DateTimeFormat("en-PK", {
  dateStyle: "medium",
  timeZone: BUSINESS_TIMEZONE,
});

const businessDateTimeFormatter = new Intl.DateTimeFormat("en-PK", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: BUSINESS_TIMEZONE,
});

function instant(value: Date | string): Date {
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    // A PostgreSQL DATE is already a business-calendar date. Convert business
    // noon to an instant before formatting so no host timezone participates.
    return parseBusinessDateTime(
      `${value}T12:00`,
      new Date(0),
      BUSINESS_TIMEZONE,
    );
  }
  return parseBusinessDateTime(value, new Date(0), BUSINESS_TIMEZONE);
}

export function formatBusinessDate(value: Date | string): string {
  return businessDateFormatter.format(instant(value));
}

export function formatBusinessDateTime(value: Date | string): string {
  return businessDateTimeFormatter.format(instant(value));
}
