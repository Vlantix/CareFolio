# 05 — Request a lab result

**What to build:** a linked patient or caregiver requests an official
lab result and follows its status.

**Blocked by:** 04

**Status:** todo

- [ ] The requests table exists with Row Level Security on, and codes
      are numbered automatically (REQ-0001, REQ-0002…)
- [ ] A user can only create requests for patients they are linked to,
      as themselves, with status "submitted"
- [ ] Only admins can change a request
- [ ] The New request screen matches its design: choose the patient (if
      more than one), lab test, test date and purpose
- [ ] The My requests screen matches its design, showing each code and a
      status chip
- [ ] Home shows the latest requests and a "Request a lab result" button
- [ ] Submitting writes an audit row
- [ ] Database changes are saved as numbered SQL files in the repo
- [ ] Works on the live URL
