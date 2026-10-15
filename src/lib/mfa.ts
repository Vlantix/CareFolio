import { SignJWT, jwtVerify } from "jose";

// The "cf_mfa" cookie is our proof that this browser passed the emailed
// 6-digit code. Supabase's own session only proves the password, so
// without this cookie the app sends you back to /verify.
//
// It is a small JWT (a signed token) holding the user's id. It is signed
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

export async function createMfaToken(userId: string) {
  return new SignJWT({ purpose: "mfa" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${TWELVE_HOURS}s`)
    .sign(secret());
}

/** True only if the token is genuine, unexpired, and for this same user. */
export async function isMfaTokenValid(token: string | undefined, userId: string) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return payload.sub === userId && payload.purpose === "mfa";
  } catch {
    return false;
  }
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
