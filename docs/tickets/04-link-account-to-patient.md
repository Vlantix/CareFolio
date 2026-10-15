# 04 — Records office links an account to a patient

**What to build:** a records-office admin links a new account to a
patient record as "self" or "caregiver". The linked user then sees that
patient on Home. Until then they see that they are waiting for the
records office.

**Blocked by:** 02

**Status:** todo

- [ ] The patients, patient_links and audit_logs tables exist, each with
      Row Level Security on and explicit policies
- [ ] Fake demo patients are added by SQL (Ramon Santos, H-0001, plus at
      least two more). No real patient data.
- [ ] An admin is set by hand in the Supabase dashboard, with the steps
      written down for the team
- [ ] The Link accounts screen lists accounts that are not yet linked,
      and the admin links one by hospital number and relationship
- [ ] Only admins can create links, enforced by the database
- [ ] Linking writes an audit row; audit rows can't be edited or
      deleted, and only admins can read them
- [ ] Home shows the user's linked patients, or the "waiting" message if
      there are none
- [ ] An account that is not linked cannot read any patient
- [ ] Database changes are saved as numbered SQL files in the repo
- [ ] Works on the live URL
