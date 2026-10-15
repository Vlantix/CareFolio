-- 006 — database access follows the DEVICE, not just the login token.
--
-- Run AFTER 005: Supabase -> SQL Editor -> paste -> Run.
--
-- Why: until now, logging out a device on the Devices page only marked
-- our user_sessions row. That device's Supabase login still worked, and
-- RLS only asked "did this login pass the email code?" — so the device
-- could keep reading data through the public API. Now every policy that
-- uses passed_email_code() also needs that device's session to be live:
-- not logged out, and less than 12 hours old.
--
-- Effect on existing logins: sessions started before this file have no
-- link to their Supabase login, so those users simply enter a new code.

-- 1. Link each device session to its Supabase login --------------------

alter table public.user_sessions
  add column if not exists auth_session_id uuid;
create index if not exists user_sessions_auth_session on public.user_sessions (auth_session_id);

-- 2. Two checks --------------------------------------------------------

-- (a) Token only: did THIS login pass the email code? Used only by
--     start_session(), which is what creates the device session.
create or replace function public.token_has_email_code()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'amr') @> '[{"method": "otp"}]'::jsonb, false);
$$;

-- (b) The real gate, used by every RLS policy: the email code was passed
--     AND this device's session is still live. Security definer so it
--     can look at user_sessions without going through RLS (which itself
--     calls this function).
create or replace function public.passed_email_code()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.token_has_email_code()
     and exists (
       select 1 from public.user_sessions s
        where s.profile_id = (select auth.uid())
          and s.auth_session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
          and s.revoked_at is null
          and s.created_at > now() - interval '12 hours'
     );
$$;

-- 3. Start a device session: remember which Supabase login it is ------

create or replace function public.start_session(p_device_label text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  label text := left(coalesce(nullif(trim(p_device_label), ''), 'Unknown device'), 80);
  auth_sid uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  sid uuid;
begin
  if uid is null or auth_sid is null or not public.token_has_email_code() then
    raise exception 'Email code required';
  end if;

  insert into public.otp_attempts (profile_id, kind) values (uid, 'passed');
  insert into public.user_sessions (profile_id, device_label, auth_session_id)
    values (uid, label, auth_sid) returning id into sid;

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

-- 4. Device and notice actions now need a live, verified device --------
--    (Before, a password alone was enough to log the owner's devices out
--    or dismiss their "New login" warning.)

create or replace function public.touch_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.passed_email_code() then return; end if;
  update public.user_sessions
     set last_seen_at = now()
   where id = p_session_id
     and profile_id = (select auth.uid())
     and revoked_at is null
     and last_seen_at < now() - interval '5 minutes';
end;
$$;

create or replace function public.revoke_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.passed_email_code() then
    raise exception 'Email code required';
  end if;
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

create or replace function public.revoke_other_sessions(p_keep uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  if not public.passed_email_code() then
    raise exception 'Email code required';
  end if;
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
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.passed_email_code() then
    raise exception 'Email code required';
  end if;
  update public.notifications
     set read_at = now()
   where id = p_id and profile_id = (select auth.uid()) and read_at is null;
end;
$$;

-- 5. Race-proof wrong-code lockout ------------------------------------
--
-- Before: check the lock, verify, THEN record a failure — so several
-- codes sent at the same instant could all slip past the check. Now
-- every attempt is counted BEFORE verifying, one at a time per user
-- (advisory lock). A correct code then records 'passed', which resets
-- the count.

alter table public.otp_attempts drop constraint if exists otp_attempts_kind_check;
alter table public.otp_attempts
  add constraint otp_attempts_kind_check
  check (kind in ('sent', 'failed', 'passed', 'unlocked', 'attempt'));

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
  tries int;
  last_try timestamptz;
begin
  if uid is null then return null; end if;

  select greatest(coalesce(max(created_at), '-infinity'), now() - interval '15 minutes')
    into since
    from public.otp_attempts
   where profile_id = uid and kind in ('passed', 'unlocked');

  select count(*), max(created_at) into tries, last_try
    from public.otp_attempts
   where profile_id = uid and kind in ('attempt', 'failed') and created_at > since;

  if tries >= 5 and last_try + interval '15 minutes' > now() then
    return last_try + interval '15 minutes';
  end if;
  return null;
end;
$$;

-- Call BEFORE verifying a code. Returns the lock time if locked (then
-- don't verify); otherwise counts this attempt and returns null.
create or replace function public.otp_begin_verify()
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
  -- One verify at a time per user, so parallel submissions queue up.
  perform pg_advisory_xact_lock(hashtext('otp:' || uid::text));
  locked := public.otp_locked_until();
  if locked is not null then return locked; end if;
  insert into public.otp_attempts (profile_id, kind) values (uid, 'attempt');
  return null;
end;
$$;

-- Call after a WRONG code: audit it, and say if that locked the account.
-- (The attempt itself was already counted by otp_begin_verify.)
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
  perform public.log_event('auth.otp_failed', 'profile', uid::text);
  locked := public.otp_locked_until();
  if locked is not null then
    perform public.log_event('auth.locked', 'profile', uid::text,
      jsonb_build_object('locked_until', locked));
  end if;
  return locked;
end;
$$;

revoke execute on function public.token_has_email_code() from public, anon;
revoke execute on function public.otp_begin_verify() from public, anon;
grant execute on function public.token_has_email_code() to authenticated;
grant execute on function public.otp_begin_verify() to authenticated;
