-- 004 — email-code limits, wrong-code lockout, device sessions,
-- in-app notifications and the audit log (phase 3).
--
-- Run AFTER 003: Supabase -> SQL Editor -> paste -> Run.
--
-- Pattern used here: the tables have RLS ON and NO write policies, so the
-- browser/API can't write to them at all. Changes happen only through
-- the "security definer" functions below. Each one acts ONLY on the
-- logged-in user (auth.uid()) and writes its own audit row. No
-- service-role key needed.

-- 1. Audit log ---------------------------------------------------------

create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text        not null,          -- e.g. 'auth.otp_sent'
  patient_id  uuid,                          -- FK added with the patients table (ticket 04)
  entity      text,
  entity_id   text,
  details     jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

create policy "admins read the audit log"
  on public.audit_logs for select
  to authenticated
  using ((select public.passed_email_code()) and (select public.is_admin()));

-- No insert/update/delete policies: nobody writes or edits rows directly.

-- Internal: only the functions in this file call it. NOT callable from
-- the app, so nobody can forge audit rows.
create or replace function public.log_event(
  p_action text,
  p_entity text default null,
  p_entity_id text default null,
  p_details jsonb default '{}'::jsonb,
  p_patient_id uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, entity, entity_id, details, patient_id)
  values ((select auth.uid()), p_action, p_entity, p_entity_id, coalesce(p_details, '{}'::jsonb), p_patient_id);
$$;
revoke execute on function public.log_event(text, text, text, jsonb, uuid) from public, anon, authenticated;

-- 2. Email-code attempts (never stores the code itself) ----------------

create table public.otp_attempts (
  id          bigint generated always as identity primary key,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('sent', 'failed', 'passed', 'unlocked')),
  created_at  timestamptz not null default now()
);
create index otp_attempts_profile_time on public.otp_attempts (profile_id, created_at desc);

alter table public.otp_attempts enable row level security;
-- No policies at all: invisible to the app. Functions below only.

-- When is this user's code entry locked until? (null = not locked)
-- Rule: 5 wrong codes within 15 minutes (since the last success or
-- admin unlock) locks code entry until 15 minutes after the last one.
create or replace function public.otp_locked_until()
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  since timestamptz;
  fails int;
  last_fail timestamptz;
begin
  if uid is null then return null; end if;

  select greatest(coalesce(max(created_at), '-infinity'), now() - interval '15 minutes')
    into since
    from public.otp_attempts
   where profile_id = uid and kind in ('passed', 'unlocked');

  select count(*), max(created_at) into fails, last_fail
    from public.otp_attempts
   where profile_id = uid and kind = 'failed' and created_at > since;

  if fails >= 5 and last_fail + interval '15 minutes' > now() then
    return last_fail + interval '15 minutes';
  end if;
  return null;
end;
$$;

-- Call BEFORE sending a code. Returns seconds to wait (0 = go ahead,
-- and the send is recorded). Limits: 1 per 60 s, 5 per hour.
create or replace function public.otp_send_check()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  last_sent timestamptz;
  hour_count int;
  oldest_in_hour timestamptz;
begin
  if uid is null then raise exception 'Not logged in'; end if;

  select max(created_at) into last_sent
    from public.otp_attempts where profile_id = uid and kind = 'sent';
  if last_sent > now() - interval '60 seconds' then
    return ceil(extract(epoch from (last_sent + interval '60 seconds' - now())))::int;
  end if;

  select count(*), min(created_at) into hour_count, oldest_in_hour
    from public.otp_attempts
   where profile_id = uid and kind = 'sent' and created_at > now() - interval '1 hour';
  if hour_count >= 5 then
    return ceil(extract(epoch from (oldest_in_hour + interval '1 hour' - now())))::int;
  end if;

  insert into public.otp_attempts (profile_id, kind) values (uid, 'sent');
  perform public.log_event('auth.otp_sent', 'profile', uid::text);
  return 0;
end;
$$;

-- Call after a WRONG code. Returns the lock time if this locked it.
create or replace function public.otp_note_failed()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  locked timestamptz;
begin
  if uid is null then raise exception 'Not logged in'; end if;
  insert into public.otp_attempts (profile_id, kind) values (uid, 'failed');
  perform public.log_event('auth.otp_failed', 'profile', uid::text);
  locked := public.otp_locked_until();
  if locked is not null then
    perform public.log_event('auth.locked', 'profile', uid::text,
      jsonb_build_object('locked_until', locked));
  end if;
  return locked;
