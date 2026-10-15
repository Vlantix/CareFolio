# 06b — Sharing and extras (phase 6)

**What to build:** share a summary with a doctor by QR, let anyone check
a document's code, request corrections, manage family access, and set
reminders.

**Blocked by:** 05b

**Status:** todo

- [ ] supabase/sql/009-sharing-and-extras.sql has been run
- [ ] /share: choose sections, 30 min / 2 h / 24 h, optional 4-digit
      code; QR + live countdown + Copy link + Revoke; active links with
      access log; audit share.created / share.revoked
- [ ] Only the token's SHA-256 hash is stored; the link is shown once
- [ ] /s/<token> opens without login, shows only chosen sections with
      "Shared by …, read-only, expires …", watermark "Viewed via shared
      link · <time>", blurs like the protected view; noindex + no-store
- [ ] Expired/revoked link -> friendly page; access code asked first,
      locked after 5 wrong tries; each view logged and the owner
      notified "Your summary was viewed"
- [ ] /verify-document: real code -> Authentic + type, masked name,
      facility, release date; unknown code -> "No document found";
      rate-limited per IP
- [ ] /corrections/new: kind, record, details; admins notified; audited;
      page says users can't edit records
- [ ] /family: people with access + permissions; invite by email
      (pending); patient approves in-app; remove access; all audited
- [ ] /reminders: three toggles; add / edit / delete; "Coming up"; due
      within 24 h -> in-app notification once
- [ ] Matches design/MShare, MDoctorView, MVerifyDoc, MCorrection,
      MFamily, MReminders at 390px and 1280px
- [ ] Works on the live URL
