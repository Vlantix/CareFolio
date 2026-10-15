import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";

export const SHARE_SECTIONS = {
  medications: "Current medications",
  allergies: "Allergies",
  labs: "Latest lab values",
  diagnoses: "Diagnoses",
} as const;
export type ShareSection = keyof typeof SHARE_SECTIONS;

export const SHARE_DURATIONS = { 30: "30 minutes", 120: "2 hours", 1440: "24 hours" } as const;

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

/** A new random link token (32 bytes) and the hash we store instead. */
export function newShareToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: sha256(token) };
}

/** What the database knows a token by. The token itself is never stored. */
export const hashToken = (token: string) => sha256(token);

/** The spoken access code, hashed together with its link's token hash. */
export const hashAccessCode = (tokenHash: string, code: string) => sha256(`${tokenHash}:${code}`);

/** Cookie that remembers a correct access code for one link. */
export const shareCodeCookie = (tokenHash: string) => `cf_share_${tokenHash.slice(0, 16)}`;

/** The public address of the site, for links and QR codes. */
export async function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  // Vercel provides the production address itself; prefer it over
  // request headers, which a caller could set.
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}
