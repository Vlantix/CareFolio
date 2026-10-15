-- 015 — Every login account has a profile.
--
-- Run AFTER 014: Supabase -> SQL Editor -> paste -> Run.
-- Safe to run again: it only adds what is missing.
--
-- Before: some accounts in auth.users had no row in public.profiles
-- (made before 002's sign-up trigger existed). Sending them a login code
-- failed with 23503, because otp_attempts and login_codes point at
-- profiles(id).
-- Now: those accounts get a profile, filled the same way the sign-up
-- trigger fills one, and the trigger is re-created so every new sign-up
-- gets one too.
--
-- To see who is missing a profile (before or after running this):
--
--   select u.id, u.email, u.created_at
--     from auth.users u
--     left join public.profiles p on p.id = u.id
--    where p.id is null;

-- 1. The sign-up trigger (same as 002, but never fails on a repeat) ---

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
    -- Never admin from metadata: only patient or caregiver.
    case when meta ->> 'role' = 'caregiver'
         then 'caregiver'::public.user_role
         else 'patient'::public.user_role end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Backfill the accounts that have no profile yet --------------------
-- Existing profiles are never touched. Accounts without an email (none
-- in CareFolio: sign-up is by email) are skipped, since email is required.

insert into public.profiles (id, email, full_name, phone, birthdate, hospital_no, role)
select
  u.id,
  u.email,
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1)),
  nullif(trim(u.raw_user_meta_data ->> 'phone'), ''),
  case when u.raw_user_meta_data ->> 'birthdate' ~ '^\d{4}-\d{2}-\d{2}$'
       then (u.raw_user_meta_data ->> 'birthdate')::date end,
  nullif(trim(u.raw_user_meta_data ->> 'hospital_no'), ''),
  case when u.raw_user_meta_data ->> 'role' = 'caregiver'
       then 'caregiver'::public.user_role
       else 'patient'::public.user_role end
from auth.users u
where u.email is not null
  and not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
