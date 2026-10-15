# Later

Good ideas that are not in the MVP.

Parking something here is a decision, not a loss. It is how the MVP
stays small enough to actually ship by Session 3.


## Parked during /grill-with-docs

- Record types beyond lab results: medical certificate, prescription
  copy, discharge summary, medical abstract
- Caregivers linking themselves, in-app consent forms, per-caregiver
  permission toggles (can request / view / share), revoking access
- Share links with QR codes and access codes, doctor view, and the
  public "verify a document" page
- Health summary: medications, allergies, diagnoses, lab values
- Reminders (appointments, refills, labs), the notifications inbox
- Correction requests
- Admin audit page, reports, account approval with ID upload and OCR
- Urgent requests and working-day due dates
- Account lockout after failed logins, multi-device session management
- Screenshot blur and the diagonal watermark on document views

## Parked during /to-spec

- A separate records list / timeline screen (for now, released results
  open from My requests)
- The loading screen, the 3-step guide and the splash animation
- Adding new patient records from the app (demo patients come from SQL)

## Parked during ticket 02/03 (phase 2 prompt)

- ID scanner on sign-up: camera capture, tesseract.js OCR, pre-fill,
  upload to a private ids bucket (no "Add a photo of your valid ID"
  button until then)
- Lockout after 5 wrong codes (otp_attempts, locked_until) — to be done
  with a security definer function, never the service role
- user_sessions table: device labels, revoking a device on logout
- /loading and /welcome onboarding screens
- Audit rows for login events (account.created, auth.otp_passed,
  admin.login) — the audit_logs table arrives in ticket 04

## Parked during /code-review

- Supabase built-in MFA (aal2), so a stolen mailbox alone can't log in
  (today the database requires the email code, but not the password too)
- Phase 3 hardening: our own send limits (5 codes/hour), 5-wrong-codes
  lockout, device sessions page, new-login notifications, 15-minute
  idle auto-lock
