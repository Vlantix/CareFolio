-- 012 — privacy and account extras (phase 7.5).
--
-- Run AFTER 011: Supabase -> SQL Editor -> paste -> Run.

-- 1. Profile: phone is yours to edit; NAME changes go through the
--    records office (it must match the ID) -----------------------------

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

  if new.id            is distinct from old.id
  or new.email         is distinct from old.email
  or new.full_name     is distinct from old.full_name
  or new.role          is distinct from old.role
  or new.status        is distinct from old.status
  or new.reject_reason is distinct from old.reject_reason
  or new.birthdate     is distinct from old.birthdate
  or new.hospital_no   is distinct from old.hospital_no
  or new.created_at    is distinct from old.created_at then
    raise exception 'Only your phone number can be changed here';
  end if;
  if new.phone is distinct from old.phone and new.phone !~ '^09\d{9}$' then
    raise exception 'Phone must look like 09XXXXXXXXX';
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

-- Requests to the records office about the ACCOUNT (not records):
-- a name change, or deleting the account.
create table public.account_requests (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references public.profiles (id) on delete set null,
  kind        text not null check (kind in ('name_change', 'deletion')),
  new_value   text check (length(new_value) <= 100),
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note  text check (length(admin_note) <= 300),
  -- Kept after the account is gone, so staff can see what was done.
  requester_label text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null
);
alter table public.account_requests enable row level security;
create policy "read own account requests" on public.account_requests for select to authenticated
  using ((select public.passed_email_code())
         and (profile_id = (select auth.uid()) or (select public.is_admin())));
-- Writes only through the functions below.

create or replace function public.request_account_change(p_kind text, p_new_value text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.profiles;
begin
  if not public.passed_email_code() then raise exception 'Email code required'; end if;
  if p_kind not in ('name_change', 'deletion') then raise exception 'Invalid request'; end if;
  select * into me from public.profiles where id = (select auth.uid());
  if me.role = 'admin' then raise exception 'Staff accounts are managed by another admin'; end if;
  if p_kind = 'name_change' and length(trim(coalesce(p_new_value, ''))) not between 2 and 100 then
    raise exception 'Enter the full name as shown on your ID';
  end if;
  if exists (select 1 from public.account_requests
              where profile_id = me.id and kind = p_kind and status = 'pending') then
    raise exception 'You already have a pending request of this kind';
  end if;
  insert into public.account_requests (profile_id, kind, new_value, requester_label)
  values (me.id, p_kind, nullif(trim(p_new_value), ''), me.full_name || ' <' || me.email || '>');
  insert into public.notifications (profile_id, title, body, link, kind)
  select id, case p_kind when 'deletion' then 'Account deletion requested' else 'Name change requested' end,
         me.full_name || ' sent a request.', '/admin/accounts', 'staff_alert'
    from public.profiles where role = 'admin';
  perform public.log_event('account.' || p_kind || '_requested', 'profile', me.id::text, '{}'::jsonb);
end;
$$;

-- 2. Data rights (RA 10173): download my data, delete my account -------

-- Everything CareFolio holds ABOUT the logged-in user, as one JSON file.
-- (Share-link token hashes are left out: they're keys, not data.)
create or replace function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when not public.passed_email_code() then null else jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = (select auth.uid())),
    'requests', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at)
                            from public.requests r where r.requester_id = (select auth.uid())), '[]'),
    'correction_requests', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at)
                            from public.correction_requests c where c.requester_id = (select auth.uid())), '[]'),
    'notifications', coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at)
                            from public.notifications n where n.profile_id = (select auth.uid())), '[]'),
    'reminders', coalesce((select jsonb_agg(to_jsonb(m) order by m.due_at)
                            from public.reminders m where m.profile_id = (select auth.uid())), '[]'),
    'reminder_settings', (select to_jsonb(s) from public.reminder_settings s where s.profile_id = (select auth.uid())),
    'share_links', coalesce((select jsonb_agg(jsonb_build_object(
                              'id', l.id, 'patient_id', l.patient_id, 'sections', l.sections,
                              'created_at', l.created_at, 'expires_at', l.expires_at, 'revoked_at', l.revoked_at,
                              'access_log', coalesce((select jsonb_agg(jsonb_build_object('viewed_at', a.viewed_at, 'user_agent', a.user_agent))
                                                        from public.share_access_logs a where a.share_link_id = l.id), '[]')))
                            from public.share_links l where l.created_by = (select auth.uid())), '[]'),
    'sessions', coalesce((select jsonb_agg(jsonb_build_object('device', u.device_label, 'created_at', u.created_at,
                              'last_seen_at', u.last_seen_at, 'revoked_at', u.revoked_at))
                            from public.user_sessions u where u.profile_id = (select auth.uid())), '[]'),
    'caregiver_links', coalesce((select jsonb_agg(to_jsonb(k)) from public.caregiver_links k
                            where k.caregiver_id = (select auth.uid())), '[]'),
    'account_requests', coalesce((select jsonb_agg(to_jsonb(q)) from public.account_requests q
                            where q.profile_id = (select auth.uid())), '[]'),
    'audit_entries', coalesce((select jsonb_agg(jsonb_build_object('when', a.created_at, 'action', a.action,
                              'entity', a.entity, 'details', a.details) order by a.created_at)
                            from public.audit_logs a
                           where a.actor_id = (select auth.uid())
                              or (a.entity = 'profile' and a.entity_id = (select auth.uid())::text)), '[]')
  ) end;
