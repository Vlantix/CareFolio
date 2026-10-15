-- 002 — profiles: one row per login account (ticket 02).
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Safe to run once. Running it twice will fail on "already exists".

-- 1. Who someone is -------------------------------------------------

create type public.user_role as enum ('patient', 'caregiver', 'admin');

create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  email             text        not null,
  full_name         text        not null,
  phone             text,
  birthdate         date,
  -- Optional hint typed at sign-up; the records office uses it to find
  -- the right patient when linking the account (ticket 04).
  hospital_no       text,
  role              public.user_role not null default 'patient',
  terms_accepted_at timestamptz,
  created_at        timestamptz not null default now()
);

-- 2. Helper: is the logged-in user an admin? -------------------------
--
-- "security definer" runs this with the function owner's rights, so it
-- can read profiles even though RLS would normally hide other rows.
-- It only ever answers yes/no about the CURRENT user.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- 3. Row Level Security ----------------------------------------------

alter table public.profiles enable row level security;

create policy "read own profile, admins read all"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "update own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Deliberately NO insert or delete policy: rows are created by the
-- trigger below, and nobody deletes them through the API.

-- 4. Only admins may change role (and nobody changes id or email) -----
--
-- RLS decides WHICH rows you can update, not WHICH COLUMNS. Without
-- this trigger a patient could update their own row to role = 'admin'.
-- auth.uid() is null when you run SQL in the dashboard, which is how
-- you make the first admin by hand.

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Only admins can change a role';
    end if;
    if new.id is distinct from old.id or new.email is distinct from old.email then
      raise exception 'id and email cannot be changed here';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- 5. Create the profile automatically at sign-up ---------------------
--
-- The sign-up form sends full_name, phone, birthdate, hospital_no and
-- role as user metadata. Anyone can put anything in metadata, so the
-- role is limited to patient or caregiver here: never admin.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, email, full_name, phone, birthdate, hospital_no, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(meta ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    nullif(trim(meta ->> 'phone'), ''),
    case when meta ->> 'birthdate' ~ '^\d{4}-\d{2}-\d{2}$'
         then (meta ->> 'birthdate')::date end,
    nullif(trim(meta ->> 'hospital_no'), ''),
    case when meta ->> 'role' = 'caregiver'
         then 'caregiver'::public.user_role
         else 'patient'::public.user_role end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6. Making an admin (by hand, never from the app) --------------------
--
-- Sign up normally on the live site, then run this with that email:
--
--   update public.profiles set role = 'admin' where email = 'staff@example.com';
