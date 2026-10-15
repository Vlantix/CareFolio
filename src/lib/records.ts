// Shared by server and browser: names and rules for records and requests.

export const DOC_TYPES = {
  lab_result: "Lab result",
  medical_certificate: "Medical certificate",
  medical_abstract: "Medical abstract",
  prescription_copy: "Prescription copy",
  discharge_summary: "Discharge summary",
} as const;
export type DocType = keyof typeof DOC_TYPES;

export const PURPOSES = [
  "Follow-up check-up",
  "Specialist referral",
  "Work / school",
  "Insurance",
  "Personal copy",
] as const;

/** The six request statuses (supabase/sql/007). */
export type RequestStatus =
  | "submitted"
  | "under_review"
  | "info_requested"
  | "approved"
  | "released"
  | "declined";

/**
 * Which of the 5 progress segments are filled for a status
 * (Submitted → Under review → Info/Approved → Preparing → Released).
 */
export function progressSteps(status: RequestStatus): { done: number; current: number | null } {
  switch (status) {
    case "submitted":
      return { done: 1, current: null };
    case "under_review":
      return { done: 1, current: 1 };
    case "info_requested":
      return { done: 2, current: 2 };
    case "approved":
      return { done: 3, current: 3 };
    case "released":
      return { done: 5, current: null };
    case "declined":
      return { done: 0, current: null };
  }
}

/**
 * Expected release — the SAME rule as the database trigger
 * set_request_due(): 3 working days (Mon–Fri, Philippine time), or the
 * end of today when urgent. Used only as a preview on the form; the
 * database sets the real due date.
 */
export function expectedRelease(from: Date, urgent: boolean): Date {
  if (urgent) return from;
  const d = new Date(from);
  let added = 0;
  while (added < 3) {
    d.setUTCDate(d.getUTCDate() + 1);
    const weekday = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "Asia/Manila",
    }).format(d);
    if (weekday !== "Sat" && weekday !== "Sun") added++;
  }
  return d;
}

/**
 * "Latest lab values": the newest result for each test. Expects rows
 * already ordered newest first.
 */
export function latestPerTest<T extends { test_name: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((r) => !seen.has(r.test_name) && seen.add(r.test_name));
}

export { shortDate } from "@/lib/dates";