$$;

create or replace function public.log_my_data_export()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.passed_email_code() then raise exception 'Email code required'; end if;
  perform public.log_event('account.data_exported', 'profile', (select auth.uid())::text, '{}'::jsonb);
end;
$$;
revoke execute on function public.log_my_data_export() from public, anon;
grant execute on function public.log_my_data_export() to authenticated;

-- Deleting an account must not break the facility's records: requests
-- and corrections keep existing (hospitals must retain them) with the
-- requester set to empty. Other links to the person are removed.
alter table public.requests alter column requester_id drop not null;
alter table public.requests drop constraint if exists requests_requester_id_fkey;
alter table public.requests add constraint requests_requester_id_fkey
  foreign key (requester_id) references public.profiles (id) on delete set null;
alter table public.correction_requests alter column requester_id drop not null;
alter table public.correction_requests drop constraint if exists correction_requests_requester_id_fkey;
alter table public.correction_requests add constraint correction_requests_requester_id_fkey
  foreign key (requester_id) references public.profiles (id) on delete set null;
alter table public.caregiver_links drop constraint if exists caregiver_links_invited_by_fkey;
alter table public.caregiver_links add constraint caregiver_links_invited_by_fkey
  foreign key (invited_by) references public.profiles (id) on delete set null;

-- Staff approve a deletion request: the login account and personal data
-- (profile, settings, reminders, notifications, sessions, share links,
-- caregiver links) are deleted. Medical records, requests and the audit
-- log stay, as the hospital must keep them.
create or replace function public.admin_resolve_account_request(p_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.account_requests;
  target public.profiles;
begin
  if not public.passed_email_code() or not public.is_admin() then raise exception 'Not allowed'; end if;
  select * into q from public.account_requests where id = p_id for update;
  if q.id is null or q.status <> 'pending' then raise exception 'Not pending'; end if;
  if not p_approve and length(trim(coalesce(p_note, ''))) < 5 then raise exception 'A note is required to reject'; end if;
  select * into target from public.profiles where id = q.profile_id;

  update public.account_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         admin_note = nullif(trim(p_note), ''), resolved_at = now(), resolved_by = (select auth.uid())
   where id = p_id;

  if not p_approve then
    insert into public.notifications (profile_id, title, body, link, kind)
    values (q.profile_id, 'Request not approved', trim(p_note), '/profile', 'account');
    perform public.log_event('account.' || q.kind || '_rejected', 'profile', q.profile_id::text,
      jsonb_build_object('note', p_note));
    return;
  end if;

  if q.kind = 'name_change' then
    update public.profiles set full_name = q.new_value where id = q.profile_id;  -- audited by trigger
    insert into public.notifications (profile_id, title, body, link, kind)
    values (q.profile_id, 'Name updated', 'Your name now reads ' || q.new_value || '.', '/profile', 'account');
    return;
  end if;

  -- Deletion.
  if target.role = 'admin' then raise exception 'Remove the staff role first'; end if;
  perform public.log_event('account.deleted', 'profile', q.profile_id::text,
    jsonb_build_object('who', q.requester_label));
  perform set_config('carefolio.deleting_account', 'on', true);  -- this transaction only
  delete from public.reminders where profile_id = q.profile_id;
  delete from public.reminder_settings where profile_id = q.profile_id;
  -- Removing the login cascades to the profile and everything personal
  -- tied to it; records stay (see the foreign keys above).
  delete from auth.users where id = q.profile_id;
end;
$$;

-- Audit trigger (from 011) learns to stay quiet during an approved
-- deletion.
create or replace function public.audit_admin_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_row jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  row_data jsonb := coalesce(new_row, old_row);
  changes jsonb := '{}'::jsonb;
  k text;
  pid uuid;
begin
  -- Only staff actions. (Patients' own actions are logged by the
  -- functions they go through.)
  if (select auth.uid()) is null or not public.is_admin() then
    return coalesce(new, old);
  end if;
  -- An approved account deletion: don't copy the person's data into the
  -- audit log (that would defeat the deletion). 'account.deleted' is
  -- logged explicitly instead.
  if current_setting('carefolio.deleting_account', true) = 'on' then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(new_row) loop
      if k not in ('updated_at', 'updated_by') and new_row -> k is distinct from old_row -> k then
        changes := changes || jsonb_build_object(k, jsonb_build_object('old', old_row -> k, 'new', new_row -> k));
      end if;
    end loop;
    if changes = '{}'::jsonb then return new; end if;
  end if;

  pid := case tg_table_name
           when 'patients' then (row_data ->> 'id')::uuid
           when 'profiles' then null
           else nullif(row_data ->> 'patient_id', '')::uuid
         end;

  perform public.log_event(
    tg_table_name || '.' || case tg_op when 'INSERT' then 'created' when 'UPDATE' then 'updated' else 'deleted' end,
    tg_table_name,
    row_data ->> 'id',
    case tg_op
      when 'UPDATE' then jsonb_build_object('changes', changes)
      when 'INSERT' then jsonb_build_object('new', new_row)
      else jsonb_build_object('old', old_row)
    end,
    pid);
  return coalesce(new, old);
end;
$$;

-- 3. Admin unlock (wrong-code lockout) ---------------------------------

-- Accounts currently locked out of entering codes.
create or replace function public.admin_locked_accounts()
returns table (profile_id uuid, full_name text, email text, locked_until timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, p.email, x.last_fail + interval '15 minutes'
    from public.profiles p
    cross join lateral (
      select count(*) as fails, max(a.created_at) as last_fail
        from public.otp_attempts a
       where a.profile_id = p.id and a.kind in ('attempt', 'failed')
         and a.created_at > greatest(
               coalesce((select max(b.created_at) from public.otp_attempts b
                          where b.profile_id = p.id and b.kind in ('passed', 'unlocked')), '-infinity'),
               now() - interval '15 minutes')
    ) x
   where public.passed_email_code() and public.is_admin()
     and x.fails >= 5 and x.last_fail + interval '15 minutes' > now();
$$;

create or replace function public.admin_unlock(p_profile uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.passed_email_code() or not public.is_admin() then raise exception 'Not allowed'; end if;
  -- An 'unlocked' row resets the count (see otp_locked_until).
  insert into public.otp_attempts (profile_id, kind) values (p_profile, 'unlocked');
  perform public.log_event('auth.unlocked', 'profile', p_profile::text, '{}'::jsonb);
end;
$$;

-- 4. Staff alerts ------------------------------------------------------------

create or replace function public.notify_staff_urgent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_urgent then
    insert into public.notifications (profile_id, title, body, link, kind)
    select id, 'URGENT request ' || new.code,
           public.doc_type_label(new.doc_type) || ' — ' || new.detail || '. ' || coalesce(new.urgent_reason, ''),
           '/admin/requests/' || new.id, 'staff_alert'
      from public.profiles where role = 'admin';
  end if;
  return new;
end;
$$;
create trigger notify_staff_urgent after insert on public.requests
  for each row execute function public.notify_staff_urgent();

-- Called when a staff member opens the dashboard: one alert per request
-- per staff member for "due within 4 hours" and one for "overdue".
create or replace function public.admin_due_alerts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  if not public.passed_email_code() or not public.is_admin() then return 0; end if;
  insert into public.notifications (profile_id, title, body, link, kind)
  select (select auth.uid()),
         case when r.due_at < now() then 'Overdue: ' else 'Due soon: ' end || r.code,
         public.doc_type_label(r.doc_type) || ' — ' || r.detail || ' · due '
           || to_char(r.due_at at time zone 'Asia/Manila', 'Mon FMDD, FMHH12:MI AM'),
         '/admin/requests/' || r.id, 'staff_alert'
    from public.requests r
   where r.status in ('submitted', 'under_review', 'info_requested', 'approved')
     and r.due_at < now() + interval '4 hours'
     and not exists (
       select 1 from public.notifications n
        where n.profile_id = (select auth.uid())
          and n.link = '/admin/requests/' || r.id
          and n.title = case when r.due_at < now() then 'Overdue: ' else 'Due soon: ' end || r.code
     );
  get diagnostics n = row_count;
  return n;
end;
$$;

-- 5. Walk-in requests ----------------------------------------------------------

alter table public.requests
  add column if not exists channel text not null default 'online' check (channel in ('online', 'walk_in')),
  add column if not exists walk_in_name text check (length(walk_in_name) <= 100);

create or replace function public.admin_create_walkin(
  p_patient uuid, p_doc_type public.doc_type, p_detail text, p_purpose text,
  p_walk_in_name text, p_is_urgent boolean, p_urgent_reason text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_code text;
begin
  if not public.passed_email_code() or not public.is_admin() then raise exception 'Not allowed'; end if;
  if length(trim(coalesce(p_walk_in_name, ''))) < 2 then raise exception 'Enter the walk-in person''s name'; end if;
  if length(trim(coalesce(p_detail, ''))) < 2 or length(trim(coalesce(p_purpose, ''))) < 2 then
    raise exception 'Fill in the test and purpose';
  end if;
  if p_is_urgent and length(trim(coalesce(p_urgent_reason, ''))) < 5 then raise exception 'Urgent reason required'; end if;
  -- The staff member who logged it is the requester; the walk-in
  -- person's name is kept alongside.
  insert into public.requests (patient_id, requester_id, doc_type, detail, purpose, is_urgent, urgent_reason,
                               channel, walk_in_name)
  values (p_patient, (select auth.uid()), p_doc_type, trim(p_detail), trim(p_purpose),
          coalesce(p_is_urgent, false), case when p_is_urgent then trim(p_urgent_reason) end,
          'walk_in', trim(p_walk_in_name))
  returning code into new_code;
  return new_code;
end;
$$;

-- 7. Suggest a facility ------------------------------------------------------

create table public.facility_suggestions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid default auth.uid() references public.profiles (id) on delete set null,
  name       text not null check (length(name) between 2 and 120),
  city       text not null check (length(city) between 2 and 80),
  reason     text check (length(reason) <= 500),
  created_at timestamptz not null default now()
);
alter table public.facility_suggestions enable row level security;
create policy "suggest a facility" on public.facility_suggestions for insert to authenticated
  with check ((select public.passed_email_code()) and profile_id = (select auth.uid()));
create policy "read own suggestions; admins read all" on public.facility_suggestions for select to authenticated
  using ((select public.passed_email_code())
         and (profile_id = (select auth.uid()) or (select public.is_admin())));

-- 8. Who may call what ---------------------------------------------------------

revoke execute on function public.request_account_change(text, text) from public, anon;
revoke execute on function public.export_my_data() from public, anon;
revoke execute on function public.admin_resolve_account_request(uuid, boolean, text) from public, anon;
revoke execute on function public.admin_locked_accounts() from public, anon;
revoke execute on function public.admin_unlock(uuid) from public, anon;
revoke execute on function public.admin_due_alerts() from public, anon;
revoke execute on function public.admin_create_walkin(uuid, public.doc_type, text, text, text, boolean, text) from public, anon;
grant execute on function public.request_account_change(text, text) to authenticated;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.admin_resolve_account_request(uuid, boolean, text) to authenticated;
grant execute on function public.admin_locked_accounts() to authenticated;
grant execute on function public.admin_unlock(uuid) to authenticated;
grant execute on function public.admin_due_alerts() to authenticated;
grant execute on function public.admin_create_walkin(uuid, public.doc_type, text, text, text, boolean, text) to authenticated;
