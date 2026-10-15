-- 007 — patients, caregivers, records, requests, notifications triggers,
-- document storage and demo data (phase 5).
--
-- Run AFTER 006: Supabase -> SQL Editor -> paste -> Run.
--
-- Rules used throughout:
--   * RLS on every table. Reading patient data needs a live, verified
--     device (passed_email_code()) AND access to that patient
--     (can_access_patient()).
--   * Patients and caregivers never write records. Only admins do.
--   * Users change things only through purpose-made functions that also
--     write the audit row (create_request, reply_to_info_request, …).

-- 1. Types ---------------------------------------------------------------

create type public.account_status as enum ('pending', 'active', 'rejected');
create type public.doc_type as enum (
  'lab_result', 'medical_certificate', 'medical_abstract', 'prescription_copy', 'discharge_summary'
);
create type public.request_status as enum (
  'submitted', 'under_review', 'info_requested', 'approved', 'released', 'declined'
);
create type public.link_status as enum ('pending', 'active', 'revoked');

-- 2. Account status (the records office checks each new account) -------

alter table public.profiles
  add column if not exists status public.account_status not null default 'pending',
  add column if not exists reject_reason text;

-- Column guard, now also protecting status and reject_reason.
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
  or new.role          is distinct from old.role
  or new.status        is distinct from old.status
  or new.reject_reason is distinct from old.reject_reason
  or new.phone         is distinct from old.phone
  or new.birthdate     is distinct from old.birthdate
  or new.hospital_no   is distinct from old.hospital_no
  or new.created_at    is distinct from old.created_at then
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

-- 3. Patients and caregiver links ---------------------------------------

create table public.patients (
  id          uuid primary key default gen_random_uuid(),
  hospital_no text not null unique,
  full_name   text not null,
  birthdate   date,
  sex         text check (sex in ('Male', 'Female')),
  -- The patient's own login, if they have one.
  profile_id  uuid unique references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.caregiver_links (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients (id) on delete cascade,
  caregiver_id uuid not null references public.profiles (id) on delete cascade,
  relationship text not null,              -- e.g. 'Father', 'Mother'
  consent_at   timestamptz,
  status       public.link_status not null default 'pending',
  can_request  boolean not null default true,
  can_view     boolean not null default true,
  can_share    boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (patient_id, caregiver_id)
);

-- Can the logged-in user see this patient? Admins, the patient
-- themself, or an ACTIVE caregiver link that allows viewing.
create or replace function public.can_access_patient(p_patient uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin()
      or exists (select 1 from public.patients p
                  where p.id = p_patient and p.profile_id = (select auth.uid()))
      or exists (select 1 from public.caregiver_links l
                  where l.patient_id = p_patient
                    and l.caregiver_id = (select auth.uid())
                    and l.status = 'active' and l.can_view);
$$;

-- Can the logged-in user REQUEST documents for this patient? Their
-- account must be active (ID checked), and they are the patient or an
-- active caregiver allowed to request.
create or replace function public.can_request_for(p_patient uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles
                  where id = (select auth.uid()) and status = 'active')
     and (
       exists (select 1 from public.patients p
                where p.id = p_patient and p.profile_id = (select auth.uid()))
       or exists (select 1 from public.caregiver_links l
                   where l.patient_id = p_patient
                     and l.caregiver_id = (select auth.uid())
                     and l.status = 'active' and l.can_request)
     );
$$;

alter table public.patients enable row level security;
create policy "read accessible patients" on public.patients for select to authenticated
  using ((select public.passed_email_code()) and public.can_access_patient(id));
create policy "admins manage patients" on public.patients for all to authenticated
  using ((select public.passed_email_code()) and (select public.is_admin()))
  with check ((select public.passed_email_code()) and (select public.is_admin()));

alter table public.caregiver_links enable row level security;
create policy "read own caregiver links" on public.caregiver_links for select to authenticated
  using ((select public.passed_email_code())
         and (caregiver_id = (select auth.uid()) or (select public.is_admin())));
create policy "admins manage caregiver links" on public.caregiver_links for all to authenticated
  using ((select public.passed_email_code()) and (select public.is_admin()))
  with check ((select public.passed_email_code()) and (select public.is_admin()));

-- 4. Official documents ---------------------------------------------------

-- Short, readable code printed on every document: CF-7Q4K-92XM.
create or replace function public.gen_verification_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I
  result text := 'CF-';
begin
  for i in 1..8 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    if i = 4 then result := result || '-'; end if;
  end loop;
  return result;
end;
$$;

create table public.documents (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null references public.patients (id) on delete cascade,
  type              public.doc_type not null,
  title             text not null,
  facility          text not null,
  doctor            text,
  record_date       date not null,
  file_path         text not null,         -- <patient id>/<file>.pdf in the documents bucket
  verification_code text not null unique default public.gen_verification_code(),
  released_at       timestamptz,
  created_by        uuid references public.profiles (id),
  created_at        timestamptz not null default now()
);
create index documents_patient on public.documents (patient_id, record_date desc);

alter table public.documents enable row level security;
-- Patients/caregivers see RELEASED documents only.
create policy "read released documents" on public.documents for select to authenticated
  using ((select public.passed_email_code())
         and public.can_access_patient(patient_id)
         and (released_at is not null or (select public.is_admin())));
create policy "admins manage documents" on public.documents for all to authenticated
  using ((select public.passed_email_code()) and (select public.is_admin()))
  with check ((select public.passed_email_code()) and (select public.is_admin()));

-- 5. Health summary data --------------------------------------------------

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  name text not null, dose text, schedule text,
  record_date date not null, source text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);
create table public.allergies (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  allergen text not null, reaction text, severity text,
  record_date date not null, source text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);
create table public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  name text not null, status text,
  record_date date not null, source text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);
