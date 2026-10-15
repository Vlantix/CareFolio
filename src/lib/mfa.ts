import { SignJWT, jwtVerify } from "jose";

// The "cf_mfa" cookie is our proof that this browser passed the emailed
// 6-digit code. Supabase's own session only proves the password, so
// without this cookie the app sends you back to /verify.
//
// It is a small JWT (a signed token) holding the user's id and the id of
// this device's row in user_sessions (so a device can be logged out
// remotely from the Sessions page). It is signed
// with VERIFY_COOKIE_SECRET, which lives only on the server — so nobody
// can make a valid one in their browser. httpOnly means page JavaScript
// can't read it either.
//
// Server-only: imported by proxy.ts and server actions, never by a
// "use client" file. The secret is not a NEXT_PUBLIC_ variable, so it
// never reaches the browser.

export const MFA_COOKIE = "cf_mfa";
const TWELVE_HOURS = 12 * 60 * 60;

function secret() {
  const value = process.env.VERIFY_COOKIE_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "VERIFY_COOKIE_SECRET is missing or too short. Add a random value of " +
        "at least 32 characters to .env.local AND to Vercel — see .env.example.",
    );
  }
  return new TextEncoder().encode(value);
}

export async function createMfaToken(userId: string, sessionId: string) {
  return new SignJWT({ purpose: "mfa", sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${TWELVE_HOURS}s`)
    .sign(secret());
}

/**
 * The device session id inside a genuine, unexpired token for this same
 * user — or null. Callers must still check that session isn't revoked.
 */
export async function readMfaToken(token: string | undefined, userId: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (payload.sub !== userId || payload.purpose !== "mfa") return null;
    return typeof payload.sid === "string" ? payload.sid : null;
  } catch {
    return null;
  }
}

/** A device session counts if it exists, isn't revoked and is < 12 h old. */
export function isSessionLive(
  session: { created_at: string; revoked_at: string | null } | null,
) {
  return (
    !!session &&
    !session.revoked_at &&
    Date.now() - new Date(session.created_at).getTime() < TWELVE_HOURS * 1000
  );
}

export const mfaCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: TWELVE_HOURS,
};

// Remembers, for the few minutes between password and code, that this
// login started on the staff page. Lets /verify send staff to /admin
// without ever putting "admin" in a URL a patient could see.
export const PORTAL_COOKIE = "cf_portal";
export const portalCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 15 * 60,
};
