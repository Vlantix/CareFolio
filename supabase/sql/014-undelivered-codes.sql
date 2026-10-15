-- 014 — A code that was never emailed doesn't count.
--
-- Run AFTER 013: Supabase -> SQL Editor -> paste -> Run.
--
-- Before: if the email service refused to send, the code stayed active
-- and the send still counted against the limits (1 a minute, 5 an hour),
-- so a broken email setting locked people out for an hour.
-- Now: the server calls this right after a failed send. It switches that
-- code off and gives the send back. Only a code made in the last 2
-- minutes, for this exact login, can be discarded.

create or replace function public.discard_login_code(p_code_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  auth_sid uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  found_id bigint;
begin
  if uid is null or auth_sid is null then raise exception 'Not logged in'; end if;

  update public.login_codes set used_at = now()
   where profile_id = uid and auth_session_id = auth_sid
     and code_hash = p_code_hash and used_at is null
     and created_at > now() - interval '2 minutes'
  returning id into found_id;
  if found_id is null then return; end if;

  -- Give back the send that otp_send_check counted.
  delete from public.otp_attempts
   where id = (select id from public.otp_attempts
                where profile_id = uid and kind = 'sent'
                  and created_at > now() - interval '2 minutes'
                order by created_at desc limit 1);
  perform public.log_event('auth.otp_send_failed', 'profile', uid::text);
end;
$$;

revoke execute on function public.discard_login_code(text) from public, anon;
grant execute on function public.discard_login_code(text) to authenticated;