end;
$$;

-- 3. Device sessions -----------------------------------------------------

create table public.user_sessions (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  device_label  text not null,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  revoked_at    timestamptz
);
create index user_sessions_profile on public.user_sessions (profile_id, last_seen_at desc);

alter table public.user_sessions enable row level security;

create policy "read own sessions"
  on public.user_sessions for select
  to authenticated
  using ((select public.passed_email_code()) and profile_id = (select auth.uid()));

-- 4. In-app notifications ------------------------------------------------

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  body        text not null,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_profile on public.notifications (profile_id, created_at desc);

alter table public.notifications enable row level security;

create policy "read own notifications"
  on public.notifications for select
  to authenticated
  using ((select public.passed_email_code()) and profile_id = (select auth.uid()));

-- Called right after a CORRECT code: records the success (clears the
-- wrong-code count), starts a device session, posts the new-login
-- notice. Returns the session id that goes into the cf_mfa cookie.
create or replace function public.start_session(p_device_label text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  label text := left(coalesce(nullif(trim(p_device_label), ''), 'Unknown device'), 80);
  sid uuid;
begin
  if uid is null or not public.passed_email_code() then
    raise exception 'Email code required';
  end if;

  insert into public.otp_attempts (profile_id, kind) values (uid, 'passed');
  insert into public.user_sessions (profile_id, device_label)
    values (uid, label) returning id into sid;

  insert into public.notifications (profile_id, title, body, link)
  values (
    uid,
    'New login',
    'New login on ' || label || ' at '
      || to_char(now() at time zone 'Asia/Manila', 'Mon FMDD, FMHH12:MI AM')
      || '. Not you? Log out other devices.',
    '/profile/sessions'
  );

  perform public.log_event('auth.otp_passed', 'user_session', sid::text,
    jsonb_build_object('device', label));
  return sid;
end;
$$;

-- Marks "still here", at most once every 5 minutes.
create or replace function public.touch_session(p_session_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.user_sessions
     set last_seen_at = now()
   where id = p_session_id
     and profile_id = (select auth.uid())
     and revoked_at is null
     and last_seen_at < now() - interval '5 minutes';
$$;

-- Log out one of YOUR devices.
create or replace function public.revoke_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.user_sessions
     set revoked_at = now()
   where id = p_session_id
     and profile_id = (select auth.uid())
     and revoked_at is null;
  if found then
    perform public.log_event('session.revoked', 'user_session', p_session_id::text);
  end if;
end;
$$;

-- Log out all YOUR devices except this one. Returns how many.
create or replace function public.revoke_other_sessions(p_keep uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  with gone as (
    update public.user_sessions
       set revoked_at = now()
     where profile_id = (select auth.uid())
       and id <> p_keep
       and revoked_at is null
    returning id
  )
  select count(*) into n from gone;
  if n > 0 then
    perform public.log_event('session.revoked', 'user_session', null,
      jsonb_build_object('others', n, 'kept', p_keep));
  end if;
  return n;
end;
$$;

create or replace function public.mark_notification_read(p_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
     set read_at = now()
   where id = p_id and profile_id = (select auth.uid()) and read_at is null;
$$;

-- Only logged-in users may call the app-facing functions.
revoke execute on function public.otp_locked_until() from public, anon;
revoke execute on function public.otp_send_check() from public, anon;
revoke execute on function public.otp_note_failed() from public, anon;
revoke execute on function public.start_session(text) from public, anon;
revoke execute on function public.touch_session(uuid) from public, anon;
revoke execute on function public.revoke_session(uuid) from public, anon;
revoke execute on function public.revoke_other_sessions(uuid) from public, anon;
revoke execute on function public.mark_notification_read(uuid) from public, anon;
grant execute on function public.otp_locked_until() to authenticated;
grant execute on function public.otp_send_check() to authenticated;
grant execute on function public.otp_note_failed() to authenticated;
grant execute on function public.start_session(text) to authenticated;
grant execute on function public.touch_session(uuid) to authenticated;
grant execute on function public.revoke_session(uuid) to authenticated;
grant execute on function public.revoke_other_sessions(uuid) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;

-- Known limit (accepted): Supabase's own verify endpoint can be called
-- directly, outside this lockout. Supabase rate-limits it per IP and
-- codes expire; full protection needs Supabase MFA (docs/LATER.md).
