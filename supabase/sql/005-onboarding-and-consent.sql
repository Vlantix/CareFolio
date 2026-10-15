-- 005 — onboarding guide and privacy consent (phase 4).
--
-- Run AFTER 004: Supabase -> SQL Editor -> paste -> Run.

-- 1. New profile columns ----------------------------------------------

alter table public.profiles
  add column if not exists onboarded_at       timestamptz,
  add column if not exists privacy_consent_at timestamptz;

-- 2. Column guard (replaces the 003 version) ----------------------------
--
-- Non-admins may change only their name. The three "done once" dates
-- (guide finished, terms accepted, privacy consent) can only go from
-- empty to "now" — never back, never a made-up date.

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

  if new.terms_accepted_at is distinct from old.terms_accepted_at then
    if old.terms_accepted_at is not null or new.terms_accepted_at is null then
      raise exception 'Terms acceptance cannot be changed';
    end if;
    new.terms_accepted_at := now();
  end if;

  if new.privacy_consent_at is distinct from old.privacy_consent_at then
    if old.privacy_consent_at is not null or new.privacy_consent_at is null then
      raise exception 'Privacy consent cannot be changed';
    end if;
    new.privacy_consent_at := now();
  end if;

  if new.onboarded_at is distinct from old.onboarded_at then
    if old.onboarded_at is not null or new.onboarded_at is null then
      raise exception 'Onboarding date cannot be changed';
    end if;
    new.onboarded_at := now();
  end if;

  return new;
end;
$$;

-- 3. Actions with their audit rows --------------------------------------

-- Finished the 3-step guide.
create or replace function public.finish_onboarding()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null or not public.passed_email_code() then
    raise exception 'Email code required';
  end if;
  update public.profiles set onboarded_at = now()
   where id = uid and onboarded_at is null;
  if found then
    perform public.log_event('onboarding.finished', 'profile', uid::text);
  end if;
end;
$$;

-- Accepted the Terms of Use AND consented to processing of health data.
create or replace function public.accept_terms()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null or not public.passed_email_code() then
    raise exception 'Email code required';
  end if;
  update public.profiles
     set terms_accepted_at  = coalesce(terms_accepted_at, now()),
         privacy_consent_at = coalesce(privacy_consent_at, now())
   where id = uid
     and (terms_accepted_at is null or privacy_consent_at is null);
  if found then
    perform public.log_event('terms.accepted', 'profile', uid::text);
  end if;
end;
$$;

revoke execute on function public.finish_onboarding() from public, anon;
revoke execute on function public.accept_terms() from public, anon;
grant execute on function public.finish_onboarding() to authenticated;
grant execute on function public.accept_terms() to authenticated;
