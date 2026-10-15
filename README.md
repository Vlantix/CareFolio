# CareFolio

**Live URL:** https://hackathon-f1-forge.vercel.app

Patients and family caregivers request, view, download and share
**official** health records from one partner hospital — no trip, no
queue. The hospital's records office reviews requests, releases the
official PDFs and manages records.

Built at the PHINMA AI Builder Workshop with Next.js (App Router,
TypeScript), Tailwind CSS, Supabase (hosted) and Vercel.

- What we're building and why: [`docs/PROBLEM.md`](docs/PROBLEM.md), [`docs/SPEC.md`](docs/SPEC.md)
- Work broken into tickets: [`docs/tickets/`](docs/tickets/)
- Ideas parked for later: [`docs/LATER.md`](docs/LATER.md)
- Rules for the coding agent: [`CLAUDE.md`](CLAUDE.md)
- Approved screen designs: [`design/`](design/)

---

## Setup

You need Node.js 20+, a free [Supabase](https://supabase.com) project and
a [Vercel](https://vercel.com) account. Nothing runs locally except the
Next.js app — no Docker, no local database.

### 1. Install

```bash
git clone https://github.com/Vlantix/hackathon.git
cd hackathon
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill it in. Add the **same
values** in Vercel → your project → Settings → Environment Variables,
then redeploy. `.env.local` is git-ignored — never commit it.

| Variable | Secret? | What it is | Where to get it |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | No | Your Supabase project address | Supabase → Connect |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | The **publishable** key (`sb_publishable_…`, or the older "anon" key). Safe in the browser — Row Level Security protects the data | Supabase → Connect |
| `VERIFY_COOKIE_SECRET` | **Yes** — server only | Signs the "passed the email code" cookie. At least 32 random characters | `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `NEXT_PUBLIC_SITE_URL` | No | The live address, used in share-link QR codes and the stamp on released PDFs | e.g. `https://hackathon-f1-forge.vercel.app` |
| `NEXT_PUBLIC_FACILITY_NAME` | No | The partner hospital's name shown on screens | e.g. `Partner Hospital` |
| `GMAIL_USER` | No (server only) | The team Gmail that sends login codes. Free, reaches any inbox (~500/day). Used when set | e.g. `carefolio.codes@gmail.com` |
| `GMAIL_APP_PASSWORD` | **Yes** — server only | 16-letter App Password for that Gmail (needs 2-Step Verification) | myaccount.google.com/apppasswords |
| `RESEND_API_KEY` | **Yes** — server only | Alternative sender (used only if the Gmail pair isn't set) | Resend → API Keys ("Sending access" is enough) |
| `RESEND_FROM_EMAIL` | No (server only) | Sender address. On `…@resend.dev`, Resend only delivers to the Resend account owner's email — verify a domain to email anyone | e.g. `codes@yourdomain.com` |
| `SEND_EMAIL_HOOK_SECRET` | **Yes** — server only | Optional. Only if reset-link emails go through the Send Email Hook | Shown when you create the hook (step 4) |

**Never** add the Supabase `service_role` key or any `sb_secret_…` key to
this project — they bypass Row Level Security. CareFolio doesn't need
them: privileged database work is done by `security definer` functions
with their own checks.

### 3. Database

In Supabase → SQL Editor, run each file in `supabase/sql/` **in number
order**, one at a time (paste → Run):

| File | What it adds |
|---|---|
| `001-example.sql` | Nothing (an example, fully commented out) |
| `002-profiles.sql` | Accounts (profiles) and roles |
| `003-require-email-code.sql` | The database requires the email code |
| `004-otp-limits-sessions-audit.sql` | Code limits, lockout, device sessions, notifications, audit log |
| `005-onboarding-and-consent.sql` | Welcome guide and privacy consent |
| `006-device-bound-access.sql` | Logged-out devices lose database access |
| `007-patients-records-requests.sql` | Patients, caregivers, records, requests, file storage, **demo patients** |
| `008-review-fixes.sql` | Released-only files, notification fixes |
| `009-sharing-and-extras.sql` | Share by QR, document verification, corrections, family access, reminders |
| `010-phase6-review-fixes.sql` | Sharing ends when access ends, privacy trims |
| `011-admin-portal.sql` | Records office portal, change audit |
| `012-extras.sql` | Profile, data rights, unlock, staff alerts, walk-ins, facility suggestions |
| `013-own-email-codes.sql` | CareFolio makes, emails (Gmail/Resend) and checks its own login codes |

All demo data is **fake**. Never put real patient data in a demo.

### 4. Supabase Authentication settings

- **Sign In / Providers → Email:** turn **Confirm email** OFF.
- **URL Configuration:** Site URL = your live URL; add
  `<live URL>/auth/callback` and `http://localhost:3000/auth/callback`
  to Redirect URLs (used by "Forgot password").
- **Login codes need no Supabase email setup.** After the password,
  our server makes a 6-digit code (valid 10 minutes), stores only its
  hash, and emails it through **Gmail** (`GMAIL_USER` +
  `GMAIL_APP_PASSWORD`) or, if those aren't set, **Resend**. Refused
  emails show their reason in Vercel → Logs (`sendCode: email not sent`).
- **Hooks → Send Email hook (optional, password reset only):** URL
  `<live URL>/api/auth/send-email`, secret in `SEND_EMAIL_HOOK_SECRET`.
  Leave it off and Supabase sends reset links itself.

### 5. Make the first staff account

Sign up normally on the site, then in the SQL Editor:

```sql
update public.profiles set role = 'admin', status = 'active' where email = 'you@example.com';
```

Staff log in at **`/admin/login`** — typed by hand; it is not linked
from anywhere. Other staff are added later from **Accounts** in the
portal.

### 6. Run it

```bash
npm run dev      # http://localhost:3000
npm run build    # exactly what Vercel runs — fix every error before pushing
npm run lint
```

Every push to `main` deploys to Vercel.

---

## How it fits together

- **Login:** email + password, then a 6-digit code emailed every time
  (the only second factor). A signed, httpOnly `cf_mfa` cookie proves the
  code was passed on this device; the database also requires it.
- **Access:** Row Level Security on every table. Patient data is readable
  only through `can_access_patient()` — staff, the patient, or a
  caregiver the patient (or records office) consented to.
- **Records:** patients and caregivers only request, view, download and
  share. Only the records office adds or changes records.
- **Audit:** every action on patient data writes `audit_logs`; staff
  edits are recorded by database triggers with old → new values.
- **Files:** private storage; viewed and downloaded copies are stamped
  with who opened them; released PDFs carry a verification code anyone
  can check at `/verify-document`.
- **Security headers** on every page: no framing, no MIME sniffing, a
  strict referrer policy, and microphone/location turned off.

## When something breaks

- **Works locally but not on Vercel:** run `npm run build` locally, and
  check the Vercel environment variables (then redeploy).
- **No login code arrives:** check spam; then Vercel → Logs for
  "send-email hook". "Testing emails to your own email address" means the
  sender is still `…@resend.dev` — use the Resend account's own email, or
  verify a domain in Resend.
- **"Profile missing" / empty screens after login:** a SQL file in
  `supabase/sql/` hasn't been run, or was run out of order.
- **`npm audit` warnings:** they're in the development toolchain only —
  ignore them; the "fix" breaks the project.
