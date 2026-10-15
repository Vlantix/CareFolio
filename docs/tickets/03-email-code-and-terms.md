# 03 — Email code and terms

**What to build:** after the correct password, the user must type a
6-digit code sent to their email before they get in. On first login they
must accept the terms and data-privacy consent.

**Blocked by:** 02

**Status:** todo

**Risk:** Supabase has no built-in "emailed code as a second step". If
this ticket runs past about 30 minutes, stop, ship email and password
only, and come back to it after ticket 07.

- [ ] After the password step, a 6-digit code is emailed
- [ ] The app cannot be reached with the password alone; the code is
      required
- [ ] The Email code screen matches its design, including a wrong-code
      message and "resend code"
- [ ] The Terms screen matches its design and appears only until the
      user agrees
- [ ] Agreeing saves the date on the user's profile
- [ ] Works on the live URL
