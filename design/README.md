# CareFolio design screens

Each HTML file is the source of one approved screen. Match its layout, colors, spacing, wording and animation exactly.

## Login
- Email + password, then a 6-digit email OTP code on every login. There is NO face recognition, passkey or PIN login anywhere in this system.

## Protected view
- MDocView.html / DDocView.html: documents blur (with an overlay) when the window loses focus, the tab is hidden, Print Screen or a screenshot shortcut is pressed, or printing starts. Every view carries a diagonal watermark with the viewer's name, masked email and time. Read the renderVals()/componentDidMount logic for the event handling.

## Admin access
- DAdminLogin.html is the records-office login at /admin/login. It is reached ONLY by typing the URL: never link to it from any patient or caregiver screen, menu, footer, sitemap or robots.txt.

## Brand
- brand/logo-original.jpg — the official logo (navy background #0E293C).
- brand/logo-mark.png — the icon only. Use for favicon, app icon, headers.
- brand/logo-word.png — the white 'carefolio' wordmark, for dark backgrounds only.
- brand/logo-full.png — mark + wordmark lockup on navy.
- On light backgrounds, write the wordmark as live text 'carefolio' (lowercase) next to the mark.

## Motion
- Splash.html / DSplash.html: the opening animation when someone first opens the site.
- Every other screen enters with a 0.4s fade + 10px rise (class cf-enter). All motion is disabled under prefers-reduced-motion.

## Screens
| File | Screen | Size |
|---|---|---|
| Splash.html | M0 · Splash (opening animation) | mobile 390×844 |
| Main.html | M1 · Log in | mobile 390×844 |
| Otp.html | M2 · Email OTP verification | mobile 390×844 |
| Loading.html | M3 · Loading | mobile 390×844 |
| Guide1.html | M4 · Guide 1 — Request | mobile 390×844 |
| Guide2.html | M5 · Guide 2 — Track | mobile 390×844 |
| Guide3.html | M6 · Guide 3 — Share | mobile 390×844 |
| Terms.html | M7 · Terms & conditions | mobile 390×844 |
| Home.html | M8 · Home | mobile 390×844 |
| DSplash.html | D0 · Splash (opening animation) | desktop, responsive |
| DLogin.html | D1 · Log in | desktop, responsive |
| DVerify.html | D2 · Email OTP verification | desktop, responsive |
| DLoading.html | D3 · Loading | desktop, responsive |
| DGuide.html | D4 · Guide (steps 1–3, click Next) | desktop, responsive |
| DTerms.html | D5 · Terms & conditions | desktop, responsive |
| DHome.html | D6 · Dashboard | desktop, responsive |
| DDocView.html | D8 · Protected document view | desktop, responsive |
| MSignup.html | M9 · Sign up | mobile 390×844 |
| MNewRequest.html | M10 · New document request | mobile 390×844 |
| MRequests.html | M11 · Request tracking | mobile 390×844 |
| MNotifications.html | M12 · Notifications | mobile 390×844 |
| MRecords.html | M13 · Records timeline + download | mobile 390×844 |
| MDocView.html | M21 · Protected document view (blurs on Alt+Tab / Print Screen) | mobile 390×844 |
| MSummary.html | M14 · One-page summary | mobile 390×844 |
| MShare.html | M15 · Secure QR sharing | mobile 390×844 |
| MDoctorView.html | M16 · Doctor’s shared view | mobile 390×844 |
| MVerifyDoc.html | M17 · Verify document code | mobile 390×844 |
| MCorrection.html | M18 · Correction request | mobile 390×844 |
| MFamily.html | M19 · Family access | mobile 390×844 |
| MReminders.html | M20 · Reminders | mobile 390×844 |
| DSignup.html | D7 · Sign up | desktop, responsive |
| DAdminLogin.html | A0 · Staff login — URL only (/admin/login) | desktop, responsive |
| AQueue.html | A1 · Admin — Request queue | desktop, responsive |
| AReview.html | A2 · Admin — Verify, decide, release | desktop, responsive |
| ARecords.html | A3 · Admin — Manage patient records | desktop, responsive |
| ACorrections.html | A4 · Admin — Correction requests | desktop, responsive |
| AAudit.html | A5 · Admin — Audit trail | desktop, responsive |
| AReports.html | A6 · Admin — Reports | desktop, responsive |
| AAccounts.html | A7 · Admin — Accounts & registrations | desktop, responsive |

## Notes for the developer
- These are design mockups, not production code. Rebuild them as React + Tailwind components; do not copy the inline styles verbatim.
- Ignore the support.js script, <x-dc>, <helmet>, <sc-if>, <sc-for> tags and the text/x-dc script block — they are canvas-editor markup. Treat <sc-if>/<sc-for> as conditionals/loops and read the renderVals() code for the intended state logic.
- Logos inside the HTML are embedded as base64 images; use the files in brand/ instead.
- Text in [brackets] is placeholder data that must come from the database.