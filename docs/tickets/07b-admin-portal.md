# 07b — Records office portal (phase 7)

**What to build:** the staff side: request queue, review and release,
patient records, corrections, audit trail, reports and accounts.

**Blocked by:** 06b

**Status:** todo

- [ ] supabase/sql/011-admin-portal.sql has been run
- [ ] /admin: due today, overdue, urgent and new-registration cards;
      search + status + type filters; sorted by deadline with a live
      countdown; overdue rows highlighted; URGENT badge
- [ ] /admin/requests/[id]: checklist; Approve / Ask for info (question
      required) / Decline (reason required, shown to the user)
- [ ] Release: PDF uploaded, CF-XXXX-XXXX code (no 0/O/1/I) stamped on
      every page with "Verify at …/verify-document"; document created and
      request released; button disabled until all checks + patient
      confirmation are ticked
- [ ] /admin/patients: search; tabs Documents, Medications, Allergies,
      Diagnoses, Lab values with add / edit / remove; last updated + by
- [ ] /admin/corrections: list + detail comparing current record vs
      report; Fix record; Mark corrected; Reject needs a note; requester
      notified
- [ ] /admin/audit: filters (dates, action, staff, patient), Export CSV;
      edits show old -> new values
- [ ] /admin/reports: this month, avg processing time, overdue, % on
      time, requests per week (SVG), avg days per type
- [ ] /admin/accounts: pending registrations -> Verify & activate (link
      or create patient by hospital no.) / Reject with reason; record
      caregiver consent for patients without a login; staff roles
- [ ] Usable on a tablet; matches design/AQueue, AReview, ARecords,
      ACorrections, AAudit, AReports, AAccounts at 1280px
- [ ] Works on the live URL
