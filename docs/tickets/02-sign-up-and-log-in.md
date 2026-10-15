# 02 — Connected to Supabase: sign up and log in

**What to build:** a patient or caregiver can create an account, log in
with email and password, and see their own name on Home, read from the
database.

**Blocked by:** 01

**Status:** todo

- [ ] Supabase URL and publishable (anon) key are set locally and in
      Vercel, with no service-role key anywhere
- [ ] The profiles table exists with Row Level Security on: you read
      only your own row, and admins read all
- [ ] Signing up creates the profile automatically, as patient or
      caregiver but never as admin
- [ ] Only admins can change a profile's role, enforced by the database
- [ ] The database change is saved as a numbered SQL file in the repo
- [ ] Sign up screen matches its design: full name, email, password, and
      "I am the patient / a caregiver"
- [ ] Log in screen matches its design, with a clear message for a wrong
      email or password
- [ ] After logging in, Home greets the user by name, and logging out
      works
- [ ] Logged-out visitors are sent to the login page
- [ ] Works on the live URL
