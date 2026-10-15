# Spec: CareFolio

## Problem
When a patient loses an official lab result, the partner hospital will
only give another copy after a formal request and a wait, which means
travelling, queuing and coming back. Many give up and pay to redo the
test. The cost falls hardest on elderly patients and on the family
caregivers who take them.

## Solution
A patient, or a caregiver linked to them, requests an official lab
result from their phone. The records office reviews the request,
approves it and attaches the official PDF. The requester then views and
downloads it, with no trip and no queue.

## The user
Patients of one partner hospital, and caregivers (family members) the
records office has linked to them. Both use the same screens. Caregivers
cannot link themselves to a patient.

The records office (admin) is a minimal supporting role. It reviews
requests, attaches official files and links accounts to patients.

**Recorded risk:** this serves two kinds of requester instead of one.
Keeping account linking with the records office is what keeps it small.

## User stories
1. As a patient or caregiver, I want to sign up and log in with my
   password and a code sent to my email, so that only I can see the
   records.
2. As a patient or caregiver, I want to request an official lab result
   online, so that I don't have to travel and queue at the records
   office.
3. As a patient or caregiver, I want to see the status of my requests,
   so that I know when the result is ready or why it was declined.
4. As a patient or caregiver, I want to view and download the released
   official PDF, so that I can show it to a doctor, employer or insurer.
5. As the records office, I want to see a queue of requests and approve
   or decline each one, so that requests are handled without paper
   forms.
6. As the records office, I want to attach the official PDF when I
   approve, so that the requester receives the real document.
7. As the records office, I want to link a new account to a patient
   record as *self* or *caregiver*, so that only the right people can
   request and see that patient's results.

## Screens
**Patient and caregiver (mobile first, also works on desktop)**
1. **Sign up**: choose patient or caregiver, then enter full name, date
   of birth, email, mobile number (09XXXXXXXXX), password and,
   optionally, the patient's hospital number. Home then says the records
   office will link your account.
2. **Log in**: enter email and password.
3. **Email code**: type the 6-digit code emailed to you.
4. **Forgot password**: enter your email to get a reset link; the link
   opens a page to choose a new password, then you log in again.
5. **Devices**: every device where you're logged in, with "This
   device" marked, a Log out button for each and "Log out all other
   devices".
6. **Loading**: right after the email code, a checklist that ticks as
   the account, session and records actually load, then moves on.
7. **Welcome guide**: first login only — 3 steps (request, track and
   download, show a doctor) with Back and Next and no skip.
8. **Terms**: shown at first login only, after the guide. Agree to the terms and the
   data-privacy consent to continue.
9. **Home**: see the patients you are linked to, your latest requests
   and their status, and a big "Request a lab result" button. If you
   are not linked to anyone yet, it says you are waiting for the records
   office.
10. **New request**: choose the patient (if there is more than one),
   enter the lab test and its date, pick the purpose, and submit.
11. **My requests**: each request with its code (REQ-0001) and status. A
   declined request shows the reason, and a released one has "View".
12. **Document view**: the official PDF with a Download button.

**Records office (desktop)**

13. **Request queue**: all requests, newest first, filterable by status.
14. **Review request**: see who asked and for which patient, then
    either decline (a reason is required) or approve and attach the PDF.
    Attaching it releases the result.
15. **Link accounts**: accounts not yet linked to anyone. Enter a
    hospital number, choose self or caregiver, and link.

Admins log in on a separate staff page, reached only by typing
/admin/login and never linked from anywhere. They pass the same email
code and land on the request queue. Anyone who isn't an admin gets an
ordinary "page not found" for every /admin address. The approved designs for each screen are in the design folder.

## Data
Row Level Security is ON for every table. No service-role key is used
anywhere. Admins are set by hand in the Supabase dashboard.

- **profiles**: id (the login account), email, full_name, phone,
  birthdate, hospital_no (optional hint for linking), role (patient,
  caregiver or admin), onboarded_at, terms_accepted_at,
  privacy_consent_at, created_at.
  - Read: your own row. Admins read all.
  - Write: created automatically at sign-up, and never as admin. You may
    update only your own name and terms date. Only admins can change
    `role`, and a database trigger enforces that.
