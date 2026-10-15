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
- Correction requests
- Admin audit page, reports, account approval with ID upload and OCR
- Urgent requests and working-day due dates
- Screenshot blur and the diagonal watermark on document views

## Parked during /to-spec

- A separate records list / timeline screen (for now, released results
  open from My requests)
- Adding new patient records from the app (demo patients come from SQL)

## Parked during ticket 02/03 (phase 2 prompt)

- ID scanner on sign-up: camera capture, tesseract.js OCR, pre-fill,
  upload to a private ids bucket (no "Add a photo of your valid ID"
  button until then)
- Audit rows for account.created and admin.login (the otp, lock and
  session events are logged since phase 3)
- Admin "Unlock" button for a locked account (phase 7.5)
- Reminders (appointments, refills, labs) and a full notifications inbox
  (today only the new-login notice shows on Home)

## Parked during /code-review

- Supabase built-in MFA (aal2), so a stolen mailbox alone can't log in
  (today the database requires the email code, but not the password too)

## Parked during the second /code-review

- Original design copy for the welcome guide and terms section 4 (five
  document types, timeline filters, QR sharing, protected viewer,
  caregiver invites) — restore when those features ship
- Real hospital name (src/lib/facility.ts) and Data Protection Officer
  contact (DPO_CONTACT) — needed before any real user signs up
