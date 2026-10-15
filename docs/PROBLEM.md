# CareFolio

## Who
Patients of one partner hospital, and the family caregivers (sons,
daughters, siblings) who request records on their behalf. Many of the
patients are elderly. A caregiver can only act for a patient once the
hospital's records office has linked them.

The records office (admin) is a minimal supporting role: it approves
requests, attaches the official file, and links caregivers to patients.

**Team decision, recorded as a risk:** the MVP serves both patients and
caregivers, not one user type. To keep this small, caregivers cannot
link themselves to a patient. The records office creates every link, and
caregivers see the same screens as patients.

## The struggle
A team member's mother lost her paper prescription and lab result. When
she asked the hospital for another copy, she was told to file a formal
request and wait. Instead she redid the lab test. That meant paying for
the test again, paying the fare again and queuing again.

## Today's workaround
Go to the records office in person, file a paper request, wait several
days, then travel back to collect it. The alternative is to skip all
that and pay to redo the test. Either way it costs fare money, queue
time and stress, and the cost falls hardest on elderly patients and the
family members who take them.

## The MVP
A patient, or a caregiver linked to them, requests an official lab
result online. The records office approves it and attaches the official
PDF, which the requester then views and downloads on their phone with no
trip and no queue.

## How we'll know it worked
The demo shows the full loop in under three minutes: log in (email +
password + 6-digit email code) → request a lab result → the records
office approves it and attaches the PDF → the official copy appears on
the phone.

Before Session 3, it will be tried by the team member's mother and by
classmates' family members (sons, daughters, siblings, elderly
relatives), using **fake patients only**.

## Out of scope
- Record types other than lab results (medical certificate,
  prescription copy, discharge summary, medical abstract)
- Caregivers linking themselves, consent forms in the app, and
  per-caregiver permission toggles
- Share links and QR codes, the doctor view, and the public "verify a
  document" page
- Health summary (medications, allergies, diagnoses, lab values)
- Reminders, the notifications inbox and correction requests
- Admin audit page, reports, and account approval with ID upload and OCR
- Urgent requests and working-day deadlines
- Account lockout and multi-device session management
- Screenshot blur and watermark protection

## Constraints
- Login is email + password, then a 6-digit code emailed at every login.
- Only fake patient data is used. Health data is sensitive personal
  information under the Philippine Data Privacy Act (RA 10173).
- No Supabase service-role key anywhere in the project.
- Patients and caregivers never upload or edit records. Only the
  records office attaches official files.

## Glossary
- **Patient**: the person the record belongs to.
- **Caregiver**: a family member the records office has linked to a
  patient. They can request and view that patient's lab results.
- **Request**: a patient or caregiver asking for one official lab
  result. Its status moves from *submitted* to *approved* or *declined*,
  then to *released*.
- **Official copy**: a PDF attached by the records office. It is never
  uploaded by the patient.
- **Records office / admin**: hospital staff who approve requests,
  attach files and link caregivers to patients.
- **OTP**: the 6-digit one-time code emailed at every login.
