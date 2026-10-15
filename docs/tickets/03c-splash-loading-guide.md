# 03c — Splash, page transitions, loading, guide and terms

**What to build:** the first-run experience from the designs: an
opening animation, a loading screen that reflects real work, a 3-step
guide, and terms with privacy consent. (Added by the team as "phase 4".)

**Blocked by:** 03b

**Status:** todo

- [ ] supabase/sql/005-onboarding-and-consent.sql has been run
- [ ] First visit in a browser session shows the splash (mark spins in,
      wordmark wipes in, tagline, bar fills), then the page underneath;
      a reload in the same session does not show it again
- [ ] With "reduce motion" on, the splash is a still logo for 0.6 s and
      pages don't animate
- [ ] Every page enters with a short fade and rise
- [ ] After the email code: /loading ticks 4 lines, then goes to the
      guide (first time), terms, Home — or /admin for staff
- [ ] Guide: 3 steps, "1 of 4" progress, Back/Next, no skip; focus moves
      to the heading; finishing goes to Terms and is never shown again
- [ ] Terms: 6 sections; button disabled until both boxes are ticked;
      agreeing saves terms + privacy consent dates and an audit row
      'terms.accepted'; "Decline and log out" logs out
- [ ] Matches design/Splash, DSplash, Loading, DLoading, Guide1-3, DGuide,
      Terms, DTerms at 390px and 1280px
- [ ] Works on the live URL
