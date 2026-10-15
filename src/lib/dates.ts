// All dates on screen are shown in Philippine time. One place for the
// formats, so they can't drift apart between pages.

const TZ = "Asia/Manila";

function fmt(options: Intl.DateTimeFormatOptions) {
  const f = new Intl.DateTimeFormat("en-PH", { ...options, timeZone: TZ });
  return (value: Date | string) => f.format(new Date(value));
}

/** "Oct 16" */
export const shortDate = fmt({ month: "short", day: "numeric" });
/** "3:42 PM" */
export const timeOfDay = fmt({ hour: "numeric", minute: "2-digit" });
/** "Oct 16, 2026, 3:42 PM" — watermarks and download stamps */
export const stampTime = fmt({ month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
/** "Oct 16, 3:42 PM" */
export const dayAndTime = fmt({ month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
/** "Oct 10, 2026" */
export const mediumDate = fmt({ dateStyle: "medium" });
/** "October 2026" */
export const monthYear = fmt({ month: "long", year: "numeric" });
/** "Wednesday, October 14" */
export const longDay = fmt({ weekday: "long", month: "long", day: "numeric" });
/** "Oct 16, 2026, 3:42 PM" (medium date + short time) */
export const printedAt = fmt({ dateStyle: "medium", timeStyle: "short" });
/** "2026-10-16" — for comparing calendar days */
export const dayKey = (value: Date | string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(value));
/** "OCT" */
export const monthShort = fmt({ month: "short" });
/** "05" */
export const dayTwoDigit = fmt({ day: "2-digit" });

/** Whole years since a birthdate (null if unknown). */
export function ageFrom(birthdate: string | null) {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) years--;
  return years;
}

/** "2026-10-15T10:00" in Manila time, for <input type="datetime-local">. */
export function manilaInputValue(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    hour12: false, timeZone: TZ,
  }).formatToParts(new Date(value));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour") === "24" ? "00" : get("hour")}:${get("minute")}`;
}

/** Hour of the day in Manila, 0–23 */
export const hourNow = () =>
  Number(new Intl.DateTimeFormat("en-PH", { hour: "numeric", hour12: false, timeZone: TZ }).format(new Date()));
