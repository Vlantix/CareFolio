import { NextResponse, type NextRequest } from "next/server";
import { getAuthState } from "@/lib/auth";
import { PATIENT_COOKIE, getMyPatients } from "@/lib/patients";

// Notification links look like /switch?patient=<id>&to=/records: open the
// page for THAT patient, so a caregiver with two patients lands on the
// right list. Only patients this user may see can be chosen, and only
// these destinations are allowed (no open redirect).
const DESTINATIONS = new Set(["/records", "/requests", "/home", "/summary"]);

export async function GET(request: NextRequest) {
  const { mfa } = await getAuthState();
  if (!mfa) return NextResponse.redirect(new URL("/verify", request.url));

  const patient = request.nextUrl.searchParams.get("patient") ?? "";
  const to = request.nextUrl.searchParams.get("to") ?? "/home";
  const target = new URL(DESTINATIONS.has(to) ? to : "/home", request.url);
  const response = NextResponse.redirect(target);

  if ((await getMyPatients()).some((p) => p.id === patient)) {
    response.cookies.set(PATIENT_COOKIE, patient, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}
