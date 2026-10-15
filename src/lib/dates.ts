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
/** "October 2026" */
export const monthYear = fmt({ month: "long", year: "numeric" });
/** "Wednesday, October 14" */
export const longDay = fmt({ weekday: "long", month: "long", day: "numeric" });
/** "Oct 16, 2026, 3:42 PM" (medium date + short time) */
export const printedAt = fmt({ dateStyle: "medium", timeStyle: "short" });
/** "2026-10-16" — for comparing calendar days */
export const dayKey = (value: Date | string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(value));
/** Hour of the day in Manila, 0–23 */
export const hourNow = () =>
  Number(new Intl.DateTimeFormat("en-PH", { hour: "numeric", hour12: false, timeZone: TZ }).format(new Date()));
