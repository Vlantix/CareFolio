-- 003 — make the DATABASE require the email code, and lock profile columns.
--
-- Run AFTER 002-profiles.sql: Supabase -> SQL Editor -> paste -> Run.
--
-- Why: our app checks the email code with a cookie, but the database
-- can't see that cookie. Someone with only the password could log in to
-- Supabase directly (with the public anon key) and read whatever RLS
-- allows. Every login token says HOW the user logged in (the "amr"
-- claim). After the email code it contains "otp"; after a password
-- alone it only says "password". So policies check for "otp".
--
-- Accepted risk (written down on purpose): someone who controls the
-- user's MAILBOX could still request and use a code directly, without
-- the password. Fixing that needs Supabase's built-in MFA — see
-- docs/LATER.md.

-- 1. Helper: did this login pass the email code? ----------------------

create or replace function public.passed_email_code()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() -> 'amr') @> '[{"method": "otp"}]'::jsonb,
    false
  );
$$;

-- 2. Profiles: only readable/updatable after the email code ------------

drop policy if exists "read own profile, admins read all" on public.profiles;
drop policy if exists "update own profile" on public.profiles;

create policy "read own profile, admins read all"
  on public.profiles for select
  to authenticated
  using (
    (select public.passed_email_code())
    and (id = (select auth.uid()) or (select public.is_admin()))
  );

create policy "update own profile"
  on public.profiles for update
  to authenticated
  using ((select public.passed_email_code()) and id = (select auth.uid()))
  with check ((select public.passed_email_code()) and id = (select auth.uid()));

-- 3. Users may change only their name, and accept the terms once -------
--
-- Replaces the 002 version. Admins (and the SQL editor, where
-- auth.uid() is null) can still change anything.

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or public.is_admin() then
    return new;
  end if;

  if new.id          is distinct from old.id
  or new.email       is distinct from old.email
  or new.role        is distinct from old.role
  or new.phone       is distinct from old.phone
  or new.birthdate   is distinct from old.birthdate
  or new.hospital_no is distinct from old.hospital_no
  or new.created_at  is distinct from old.created_at then
    raise exception 'Only your name can be changed here';
  end if;

  -- Terms: can go from "not accepted" to "accepted now", nothing else.
  if new.terms_accepted_at is distinct from old.terms_accepted_at then
    if old.terms_accepted_at is not null or new.terms_accepted_at is null then
      raise exception 'Terms acceptance cannot be changed';
    end if;
    new.terms_accepted_at := now();
  end if;

  return new;
end;
$$;

-- 4. Rule for every table added from now on (tickets 04-07) -----------
--
-- Every policy on patient data must include:
--     (select public.passed_email_code()) and ...
