# 03b — Code limits, lockout, devices and auto-lock

**What to build:** login is harder to abuse. Codes are rate-limited,
wrong codes lock code entry for a while, each login is a device the user
can see and log out, a new login shows a notice, and an idle app logs
itself out. (Added by the team as "phase 3".)

**Blocked by:** 03

**Status:** todo

- [ ] supabase/sql/004-otp-limits-sessions-audit.sql has been run
- [ ] Asking for codes too fast shows a friendly wait message with the
      time left (1 a minute, 5 an hour)
- [ ] 5 wrong codes lock code entry; /verify shows when it unlocks
- [ ] After the code, Home shows "New login on <device> at <time>" with a
      link to Devices, and it can be dismissed
- [ ] Devices lists each login with "This device" marked; Log out on
      another device ends it within a minute; "Log out all other devices"
      works
- [ ] After 14 idle minutes a warning appears; Stay logged in keeps you
      in; at 15 minutes you're logged out with a notice (app and staff)
- [ ] Audit rows exist for auth.otp_sent, auth.otp_failed, auth.locked,
      auth.otp_passed and session.revoked
- [ ] Works on the live URL
