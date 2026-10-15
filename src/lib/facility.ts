/**
 * The one partner hospital (docs/SPEC.md). The designs show
 * "[Partner facility]". Set NEXT_PUBLIC_FACILITY_NAME (in .env.local and
 * Vercel) to the real name once a records office has agreed to take part.
 * It is not a secret, so NEXT_PUBLIC_ is fine.
 */
export const FACILITY_NAME =
  process.env.NEXT_PUBLIC_FACILITY_NAME || "the partner hospital";

/**
 * Data Protection Officer contact shown in the terms (Data Privacy Act,
 * RA 10173). PLACEHOLDER — replace with the hospital's real DPO email
 * before any real user signs up.
 */
export const DPO_CONTACT = "[DPO email]";
