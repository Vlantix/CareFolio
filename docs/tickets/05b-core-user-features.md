# 05b — Core user features (phase 5)

**What to build:** the patient/caregiver app around real records: patient
switcher, requests with status tracking, notifications, a records
timeline, a health summary, and the protected document viewer.

**Blocked by:** 03c

**Status:** todo

- [ ] supabase/sql/007-patients-records-requests.sql has been run, and a
      test account is activated and linked (SQL at the end of that file)
- [ ] Pending accounts see "The records office is checking your ID" and
      cannot submit requests; rejected accounts see the reason
- [ ] A caregiver linked to two patients can switch between them; each
      page shows only the chosen patient's data
- [ ] Home: greeting, switcher, "At the doctor?" card, active requests,
      medications, lab values, bell with unread count
- [ ] New request: type chips, test/date, facility, purpose, urgent +
      reason; preview date matches the saved due date; audit
      'request.created'
- [ ] Requests: Active / Released / Declined tabs, 5-step bar, due date,
      decline reason, reply box when info is requested
- [ ] Status changes and releases create notifications automatically;
      the bell updates live (or on returning to the tab)
- [ ] Records: grouped by month, search and filters work, verification
      code shown; View and Download write audit rows
- [ ] Downloaded PDFs carry "Downloaded by <name> · <time> · CareFolio"
      on every page
- [ ] Protected view blurs on Alt+Tab, tab switch, Print Screen, Ctrl+P;
      watermark shows name, masked email and time; right-click and drag
      are blocked; 'document.hidden' audited at most once a minute
- [ ] Summary prints one clean watermarked page only via its own button
- [ ] Matches design/Home, DHome, MNewRequest, MRequests, MNotifications,
      MRecords, MDocView, DDocView, MSummary at 390px and 1280px
- [ ] Works on the live URL
