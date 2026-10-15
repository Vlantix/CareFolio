-- 011 — records office portal (phase 7).
--
-- Run AFTER 010: Supabase -> SQL Editor -> paste -> Run.
--
-- Staff work through their own login and the admin-only RLS policies
-- (no service-role key). Every change a staff member makes to records,
-- requests, patients, caregiver links or accounts is written to the
-- audit log BY A TRIGGER, with old -> new values, so no screen can
-- forget to log it.

-- 1. Audit every staff change, with old -> new values -----------------

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

do $$
declare t text;
begin
  foreach t in array array['medications', 'allergies', 'diagnoses', 'lab_values', 'documents',
                           'requests', 'patients', 'caregiver_links', 'profiles', 'correction_requests'] loop
    execute format('drop trigger if exists audit_admin_change on public.%I', t);
    execute format('create trigger audit_admin_change after insert or update or delete on public.%I
                    for each row execute function public.audit_admin_change()', t);
  end loop;
end $$;

-- "Last updated … by …" on the health tables.
create or replace function public.stamp_updated_by()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end;
$$;
do $$
declare t text;
begin
  foreach t in array array['medications', 'allergies', 'diagnoses', 'lab_values'] loop
    execute format('drop trigger if exists stamp_updated_by on public.%I', t);
    execute format('create trigger stamp_updated_by before insert or update on public.%I
                    for each row execute function public.stamp_updated_by()', t);
  end loop;
end $$;

-- 2. Request decisions must carry their text ---------------------------

alter table public.requests
  add constraint request_info_needs_question
    check (status <> 'info_requested' or length(trim(coalesce(info_question, ''))) > 0) not valid,
  add constraint request_decline_needs_reason
    check (status <> 'declined' or length(trim(coalesce(decline_reason, ''))) > 0) not valid;
-- "not valid": checked for every new change, without failing on rows
-- created earlier by hand in the SQL editor.

-- 3. Release: create the document and release the request in ONE step ---

create or replace function public.admin_release_request(
  p_request uuid,
  p_file_path text,
  p_title text,
  p_doctor text,
  p_record_date date,
  p_code text,
  p_facility text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.requests;
  doc_id uuid;
begin
  if not public.passed_email_code() or not public.is_admin() then raise exception 'Not allowed'; end if;
  select * into r from public.requests where id = p_request for update;
  if r.id is null or r.status not in ('approved', 'under_review', 'submitted') then
    raise exception 'Request can''t be released';
  end if;
  if split_part(p_file_path, '/', 1) <> r.patient_id::text then
    raise exception 'File must be in the patient''s folder';
  end if;
  if p_code !~ '^CF-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$' then raise exception 'Invalid code'; end if;

  insert into public.documents (patient_id, type, title, facility, doctor, record_date, file_path,
                                verification_code, released_at, created_by)
  values (r.patient_id, r.doc_type, left(trim(p_title), 150), left(trim(p_facility), 150),
          nullif(left(trim(p_doctor), 100), ''), p_record_date, p_file_path, p_code, now(), (select auth.uid()))
  returning id into doc_id;

  update public.requests set status = 'released', document_id = doc_id where id = p_request;
  return doc_id;
end;
$$;

-- Add a document straight to a patient's records (not from a request).
create or replace function public.admin_add_document(
  p_patient uuid,
  p_type public.doc_type,
  p_file_path text,
  p_title text,
  p_doctor text,
  p_record_date date,
  p_code text,
  p_facility text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  doc_id uuid;
begin
  if not public.passed_email_code() or not public.is_admin() then raise exception 'Not allowed'; end if;
  if split_part(p_file_path, '/', 1) <> p_patient::text then raise exception 'File must be in the patient''s folder'; end if;
  if p_code !~ '^CF-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$' then raise exception 'Invalid code'; end if;
  insert into public.documents (patient_id, type, title, facility, doctor, record_date, file_path,
                                verification_code, released_at, created_by)
  values (p_patient, p_type, left(trim(p_title), 150), left(trim(p_facility), 150),
          nullif(left(trim(p_doctor), 100), ''), p_record_date, p_file_path, p_code, now(), (select auth.uid()))
  returning id into doc_id;
  return doc_id;
end;
$$;

-- 4. Accounts ----------------------------------------------------------------

-- Staff may update profiles (status, reject reason, role). The column
-- guard trigger already lets admins through; the audit trigger logs it.
create policy "admins update profiles" on public.profiles for update to authenticated
  using ((select public.passed_email_code()) and (select public.is_admin()))
  with check ((select public.passed_email_code()) and (select public.is_admin()));

-- Verify & activate. Patients: link to the patients row with this
-- hospital number, or create one. Caregivers: optionally create a
-- PENDING link to that patient (consent is recorded separately).
create or replace function public.admin_activate_account(
  p_profile uuid, p_hospital_no text, p_relationship text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pr public.profiles;
  pat public.patients;
  hno text := nullif(upper(trim(coalesce(p_hospital_no, ''))), '');
begin
  if not public.passed_email_code() or not public.is_admin() then raise exception 'Not allowed'; end if;
  select * into pr from public.profiles where id = p_profile for update;
  if pr.id is null or pr.role = 'admin' then raise exception 'Not a patient or caregiver account'; end if;

  if hno is not null then
    select * into pat from public.patients where upper(hospital_no) = hno;
  end if;

  if pr.role = 'patient' then
    if hno is null then raise exception 'A hospital number is needed to activate a patient'; end if;
    if pat.id is null then
      insert into public.patients (hospital_no, full_name, birthdate, profile_id)
      values (hno, pr.full_name, pr.birthdate, pr.id)
      returning * into pat;
    elsif pat.profile_id is not null and pat.profile_id <> pr.id then
      raise exception 'That hospital number already belongs to another account';
    else
      update public.patients set profile_id = pr.id where id = pat.id;
    end if;
  elsif hno is not null then
    if pat.id is null then raise exception 'No patient with that hospital number'; end if;
    if length(trim(coalesce(p_relationship, ''))) < 2 then raise exception 'Relationship needed'; end if;
    insert into public.caregiver_links (patient_id, caregiver_id, relationship, status, invited_by)
    values (pat.id, pr.id, trim(p_relationship), 'pending', (select auth.uid()))
    on conflict (patient_id, caregiver_id) do nothing;
  end if;

  update public.profiles set status = 'active', reject_reason = null where id = pr.id;
  insert into public.notifications (profile_id, title, body, link, kind)
  values (pr.id, 'Account approved', 'The records office checked your account. You can now make requests.', '/home', 'account');
  return coalesce(pat.id::text, '');
end;
$$;

create or replace function public.admin_reject_account(p_profile uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.passed_email_code() or not public.is_admin() then raise exception 'Not allowed'; end if;
  if length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'A reason is required'; end if;
  update public.profiles set status = 'rejected', reject_reason = left(trim(p_reason), 300)
   where id = p_profile and role <> 'admin';
  if not found then raise exception 'Not found'; end if;
end;
$$;

-- Record consent on behalf of a patient (e.g. a signed form at the
-- counter), for patients without their own login.
create or replace function public.admin_record_consent(p_link uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.caregiver_links;
begin
  if not public.passed_email_code() or not public.is_admin() then raise exception 'Not allowed'; end if;
  select * into l from public.caregiver_links where id = p_link;
  if l.id is null or l.status <> 'pending' then raise exception 'Not pending'; end if;
  update public.caregiver_links set status = 'active', consent_at = now() where id = p_link;
  insert into public.notifications (profile_id, title, body, link, kind)
  values (l.caregiver_id, 'Access approved', 'You can now request and view records as a caregiver.',
          '/switch?patient=' || l.patient_id || '&to=/home', 'family');
end;
$$;

-- Staff roles. You can't remove your own admin role, or the last admin.
create or replace function public.admin_set_role(p_profile uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.passed_email_code() or not public.is_admin() then raise exception 'Not allowed'; end if;
  if p_profile = (select auth.uid()) and p_role <> 'admin' then raise exception 'You can''t remove your own staff role'; end if;
  if p_role <> 'admin' and (select count(*) from public.profiles where role = 'admin') <= 1
     and exists (select 1 from public.profiles where id = p_profile and role = 'admin') then
    raise exception 'There must be at least one admin';
  end if;
  update public.profiles
     set role = p_role, status = case when p_role = 'admin' then 'active' else status end
   where id = p_profile;
  if not found then raise exception 'Not found'; end if;
end;
$$;

-- 5. Corrections: rejecting needs a note -------------------------------

create or replace function public.resolve_correction(p_id uuid, p_status text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.correction_requests;
begin
  if not public.passed_email_code() or not public.is_admin() then raise exception 'Not allowed'; end if;
  if p_status not in ('fixed', 'rejected') then raise exception 'Invalid status'; end if;
  if p_status = 'rejected' and length(trim(coalesce(p_note, ''))) < 5 then raise exception 'A note is required'; end if;
  select * into c from public.correction_requests where id = p_id;
  if c.id is null or c.status <> 'open' then raise exception 'Not open'; end if;
  update public.correction_requests
     set status = p_status, admin_note = left(nullif(trim(p_note), ''), 500)
   where id = p_id;
end;
$$;

-- 6. Who may call what -------------------------------------------------------

revoke execute on function public.audit_admin_change() from public, anon, authenticated;
revoke execute on function public.stamp_updated_by() from public, anon, authenticated;
revoke execute on function public.admin_release_request(uuid, text, text, text, date, text, text) from public, anon;
revoke execute on function public.admin_add_document(uuid, public.doc_type, text, text, text, date, text, text) from public, anon;
revoke execute on function public.admin_activate_account(uuid, text, text) from public, anon;
revoke execute on function public.admin_reject_account(uuid, text) from public, anon;
revoke execute on function public.admin_record_consent(uuid) from public, anon;
revoke execute on function public.admin_set_role(uuid, public.user_role) from public, anon;
grant execute on function public.admin_release_request(uuid, text, text, text, date, text, text) to authenticated;
grant execute on function public.admin_add_document(uuid, public.doc_type, text, text, text, date, text, text) to authenticated;
grant execute on function public.admin_activate_account(uuid, text, text) to authenticated;
grant execute on function public.admin_reject_account(uuid, text) to authenticated;
grant execute on function public.admin_record_consent(uuid) to authenticated;
grant execute on function public.admin_set_role(uuid, public.user_role) to authenticated;
