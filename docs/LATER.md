# Later

Good ideas that are not in the MVP.

Parking something here is a decision, not a loss. It is how the MVP
stays small enough to actually ship by Session 3.


## Parked during /grill-with-docs

- Editing per-caregiver permission toggles (can request / view / share)
- ID photo upload and OCR at sign-up (staff check ID in person for now)
- Separate staff roles (super admin / records officer / viewer)

## Parked during /to-spec

- Adding new patient records from the app (demo patients come from SQL)

## Parked during ticket 02/03 (phase 2 prompt)

- ID scanner on sign-up: camera capture, tesseract.js OCR, pre-fill,
  upload to a private ids bucket (no "Add a photo of your valid ID"
  button until then)
- Audit rows for account.created and admin.login (the otp, lock and
  session events are logged since phase 3)
- PDFs over 4 MB (would need direct-to-storage upload)

## Parked during /code-review

- Supabase built-in MFA (aal2), so a stolen mailbox alone can't log in
  (today the database requires the email code, but not the password too)

## Parked during the second /code-review

- Original design copy for the welcome guide and terms section 4 (five
  document types, timeline filters, QR sharing, protected viewer,
  caregiver invites) — restore when those features ship
- Real hospital name (src/lib/facility.ts) and Data Protection Officer
  contact (DPO_CONTACT) — needed before any real user signs up

## Still parked after phase 5