- **patients**: id, hospital_no (unique), full_name, birthdate, sex,
  profile_id (the patient's own login, if any).
  - Read: via `can_access_patient()` — admins, the patient themself, or
    an active caregiver link with can_view. Write: admins only.
- **caregiver_links**: patient_id, caregiver_id, relationship, consent_at,
  status (pending / active / revoked), can_request, can_view, can_share.
  - Read: your own links; admins all. Write: admins only.
- **documents**: patient_id, type, title, facility, doctor, record_date,
  file_path, verification_code (CF-XXXX-XXXX), released_at, created_by.
  - Read: released documents of patients you can access. Write: admins.
  - Files live in the private `documents` bucket; users only get them
    through our server routes (60-second signed link for viewing; a
    stamped copy for downloading).
- **medications, allergies, diagnoses, lab_values**: patient_id, the
  fields shown in the design, record_date, source, updated_at/by.
  - Read: patients you can access. Write: admins only.
- **requests**: code (REQ-0001), patient_id, requester_id, doc_type,
  detail, purpose, is_urgent + urgent_reason, status (submitted /
  under_review / info_requested / approved / released / declined),
  due_at (3 working days, or end of today if urgent), info_question,
  info_reply, decline_reason, document_id.
  - Read: patients you can access. Create: only through
    `create_request()` (active account + permission to request). Reply
    to a question: `reply_to_info_request()`. Everything else: admins.
- **notifications**: written by database triggers when a request's
  status changes or a document is released (and on each new login).
- **profiles.status**: pending until the records office checks the ID;
  requests are only possible once active.
- **audit_logs**: actor_id, action, patient_id, entity, entity_id,
  details, created_at.
  - Read: admins only.
  - Write: only through a database function. Nobody can edit or delete
    rows.
  - Every action that touches patient data adds a row: submitting a
    request, approving, declining, releasing, viewing or downloading a
    document, and linking an account.

**File storage:** a private `documents` bucket, with files stored as
`<patient id>/<file>.pdf`. Only admins upload. Linked accounts open a
file only through a short-lived download link.

## Login
Yes, accounts are needed: these are health records. We use Supabase
Auth with email and password, then a 6-digit code emailed at every
login. The terms screen follows on first login.

**Enforced in the database too:** every RLS policy on patient data
requires a login that passed the email code (`passed_email_code()`), so
a password alone can't read anything through the API.

**Login protections (team decision, phase 3):** at most 1 code a
minute and 5 an hour per account; 5 wrong codes lock code entry for 15
minutes; each login is a device session that can be logged out from
the Devices screen; every login posts a "New login on <device>" notice
on Home; 15 minutes without input logs you out (warning at 14). Login
events are written to audit_logs.

**Device-bound access:** the database lets a login read data only while
its device session is live — logging a device out on the Devices page
cuts its database access too, not just the app's. Staff have the same
Devices page and new-login notice in the records-office area.

**Accepted risk:** someone who controls a user's mailbox could request
and use a code without the password. Closing that needs Supabase's
built-in MFA (parked in LATER.md).

**Email delivery:** codes are sent by Supabase through Resend (custom
SMTP), the team's chosen email vendor.

**Risk:** Supabase does not offer an emailed code as a second step out
of the box, so it has to be built. If it takes more than about 30
minutes, ship email and password first and add the code afterwards.

## Done for the demo
On the LIVE URL:
- [ ] A new person can sign up, log in with password and email code, and
      accept the terms.
- [ ] An admin can link that account to a fake patient (e.g. Ramon
      Santos, H-0001) as self or caregiver.
- [ ] The linked account can request a lab result and sees it as
      "submitted".
- [ ] The admin sees it in the queue, attaches a PDF and releases it.
- [ ] The requester sees "released", opens the PDF and downloads it.
- [ ] Declining with a reason shows that reason to the requester.
- [ ] An account that is not linked cannot see any patient or document.
- [ ] Every table has RLS on, and every action above wrote an audit row.
- [ ] Usable on a phone at 360px wide and on a desktop.
- [ ] Only fake patient data is used.

## Out of scope
Agreed with the team in phases 3-5, these are now IN scope: all five
record types, the records timeline, health summary, notifications page,
urgent requests with working-day due dates, the protected view
(blur + watermark), and in phase 6: share links with QR codes, the
doctor's shared view, public document verification, correction
requests, family access with consent, and reminders. Still out of
scope:
- ID photo upload and OCR
- Caregivers linking themselves without an invite; editing caregiver
  permissions (the records office sets them)
- Admin audit page, reports, adding patients from the app

## Decisions to revisit
- Shared links: a public page reads them through a database function
  (no service-role key). The verify page's per-IP limit relies on the
  address our server passes in; an overall cap backs it up.
- Reminders are personal notes: users write them directly (RLS: own
  rows only) and they are not audited.
- Request status notices go to the requester only; document releases go
  to everyone who can view the patient.
- Any caregiver allowed to request for a patient can answer the records
  office's question on that patient's request.