create table public.lab_values (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  test_name text not null, value text not null, unit text,
  record_date date not null, source text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

do $$
declare t text;
begin
  foreach t in array array['medications', 'allergies', 'diagnoses', 'lab_values'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy "read accessible %1$s" on public.%1$I for select to authenticated
      using ((select public.passed_email_code()) and public.can_access_patient(patient_id))$p$, t);
    execute format($p$create policy "admins manage %1$s" on public.%1$I for all to authenticated
      using ((select public.passed_email_code()) and (select public.is_admin()))
      with check ((select public.passed_email_code()) and (select public.is_admin()))$p$, t);
  end loop;
end $$;

-- 6. Requests ------------------------------------------------------------

create sequence public.request_code_seq;

-- Adds n working days (skipping Saturday and Sunday, Philippine time).
create or replace function public.add_working_days(p_from timestamptz, p_days int)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  d timestamptz := p_from;
  added int := 0;
begin
  while added < p_days loop
    d := d + interval '1 day';
    if extract(isodow from (d at time zone 'Asia/Manila')) < 6 then
      added := added + 1;
    end if;
  end loop;
  return d;
end;
$$;

create table public.requests (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique
                   default 'REQ-' || lpad(nextval('public.request_code_seq')::text, 4, '0'),
  patient_id     uuid not null references public.patients (id) on delete cascade,
  requester_id   uuid not null references public.profiles (id),
  doc_type       public.doc_type not null,
  detail         text not null,            -- which test / date
  purpose        text not null,
  is_urgent      boolean not null default false,
  urgent_reason  text,
  status         public.request_status not null default 'submitted',
  due_at         timestamptz,
  info_question  text,
  info_reply     text,
  decline_reason text,
  document_id    uuid references public.documents (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index requests_patient on public.requests (patient_id, created_at desc);

-- Due date: 3 working days, or end of today (Manila) when urgent. The
-- request form shows the same rule as a preview (src/lib/records.ts).
create or replace function public.set_request_due()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_urgent then
    new.due_at := (date_trunc('day', now() at time zone 'Asia/Manila')
                   + interval '1 day' - interval '1 second') at time zone 'Asia/Manila';
  else
    new.due_at := public.add_working_days(now(), 3);
  end if;
  return new;
end;
$$;
create trigger set_request_due before insert on public.requests
  for each row execute function public.set_request_due();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;
create trigger requests_updated_at before update on public.requests
  for each row execute function public.touch_updated_at();

alter table public.requests enable row level security;
create policy "read requests of accessible patients" on public.requests for select to authenticated
  using ((select public.passed_email_code()) and public.can_access_patient(patient_id));
create policy "admins manage requests" on public.requests for all to authenticated
  using ((select public.passed_email_code()) and (select public.is_admin()))
  with check ((select public.passed_email_code()) and (select public.is_admin()));
-- No user insert/update policies: users go through the functions below.

create or replace function public.create_request(
  p_patient uuid,
  p_doc_type public.doc_type,
  p_detail text,
  p_purpose text,
  p_is_urgent boolean,
  p_urgent_reason text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  new_code text;
begin
  if not public.passed_email_code() then raise exception 'Email code required'; end if;
  if not public.can_request_for(p_patient) then raise exception 'Not allowed to request for this patient'; end if;
  if length(trim(coalesce(p_detail, ''))) < 2 or length(p_detail) > 200 then raise exception 'Invalid detail'; end if;
  if length(trim(coalesce(p_purpose, ''))) < 2 or length(p_purpose) > 100 then raise exception 'Invalid purpose'; end if;
  if p_is_urgent and length(trim(coalesce(p_urgent_reason, ''))) < 5 then raise exception 'Urgent reason required'; end if;

  insert into public.requests (patient_id, requester_id, doc_type, detail, purpose, is_urgent, urgent_reason)
  values (p_patient, (select auth.uid()), p_doc_type, trim(p_detail), trim(p_purpose),
          coalesce(p_is_urgent, false),
          case when p_is_urgent then left(trim(p_urgent_reason), 300) end)
  returning id, code into new_id, new_code;

  perform public.log_event('request.created', 'request', new_id::text,
    jsonb_build_object('code', new_code, 'doc_type', p_doc_type, 'urgent', p_is_urgent), p_patient);
  return new_code;
end;
$$;

-- Answer the records office's question; the request goes back to review.
create or replace function public.reply_to_info_request(p_request uuid, p_reply text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.requests;
begin
  if not public.passed_email_code() then raise exception 'Email code required'; end if;
  select * into r from public.requests where id = p_request;
  if r.id is null or r.status <> 'info_requested' or not public.can_request_for(r.patient_id) then
    raise exception 'Not allowed';
  end if;
  if length(trim(coalesce(p_reply, ''))) < 2 or length(p_reply) > 1000 then raise exception 'Invalid reply'; end if;

  update public.requests
     set info_reply = trim(p_reply), status = 'under_review'
   where id = p_request;
  perform public.log_event('request.info_replied', 'request', p_request::text,
    jsonb_build_object('code', r.code), r.patient_id);
end;
$$;

-- 7. Notifications by trigger (no code path can forget) -----------------

create or replace function public.doc_type_label(t public.doc_type)
returns text language sql immutable set search_path = '' as $$
  select case t
    when 'lab_result' then 'Lab result'
    when 'medical_certificate' then 'Medical certificate'
    when 'medical_abstract' then 'Medical abstract'
    when 'prescription_copy' then 'Prescription copy'
    when 'discharge_summary' then 'Discharge summary'
  end;
$$;

create or replace function public.notify_request_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  what text := public.doc_type_label(new.doc_type) || ' — ' || new.detail;
  t text; b text; l text := '/requests';
begin
  if new.status is not distinct from old.status then return new; end if;
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
    when 'released' then
      t := 'Document released';
      b := what || ' is ready to view and download.';
      l := '/records';
    when 'declined' then
      t := 'Request declined';
      b := what || ' — ' || coalesce(new.decline_reason, 'see your requests for details.');
    else
      return new;
  end case;
  insert into public.notifications (profile_id, title, body, link)
  values (new.requester_id, t, b, l);
  return new;
end;
$$;
create trigger notify_request_status after update of status on public.requests
  for each row execute function public.notify_request_status();

-- When a document is released, tell the patient and every active
-- caregiver who can view it.
create or replace function public.notify_document_released()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.released_at is null or (tg_op = 'UPDATE' and old.released_at is not null) then
    return new;
  end if;
  insert into public.notifications (profile_id, title, body, link)
  select who, 'Document released', new.title || ' is ready to view and download.', '/records'
    from (
      select p.profile_id as who from public.patients p
       where p.id = new.patient_id and p.profile_id is not null
      union
      select l.caregiver_id from public.caregiver_links l
       where l.patient_id = new.patient_id and l.status = 'active' and l.can_view
    ) people;
  return new;
end;
$$;
create trigger notify_document_released after insert or update of released_at on public.documents
  for each row execute function public.notify_document_released();

-- (Correction-request notifications arrive with the corrections table.)

create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.passed_email_code() then raise exception 'Email code required'; end if;
  update public.notifications set read_at = now()
   where profile_id = (select auth.uid()) and read_at is null;
end;
$$;

-- Live badge: let Supabase Realtime send notification inserts (RLS still
-- decides who receives which row).
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

-- 8. Document views, downloads and "hidden" events (audit) ------------

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
begin
  if p_action not in ('document.viewed', 'document.downloaded', 'document.hidden', 'summary.viewed', 'summary.printed') then
    raise exception 'Unknown action';
  end if;
  if not public.passed_email_code() or not public.can_access_patient(p_patient) then
    raise exception 'Not allowed';
  end if;
  if p_document is not null and not exists (
    select 1 from public.documents where id = p_document and patient_id = p_patient
  ) then
    raise exception 'Not allowed';
  end if;
  -- "Hidden" fires often (every Alt+Tab): record at most once a minute
  -- per user and document.
  if p_action = 'document.hidden' and exists (
    select 1 from public.audit_logs
     where actor_id = (select auth.uid()) and action = 'document.hidden'
       and patient_id = p_patient
       and entity_id is not distinct from p_document::text
       and created_at > now() - interval '1 minute'
  ) then
    return;
  end if;
  perform public.log_event(p_action, case when p_document is null then 'summary' else 'document' end,
    p_document::text, coalesce(p_details, '{}'::jsonb), p_patient);
end;
$$;

revoke execute on function public.can_access_patient(uuid) from public, anon;
revoke execute on function public.can_request_for(uuid) from public, anon;
revoke execute on function public.create_request(uuid, public.doc_type, text, text, boolean, text) from public, anon;
revoke execute on function public.reply_to_info_request(uuid, text) from public, anon;
revoke execute on function public.mark_all_notifications_read() from public, anon;
revoke execute on function public.log_record_event(text, uuid, uuid, jsonb) from public, anon;
grant execute on function public.can_access_patient(uuid) to authenticated;
grant execute on function public.can_request_for(uuid) to authenticated;
grant execute on function public.create_request(uuid, public.doc_type, text, text, boolean, text) to authenticated;
grant execute on function public.reply_to_info_request(uuid, text) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.log_record_event(text, uuid, uuid, jsonb) to authenticated;

-- 9. Private storage for the official PDFs ------------------------------

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Files live at <patient id>/<file>.pdf. A user may read a file only
-- if they can access that patient — and only via a short-lived signed
-- link our server makes. Only admins upload or change files.
create or replace function public.storage_patient_id(p_name text)
returns uuid language sql immutable set search_path = '' as $$
  select case when split_part(p_name, '/', 1) ~ '^[0-9a-f-]{36}$'
              then split_part(p_name, '/', 1)::uuid end;
$$;

create policy "read files of accessible patients" on storage.objects for select to authenticated
  using (bucket_id = 'documents'
         and (select public.passed_email_code())
         and public.can_access_patient(public.storage_patient_id(name)));
create policy "admins upload files" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (select public.passed_email_code()) and (select public.is_admin()));
create policy "admins change files" on storage.objects for update to authenticated
  using (bucket_id = 'documents' and (select public.passed_email_code()) and (select public.is_admin()));
create policy "admins delete files" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (select public.passed_email_code()) and (select public.is_admin()));

-- 10. Demo data (FAKE patients only) ------------------------------------

insert into public.patients (hospital_no, full_name, birthdate, sex) values
  ('H-0001', 'Ramon Santos', '1956-03-12', 'Male'),
  ('H-0002', 'Lourdes Reyes', '1961-08-04', 'Female'),
  ('H-0003', 'Jose Dela Cruz', '1949-11-20', 'Male');

insert into public.medications (patient_id, name, dose, schedule, record_date, source)
select id, m.name, m.dose, m.schedule, m.d::date, 'Partner hospital (demo data)'
  from public.patients, (values
    ('Metformin', '500 mg', 'twice a day', '2026-10-10'),
    ('Losartan', '50 mg', 'once a day', '2026-10-10'),
    ('Atorvastatin', '20 mg', 'at night', '2026-09-18')) as m(name, dose, schedule, d)
 where hospital_no = 'H-0001';

insert into public.allergies (patient_id, allergen, reaction, severity, record_date, source)
select id, 'Penicillin', 'Hives and rash', 'Moderate', '2025-06-02', 'Partner hospital (demo data)'
  from public.patients where hospital_no = 'H-0001';

insert into public.diagnoses (patient_id, name, status, record_date, source)
select id, d.name, 'Active', d.dt::date, 'Partner hospital (demo data)'
  from public.patients, (values
    ('Type 2 diabetes', '2018-04-11'),
    ('Hypertension', '2016-09-30'),
    ('Chronic kidney disease, early', '2025-02-14')) as d(name, dt)
 where hospital_no = 'H-0001';

insert into public.lab_values (patient_id, test_name, value, unit, record_date, source)
select id, l.test, l.val, l.unit, l.d::date, 'Partner hospital (demo data)'
  from public.patients, (values
    ('HbA1c', '7.2', '%', '2026-09-28'),
    ('Creatinine', '1.4', 'mg/dL', '2026-10-02')) as l(test, val, unit, d)
 where hospital_no = 'H-0001';

-- 11. Until the admin screens exist: do these by hand ------------------
--
-- Activate an account (the "ID checked" step):
--   update public.profiles set status = 'active' where email = 'you@example.com';
-- Make someone the patient H-0002 themself:
--   update public.patients set profile_id = (select id from public.profiles where email = 'you@example.com')
--    where hospital_no = 'H-0002';
-- Link a caregiver to Ramon Santos:
--   insert into public.caregiver_links (patient_id, caregiver_id, relationship, consent_at, status)
--   select p.id, pr.id, 'Father', now(), 'active' from public.patients p, public.profiles pr
--    where p.hospital_no = 'H-0001' and pr.email = 'you@example.com';
-- Add a released document: upload a PDF in Storage -> documents ->
-- folder named with the patient's id, then:
--   insert into public.documents (patient_id, type, title, facility, doctor, record_date, file_path, released_at)
--   select id, 'lab_result', 'Lab result — HbA1c', 'Partner hospital', 'Dr. Demo', '2026-09-28',
--          id || '/hba1c.pdf', now() from public.patients where hospital_no = 'H-0001';
