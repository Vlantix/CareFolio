-- 013 — CareFolio sends and checks its own login codes (via Resend).
--
-- Run AFTER 012: Supabase -> SQL Editor -> paste -> Run.
--
-- Before: Supabase created the 6-digit code, emailed it, and checked it;
-- the database trusted Supabase's "this login used a code" marker.
-- Now: our server creates the code and emails it with Resend. Only a
-- HASH of the code is stored here (never the code), for 10 minutes, tied
-- to the exact login (session) that asked for it. A correct code creates
-- the device session — and that live device session is what every RLS
-- policy checks (passed_email_code). Limits and lockout are unchanged.

-- 1. Code hashes (no client access) ----------------------------------

create table public.login_codes (
  id              bigint generated always as identity primary key,
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  auth_session_id uuid not null,
  code_hash       text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  expires_at      timestamptz not null,
  used_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index login_codes_lookup on public.login_codes (profile_id, auth_session_id, created_at desc);
alter table public.login_codes enable row level security;
-- No policies: only the two functions below touch it.

-- 2. Issue a code ------------------------------------------------------
-- The server generated the code and sends us its hash. Returns seconds
-- to wait if a send limit is hit (0 = stored; now email it), or -1 if
-- code entry is locked after too many wrong codes.

create or replace function public.issue_login_code(p_code_hash text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  auth_sid uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  wait int;
begin
  if uid is null or auth_sid is null then raise exception 'Not logged in'; end if;
  if public.otp_locked_until() is not null then return -1; end if;
  wait := public.otp_send_check();          -- 1 a minute, 5 an hour; audits 'auth.otp_sent'
  if wait > 0 then return wait; end if;

  -- Only the newest code for this login works.
  update public.login_codes set used_at = now()
   where profile_id = uid and auth_session_id = auth_sid and used_at is null;
  insert into public.login_codes (profile_id, auth_session_id, code_hash, expires_at)
  values (uid, auth_sid, p_code_hash, now() + interval '10 minutes');

  delete from public.login_codes where created_at < now() - interval '1 day';
  return 0;
end;
$$;

-- 3. Check a code --------------------------------------------------------
-- Returns { status: ok | wrong | expired | locked, session_id?, locked_until? }.
-- A correct code starts the device session (and the "New login" notice).

create or replace function public.verify_login_code(p_code_hash text, p_device_label text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  auth_sid uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  label text := left(coalesce(nullif(trim(p_device_label), ''), 'Unknown device'), 80);
  locked timestamptz;
  c public.login_codes;
  sid uuid;
begin
  if uid is null or auth_sid is null then raise exception 'Not logged in'; end if;

  -- Counts this attempt first, one at a time per user (race-proof lockout).
  locked := public.otp_begin_verify();
  if locked is not null then
    return jsonb_build_object('status', 'locked', 'locked_until', locked);
  end if;

  select * into c from public.login_codes
   where profile_id = uid and auth_session_id = auth_sid and used_at is null
   order by created_at desc limit 1;
  if c.id is null or c.expires_at <= now() then
    return jsonb_build_object('status', 'expired');
  end if;
  if c.code_hash is distinct from p_code_hash then
    locked := public.otp_note_failed();     -- audits 'auth.otp_failed' (+ 'auth.locked')
    if locked is not null then
      return jsonb_build_object('status', 'locked', 'locked_until', locked);
    end if;
    return jsonb_build_object('status', 'wrong');
  end if;

  update public.login_codes set used_at = now() where id = c.id;
  insert into public.otp_attempts (profile_id, kind) values (uid, 'passed');   -- resets the count
  insert into public.user_sessions (profile_id, device_label, auth_session_id)
    values (uid, label, auth_sid) returning id into sid;

  insert into public.notifications (profile_id, title, body, link, kind)
  values (uid, 'New login',
          'New login on ' || label || ' at '
            || to_char(now() at time zone 'Asia/Manila', 'Mon FMDD, FMHH12:MI AM')
            || '. Not you? Log out other devices.',
          '/profile/sessions', 'new_login');
  perform public.log_event('auth.otp_passed', 'user_session', sid::text,
    jsonb_build_object('device', label));
  return jsonb_build_object('status', 'ok', 'session_id', sid);
end;
$$;

-- 4. The gate every RLS policy uses ------------------------------------
-- "Passed the email code on this device": this login has a live device
-- session — which only verify_login_code creates, after a correct code.

create or replace function public.passed_email_code()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_sessions s
     where s.profile_id = (select auth.uid())
       and s.auth_session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
       and s.revoked_at is null
       and s.created_at > now() - interval '12 hours'
  );
$$;

revoke execute on function public.issue_login_code(text) from public, anon;
revoke execute on function public.verify_login_code(text, text) from public, anon;
grant execute on function public.issue_login_code(text) to authenticated;
grant execute on function public.verify_login_code(text, text) to authenticated;

-- Supabase's own code emails are no longer used for log in. You can turn
-- the Send Email hook off, or keep it only for password-reset links.
