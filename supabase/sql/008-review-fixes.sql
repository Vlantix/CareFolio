-- 008 — fixes from the phase 5 code review.
--
-- Run AFTER 007: Supabase -> SQL Editor -> paste -> Run.

-- 1. Files: only RELEASED documents can be opened (was: any file in the
--    patient's folder, including ones the records office hadn't released).

drop policy if exists "read files of accessible patients" on storage.objects;
create policy "read released files of accessible patients" on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and (select public.passed_email_code())
    and public.can_access_patient(public.storage_patient_id(name))
    and exists (
      select 1 from public.documents d
       where d.file_path = storage.objects.name
         and d.patient_id = public.storage_patient_id(storage.objects.name)
         and (d.released_at is not null or (select public.is_admin()))
    )
  );

-- PDFs only, at most 10 MB each.
update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['application/pdf']
 where id = 'documents';

-- 2. Notifications: a "kind" instead of matching on title text ---------

alter table public.notifications add column if not exists kind text;
update public.notifications set kind = case title
    when 'New login' then 'new_login'
    when 'Document released' then 'document_released'
    else 'request_status' end
 where kind is null;

-- Does THIS user (not the caller) still have access to the patient?
-- Needed inside triggers, where the caller is the records office.
create or replace function public.user_can_view_patient(p_user uuid, p_patient uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.patients p where p.id = p_patient and p.profile_id = p_user)
      or exists (select 1 from public.caregiver_links l
                  where l.patient_id = p_patient and l.caregiver_id = p_user
                    and l.status = 'active' and l.can_view);
$$;
revoke execute on function public.user_can_view_patient(uuid, uuid) from public, anon, authenticated;

-- 3. Request status notices -----------------------------------------
--    * names the patient, and the link opens THAT patient's requests
--    * no "released" notice here — the document trigger sends that one
--      (it used to arrive twice)
--    * no "under review" notice right after the requester replied
--    * nothing for someone who has since lost access

create or replace function public.notify_request_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text;
  what text;
  t text; b text;
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.status = 'under_review' and old.status = 'info_requested' then return new; end if;
  if not public.user_can_view_patient(new.requester_id, new.patient_id) then return new; end if;

  select full_name into who from public.patients where id = new.patient_id;
  what := public.doc_type_label(new.doc_type) || ' — ' || new.detail || ' (' || who || ')';
  case new.status
    when 'under_review' then
      t := 'Request under review';
      b := what || '. Expected release '
           || to_char(new.due_at at time zone 'Asia/Manila', 'Mon FMDD') || '.';
    when 'info_requested' then
      t := 'More information needed';
      b := what || ' — ' || coalesce(new.info_question, 'the records office has a question.');
    when 'approved' then
      t := 'Request approved';
      b := what || ' is being prepared.';
    when 'declined' then
      t := 'Request declined';
      b := what || ' — ' || coalesce(new.decline_reason, 'see your requests for details.');
    else
      return new;  -- 'released' is announced by notify_document_released
  end case;
  insert into public.notifications (profile_id, title, body, link, kind)
  values (new.requester_id, t, b,
          '/switch?patient=' || new.patient_id || '&to=/requests', 'request_status');
  return new;
end;
$$;

create or replace function public.notify_document_released()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text;
begin
  if new.released_at is null or (tg_op = 'UPDATE' and old.released_at is not null) then
    return new;
  end if;
  select full_name into who from public.patients where id = new.patient_id;
  insert into public.notifications (profile_id, title, body, link, kind)
  select person, 'Document released',
         new.title || ' for ' || who || ' is ready to view and download.',
         '/switch?patient=' || new.patient_id || '&to=/records', 'document_released'
    from (
      select p.profile_id as person from public.patients p
       where p.id = new.patient_id and p.profile_id is not null
      union
      select l.caregiver_id from public.caregiver_links l
       where l.patient_id = new.patient_id and l.status = 'active' and l.can_view
    ) people;
  return new;
end;
$$;

-- New-login notice gets its kind too (same as 006 otherwise).
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

  insert into public.notifications (profile_id, title, body, link, kind)
  values (
    uid,
    'New login',
    'New login on ' || label || ' at '
      || to_char(now() at time zone 'Asia/Manila', 'Mon FMDD, FMHH12:MI AM')
      || '. Not you? Log out other devices.',
    '/profile/sessions',
    'new_login'
  );

  perform public.log_event('auth.otp_passed', 'user_session', sid::text,
    jsonb_build_object('device', label));
  return sid;
end;
$$;

-- 4. Audit events: small details, and no flooding ---------------------
--    viewed / hidden: at most once a minute per user and document;
--    downloaded / printed: at most once every 10 seconds.

create or replace function public.log_record_event(
  p_action text,
  p_patient uuid,
  p_document uuid default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  gap interval;
begin
  if p_action not in ('document.viewed', 'document.downloaded', 'document.hidden', 'summary.viewed', 'summary.printed') then
    raise exception 'Unknown action';
  end if;
  if pg_column_size(coalesce(p_details, '{}'::jsonb)) > 512 then
    raise exception 'Details too large';
  end if;
  if not public.passed_email_code() or not public.can_access_patient(p_patient) then
    raise exception 'Not allowed';
  end if;
  if p_document is not null and not exists (
    select 1 from public.documents where id = p_document and patient_id = p_patient
  ) then
    raise exception 'Not allowed';
  end if;

  gap := case when p_action in ('document.viewed', 'document.hidden', 'summary.viewed')
              then interval '1 minute' else interval '10 seconds' end;
  if exists (
    select 1 from public.audit_logs
     where actor_id = (select auth.uid()) and action = p_action
       and patient_id = p_patient
       and entity_id is not distinct from p_document::text
       and created_at > now() - gap
  ) then
    return;
  end if;

  perform public.log_event(p_action, case when p_document is null then 'summary' else 'document' end,
    p_document::text, coalesce(p_details, '{}'::jsonb), p_patient);
end;
$$;

-- Decisions kept as they are (team can change later):
--   * status notices go to the requester only; releases go to everyone
--     who can view the patient;
--   * any caregiver allowed to request for the patient may answer the
--     records office's question (reply_to_info_request).
