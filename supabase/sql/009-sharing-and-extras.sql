-- 009 — sharing with a doctor, document verification, correction
-- requests, family access and reminders (phase 6).
--
-- Run AFTER 008: Supabase -> SQL Editor -> paste -> Run.
--
-- No service-role key: the two PUBLIC features (a doctor opening a
-- shared link, anyone checking a verification code) go through security
-- definer functions that return only what that feature needs. The
-- tables behind them have RLS on and no policies, so the API can't read
-- them directly.

-- 1. Share links ---------------------------------------------------------

create table public.share_links (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.patients (id) on delete cascade,
  created_by       uuid not null references public.profiles (id) on delete cascade,
  -- SHA-256 of the random token. The token itself is never stored: it
  -- exists only in the link the user was shown once.
  token_hash       text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  -- SHA-256 of "<token_hash>:<code>" when a spoken access code is set.
  access_code_hash text check (access_code_hash ~ '^[0-9a-f]{64}$'),
  code_attempts    int not null default 0,
  sections         text[] not null
                     check (sections <@ array['medications', 'allergies', 'labs', 'diagnoses']
                            and cardinality(sections) > 0),
  expires_at       timestamptz not null,
  revoked_at       timestamptz,
  last_notified_at timestamptz,
  created_at       timestamptz not null default now()
);
create index share_links_patient on public.share_links (patient_id, created_at desc);

create table public.share_access_logs (
  id            bigint generated always as identity primary key,
  share_link_id uuid not null references public.share_links (id) on delete cascade,
  viewed_at     timestamptz not null default now(),
  user_agent    text
);
create index share_access_logs_link on public.share_access_logs (share_link_id, viewed_at desc);

alter table public.share_links enable row level security;
alter table public.share_access_logs enable row level security;
-- No policies: token data never reaches the API. Functions below only.

-- May the logged-in user share this patient's summary? The patient
-- themself, or an active caregiver with can_share — account active.
create or replace function public.can_share_patient(p_patient uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and status = 'active')
     and (
       exists (select 1 from public.patients p where p.id = p_patient and p.profile_id = (select auth.uid()))
       or exists (select 1 from public.caregiver_links l
                   where l.patient_id = p_patient and l.caregiver_id = (select auth.uid())
                     and l.status = 'active' and l.can_share)
     );
$$;

create or replace function public.create_share_link(
  p_patient uuid,
  p_token_hash text,
  p_sections text[],
  p_minutes int,
  p_code_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if not public.passed_email_code() then raise exception 'Email code required'; end if;
  if not public.can_share_patient(p_patient) then raise exception 'Not allowed to share'; end if;
  if p_minutes not in (30, 120, 1440) then raise exception 'Invalid duration'; end if;

  insert into public.share_links (patient_id, created_by, token_hash, access_code_hash, sections, expires_at)
  values (p_patient, (select auth.uid()), p_token_hash, p_code_hash,
          (select array_agg(distinct s) from unnest(p_sections) s),
          now() + make_interval(mins => p_minutes))
  returning id into new_id;

  perform public.log_event('share.created', 'share_link', new_id::text,
    jsonb_build_object('sections', p_sections, 'minutes', p_minutes, 'code', p_code_hash is not null),
    p_patient);
  return new_id;
end;
$$;

-- Revoke: whoever created the link, or the patient themself.
create or replace function public.revoke_share_link(p_link uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.share_links;
begin
  if not public.passed_email_code() then raise exception 'Email code required'; end if;
  select * into l from public.share_links where id = p_link;
  if l.id is null or not (
       l.created_by = (select auth.uid())
       or exists (select 1 from public.patients p where p.id = l.patient_id and p.profile_id = (select auth.uid()))
     ) then
    raise exception 'Not allowed';
  end if;
  update public.share_links set revoked_at = coalesce(revoked_at, now()) where id = p_link;
  perform public.log_event('share.revoked', 'share_link', p_link::text, '{}'::jsonb, l.patient_id);
end;
$$;

-- The share screen's list: links for this patient that I made (or all of
-- them, if I'm the patient), with each one's access log. Never the hash.
create or replace function public.list_share_links(p_patient uuid)
returns table (
  id uuid, sections text[], expires_at timestamptz, revoked_at timestamptz,
  created_at timestamptz, has_code boolean, created_by_me boolean, views jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.sections, l.expires_at, l.revoked_at, l.created_at,
         l.access_code_hash is not null,
         l.created_by = (select auth.uid()),
         coalesce((select jsonb_agg(a.viewed_at order by a.viewed_at desc)
                     from public.share_access_logs a where a.share_link_id = l.id), '[]'::jsonb)
    from public.share_links l
   where public.passed_email_code()
     and public.can_access_patient(p_patient)
     and l.patient_id = p_patient
     and (l.created_by = (select auth.uid())
          or exists (select 1 from public.patients p where p.id = p_patient and p.profile_id = (select auth.uid())))
   order by l.created_at desc
   limit 20;
$$;

-- PUBLIC: open a shared link (no login). Returns only the chosen
-- sections. Statuses: expired | code_required | wrong_code | locked | ok.
create or replace function public.open_share(p_token_hash text, p_code_hash text, p_user_agent text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.share_links;
  pat public.patients;
  sharer text;
  relation text;
  result jsonb;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then return jsonb_build_object('status', 'expired'); end if;
  select * into l from public.share_links where token_hash = p_token_hash for update;
  if l.id is null or l.revoked_at is not null or l.expires_at <= now() then
    return jsonb_build_object('status', 'expired');
  end if;

  if l.access_code_hash is not null then
    if l.code_attempts >= 5 then return jsonb_build_object('status', 'locked'); end if;
    if p_code_hash is null then return jsonb_build_object('status', 'code_required'); end if;
    if p_code_hash is distinct from l.access_code_hash then
      update public.share_links set code_attempts = code_attempts + 1 where id = l.id;
      if l.code_attempts + 1 >= 5 then return jsonb_build_object('status', 'locked'); end if;
      return jsonb_build_object('status', 'wrong_code', 'tries_left', 4 - l.code_attempts);
    end if;
  end if;

  select * into pat from public.patients where id = l.patient_id;
  select full_name into sharer from public.profiles where id = l.created_by;
  select case when pat.profile_id = l.created_by then 'patient'
              else coalesce((select lower(relationship) || ' / caregiver' from public.caregiver_links
                              where patient_id = l.patient_id and caregiver_id = l.created_by), 'caregiver') end
    into relation;

  insert into public.share_access_logs (share_link_id, user_agent) values (l.id, left(p_user_agent, 200));
  perform public.log_event('share.viewed', 'share_link', l.id::text, '{}'::jsonb, l.patient_id);
  -- "Your summary was viewed" — at most every 10 minutes per link.
  if l.last_notified_at is null or l.last_notified_at < now() - interval '10 minutes' then
    insert into public.notifications (profile_id, title, body, link, kind)
    values (l.created_by, 'Your summary was viewed',
            'Your shared link for ' || pat.full_name || ' was opened at '
              || to_char(now() at time zone 'Asia/Manila', 'FMHH12:MI AM') || '.',
            '/share', 'share_viewed');
    update public.share_links set last_notified_at = now() where id = l.id;
  end if;

  result := jsonb_build_object(
    'status', 'ok',
    'sections', to_jsonb(l.sections),
    'expires_at', l.expires_at,
    'shared_by', sharer,
    'relation', relation,
    'patient', jsonb_build_object(
      'full_name', pat.full_name, 'birthdate', pat.birthdate, 'sex', pat.sex, 'hospital_no', pat.hospital_no)
  );
  if 'medications' = any(l.sections) then
    result := result || jsonb_build_object('medications', coalesce((select jsonb_agg(jsonb_build_object(
      'name', name, 'dose', dose, 'schedule', schedule, 'record_date', record_date, 'source', source)
      order by record_date desc) from public.medications where patient_id = l.patient_id), '[]'::jsonb));
  end if;
  if 'allergies' = any(l.sections) then
    result := result || jsonb_build_object('allergies', coalesce((select jsonb_agg(jsonb_build_object(
      'allergen', allergen, 'reaction', reaction, 'severity', severity, 'record_date', record_date, 'source', source))
      from public.allergies where patient_id = l.patient_id), '[]'::jsonb));
  end if;
  if 'labs' = any(l.sections) then
    result := result || jsonb_build_object('labs', coalesce((select jsonb_agg(jsonb_build_object(
      'test_name', test_name, 'value', value, 'unit', unit, 'record_date', record_date, 'source', source)
      order by record_date desc) from (
        select distinct on (test_name) * from public.lab_values
         where patient_id = l.patient_id order by test_name, record_date desc) latest), '[]'::jsonb));
  end if;
  if 'diagnoses' = any(l.sections) then
    result := result || jsonb_build_object('diagnoses', coalesce((select jsonb_agg(jsonb_build_object(
      'name', name, 'record_date', record_date, 'source', source))
      from public.diagnoses where patient_id = l.patient_id), '[]'::jsonb));
  end if;
  return result;
end;
$$;

-- PUBLIC: check a spoken access code BEFORE opening (counts wrong tries,
-- max 5 per link; logs nothing else). Returns ok | wrong_code | locked |
-- expired, plus tries_left.
create or replace function public.check_share_code(p_token_hash text, p_code_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.share_links;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then return jsonb_build_object('status', 'expired'); end if;
  select * into l from public.share_links where token_hash = p_token_hash for update;
  if l.id is null or l.revoked_at is not null or l.expires_at <= now() then
    return jsonb_build_object('status', 'expired');
  end if;
  if l.access_code_hash is null then return jsonb_build_object('status', 'ok'); end if;
  if l.code_attempts >= 5 then return jsonb_build_object('status', 'locked'); end if;
  if p_code_hash is not distinct from l.access_code_hash then
    return jsonb_build_object('status', 'ok');
  end if;
  update public.share_links set code_attempts = code_attempts + 1 where id = l.id;
  if l.code_attempts + 1 >= 5 then return jsonb_build_object('status', 'locked'); end if;
  return jsonb_build_object('status', 'wrong_code', 'tries_left', 4 - l.code_attempts);
end;
$$;

-- 2. Public document verification -------------------------------------

create table public.verify_attempts (
  id         bigint generated always as identity primary key,
  ip         text not null,
  created_at timestamptz not null default now()
);
create index verify_attempts_ip_time on public.verify_attempts (ip, created_at desc);
alter table public.verify_attempts enable row level security;
-- No policies: functions only.

-- "Ramon Santos" -> "R. S••••s"
create or replace function public.mask_name(p_name text)
returns text language sql immutable set search_path = '' as $$
  select left(split_part(p_name, ' ', 1), 1) || '. '
      || left(split_part(p_name, ' ', -1), 1) || '••••' || right(split_part(p_name, ' ', -1), 1);
$$;

-- PUBLIC. Limits: 10 checks per 10 minutes per IP, and 120 a minute in
-- total. NOTE: the IP comes from our server; someone calling this
-- function directly could fake it — the overall cap is the backstop.
-- It only ever reveals: type, masked name, facility, release date.
create or replace function public.verify_document_code(p_code text, p_ip text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_ip text := left(coalesce(nullif(trim(p_ip), ''), 'unknown'), 64);
  d public.documents;
  who text;
begin
  delete from public.verify_attempts where created_at < now() - interval '1 day';
  if (select count(*) from public.verify_attempts a where a.ip = v_ip
       and a.created_at > now() - interval '10 minutes') >= 10
     or (select count(*) from public.verify_attempts a where a.created_at > now() - interval '1 minute') >= 120 then
    return jsonb_build_object('status', 'rate_limited');
  end if;
  insert into public.verify_attempts (ip) values (v_ip);

  if v_code !~ '^CF-[A-Z0-9]{4}-[A-Z0-9]{4}$' then return jsonb_build_object('status', 'not_found'); end if;
  select * into d from public.documents where verification_code = v_code and released_at is not null;
  if d.id is null then return jsonb_build_object('status', 'not_found'); end if;

  select full_name into who from public.patients where id = d.patient_id;
  perform public.log_event('document.verified', 'document', d.id::text, '{}'::jsonb, d.patient_id);
  return jsonb_build_object(
    'status', 'authentic',
    'type', public.doc_type_label(d.type),
    'title', d.title,
    'patient', public.mask_name(who),
    'facility', d.facility,
    'released_at', d.released_at
  );
end;
$$;

-- 3. Correction requests -------------------------------------------------

create table public.correction_requests (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients (id) on delete cascade,
  requester_id uuid not null references public.profiles (id),
  document_id  uuid references public.documents (id) on delete set null,
  kind         text not null check (kind in ('wrong_value', 'missing_record', 'outdated_medications')),
  details      text not null check (length(details) between 5 and 2000),
  status       text not null default 'open' check (status in ('open', 'fixed', 'rejected')),
  admin_note   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger correction_requests_updated_at before update on public.correction_requests
  for each row execute function public.touch_updated_at();

alter table public.correction_requests enable row level security;
create policy "read corrections of accessible patients" on public.correction_requests for select to authenticated
  using ((select public.passed_email_code()) and public.can_access_patient(patient_id));
create policy "admins manage corrections" on public.correction_requests for all to authenticated
  using ((select public.passed_email_code()) and (select public.is_admin()))
  with check ((select public.passed_email_code()) and (select public.is_admin()));

create or replace function public.create_correction(
  p_patient uuid, p_kind text, p_document uuid, p_details text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  who text;
begin
  if not public.passed_email_code() then raise exception 'Email code required'; end if;
  if not public.can_request_for(p_patient) then raise exception 'Not allowed'; end if;
  if p_document is not null and not exists (
    select 1 from public.documents where id = p_document and patient_id = p_patient and released_at is not null
  ) then raise exception 'Not allowed'; end if;

  insert into public.correction_requests (patient_id, requester_id, document_id, kind, details)
  values (p_patient, (select auth.uid()), p_document, p_kind, trim(p_details))
  returning id into new_id;

  select full_name into who from public.patients where id = p_patient;
  insert into public.notifications (profile_id, title, body, link, kind)
  select id, 'New correction request', 'A correction was requested for ' || who || '.', '/admin', 'correction_new'
    from public.profiles where role = 'admin';

  perform public.log_event('correction.created', 'correction_request', new_id::text,
    jsonb_build_object('kind', p_kind), p_patient);
  return new_id;
end;
$$;

-- Tell the requester when the records office fixes or rejects it.
create or replace function public.notify_correction_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status or new.status = 'open' then return new; end if;
  if not public.user_can_view_patient(new.requester_id, new.patient_id) then return new; end if;
  insert into public.notifications (profile_id, title, body, link, kind)
  values (new.requester_id,
          case new.status when 'fixed' then 'Correction made' else 'Correction not made' end,
          coalesce(new.admin_note, case new.status when 'fixed'
            then 'The records office corrected the record.'
            else 'The records office reviewed your request.' end),
          '/switch?patient=' || new.patient_id || '&to=/records', 'correction_update');
  return new;
end;
$$;
create trigger notify_correction_update after update of status on public.correction_requests
  for each row execute function public.notify_correction_update();

-- 4. Family access (caregiver invitations and consent) -----------------

alter table public.caregiver_links add column if not exists invited_by uuid references public.profiles (id);

-- Everyone with access to a patient, for the Family screen. Shows names
-- and permissions only — never other people's emails.
create or replace function public.list_family(p_patient uuid)
returns table (
  link_id uuid, full_name text, relationship text, status text, consent_at timestamptz,
  can_request boolean, can_view boolean, can_share boolean,
  is_patient boolean, is_me boolean, invited_by_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select null::uuid, pr.full_name, 'Patient', 'active', null::timestamptz, true, true, true,
         true, pr.id = (select auth.uid()), false
    from public.patients p join public.profiles pr on pr.id = p.profile_id
   where p.id = p_patient and public.passed_email_code() and public.can_access_patient(p_patient)
  union all
  select l.id, pr.full_name, l.relationship, l.status::text, l.consent_at, l.can_request, l.can_view, l.can_share,
         false, l.caregiver_id = (select auth.uid()), l.invited_by = (select auth.uid())
    from public.caregiver_links l join public.profiles pr on pr.id = l.caregiver_id
   where l.patient_id = p_patient and l.status <> 'revoked'
     and public.passed_email_code() and public.can_access_patient(p_patient);
$$;

-- Invite by email. Always answers the same way, so it never reveals
-- whether an email has an account. Creates a PENDING link: nothing is
-- visible to the caregiver until consent is recorded.
create or replace function public.invite_caregiver(p_patient uuid, p_email text, p_relationship text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitee uuid;
  owner uuid;
  new_link uuid;
begin
  if not public.passed_email_code() then raise exception 'Email code required'; end if;
  -- The patient, or a caregiver already active on this patient.
  if not exists (select 1 from public.profiles where id = (select auth.uid()) and status = 'active')
     or not (
       exists (select 1 from public.patients where id = p_patient and profile_id = (select auth.uid()))
       or exists (select 1 from public.caregiver_links where patient_id = p_patient
                   and caregiver_id = (select auth.uid()) and status = 'active')
     ) then
    raise exception 'Not allowed';
  end if;
  if length(trim(coalesce(p_relationship, ''))) not between 2 and 40 then raise exception 'Invalid relationship'; end if;

  select id into invitee from public.profiles where lower(email) = lower(trim(p_email)) and role <> 'admin';
  select profile_id into owner from public.patients where id = p_patient;
  if invitee is null or invitee = owner
     or exists (select 1 from public.caregiver_links where patient_id = p_patient
                 and caregiver_id = invitee and status <> 'revoked') then
    return;  -- same outcome to the inviter either way
  end if;

  insert into public.caregiver_links (patient_id, caregiver_id, relationship, status, invited_by)
  values (p_patient, invitee, trim(p_relationship), 'pending', (select auth.uid()))
  on conflict (patient_id, caregiver_id)
    do update set status = 'pending', relationship = excluded.relationship,
                  invited_by = excluded.invited_by, consent_at = null
  returning id into new_link;

  if owner is not null and owner <> (select auth.uid()) then
    insert into public.notifications (profile_id, title, body, link, kind)
    values (owner, 'Caregiver waiting for your consent',
            'Someone was invited to help with your records. Approve or decline in Family access.',
            '/family', 'family');
  end if;
  perform public.log_event('caregiver.invited', 'caregiver_link', new_link::text,
    jsonb_build_object('relationship', p_relationship), p_patient);
end;
$$;

-- The patient (with their own login) records consent in the app. If the
-- patient has no login, the records office records consent (phase 7).
create or replace function public.approve_caregiver_link(p_link uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.caregiver_links;
begin
  if not public.passed_email_code() then raise exception 'Email code required'; end if;
  select * into l from public.caregiver_links where id = p_link;
  if l.id is null or l.status <> 'pending' or not exists (
    select 1 from public.patients where id = l.patient_id and profile_id = (select auth.uid())
  ) then raise exception 'Not allowed'; end if;

  update public.caregiver_links set status = 'active', consent_at = now() where id = p_link;
  insert into public.notifications (profile_id, title, body, link, kind)
  values (l.caregiver_id, 'Access approved',
          'You can now request and view records as a caregiver.',
          '/switch?patient=' || l.patient_id || '&to=/home', 'family');
  perform public.log_event('caregiver.approved', 'caregiver_link', p_link::text, '{}'::jsonb, l.patient_id);
end;
$$;

-- Remove access / cancel an invite: the patient, the caregiver
-- themself, or whoever sent a still-pending invite.
create or replace function public.revoke_caregiver_link(p_link uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.caregiver_links;
begin
  if not public.passed_email_code() then raise exception 'Email code required'; end if;
  select * into l from public.caregiver_links where id = p_link;
  if l.id is null or l.status = 'revoked' or not (
       exists (select 1 from public.patients where id = l.patient_id and profile_id = (select auth.uid()))
       or l.caregiver_id = (select auth.uid())
       or (l.status = 'pending' and l.invited_by = (select auth.uid()))
     ) then raise exception 'Not allowed'; end if;

  update public.caregiver_links set status = 'revoked' where id = p_link;
  perform public.log_event('caregiver.revoked', 'caregiver_link', p_link::text, '{}'::jsonb, l.patient_id);
end;
$$;

-- 5. Reminders -------------------------------------------------------------

create table public.reminders (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  patient_id  uuid not null references public.patients (id) on delete cascade,
  kind        text not null check (kind in ('appointment', 'refill', 'lab')),
  title       text not null check (length(title) between 2 and 120),
  note        text check (length(note) <= 200),
  due_at      timestamptz not null,
  enabled     boolean not null default true,
  notified_at timestamptz,
  created_at  timestamptz not null default now()
);
create index reminders_profile_due on public.reminders (profile_id, due_at);

alter table public.reminders enable row level security;
-- Your own reminders, for patients you can access. (Personal notes, not
-- official records, so users may write them directly.)
create policy "manage own reminders" on public.reminders for all to authenticated
  using ((select public.passed_email_code()) and profile_id = (select auth.uid()))
  with check ((select public.passed_email_code()) and profile_id = (select auth.uid())
              and public.can_access_patient(patient_id));

create table public.reminder_settings (
  profile_id   uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  appointments boolean not null default true,
  refills      boolean not null default true,
  labs         boolean not null default true
);
alter table public.reminder_settings enable row level security;
create policy "manage own reminder settings" on public.reminder_settings for all to authenticated
  using ((select public.passed_email_code()) and profile_id = (select auth.uid()))
  with check ((select public.passed_email_code()) and profile_id = (select auth.uid()));

-- Called when the app loads (no cron needed for the demo): turn
-- reminders due in the next 24 hours into in-app notifications, once.
create or replace function public.notify_due_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  s public.reminder_settings;
  n int;
begin
  if uid is null or not public.passed_email_code() then return 0; end if;
  select * into s from public.reminder_settings where profile_id = uid;
  with due as (
    update public.reminders r
       set notified_at = now()
     where r.profile_id = uid and r.enabled and r.notified_at is null
       and r.due_at between now() and now() + interval '24 hours'
       and case r.kind when 'appointment' then coalesce(s.appointments, true)
                       when 'refill' then coalesce(s.refills, true)
                       else coalesce(s.labs, true) end
       and public.can_access_patient(r.patient_id)
    returning r.*
  )
  insert into public.notifications (profile_id, title, body, link, kind)
  select uid,
         case kind when 'appointment' then 'Reminder: appointment'
                   when 'refill' then 'Reminder: refill'
                   else 'Reminder: lab test' end,
         title || ' · ' || to_char(due_at at time zone 'Asia/Manila', 'Mon FMDD, FMHH12:MI AM'),
         '/reminders', 'reminder'
    from due;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- 6. Who may call what ---------------------------------------------------

revoke execute on function public.can_share_patient(uuid) from public, anon;
revoke execute on function public.create_share_link(uuid, text, text[], int, text) from public, anon;
revoke execute on function public.revoke_share_link(uuid) from public, anon;
revoke execute on function public.list_share_links(uuid) from public, anon;
revoke execute on function public.create_correction(uuid, text, uuid, text) from public, anon;
revoke execute on function public.list_family(uuid) from public, anon;
revoke execute on function public.invite_caregiver(uuid, text, text) from public, anon;
revoke execute on function public.approve_caregiver_link(uuid) from public, anon;
revoke execute on function public.revoke_caregiver_link(uuid) from public, anon;
revoke execute on function public.notify_due_reminders() from public, anon;
grant execute on function public.can_share_patient(uuid) to authenticated;
grant execute on function public.create_share_link(uuid, text, text[], int, text) to authenticated;
grant execute on function public.revoke_share_link(uuid) to authenticated;
grant execute on function public.list_share_links(uuid) to authenticated;
grant execute on function public.create_correction(uuid, text, uuid, text) to authenticated;
grant execute on function public.list_family(uuid) to authenticated;
grant execute on function public.invite_caregiver(uuid, text, text) to authenticated;
grant execute on function public.approve_caregiver_link(uuid) to authenticated;
grant execute on function public.revoke_caregiver_link(uuid) to authenticated;
grant execute on function public.notify_due_reminders() to authenticated;

-- The two public features: callable without logging in.
revoke execute on function public.open_share(text, text, text) from public;
revoke execute on function public.check_share_code(text, text) from public;
grant execute on function public.check_share_code(text, text) to anon, authenticated;
revoke execute on function public.verify_document_code(text, text) from public;
grant execute on function public.open_share(text, text, text) to anon, authenticated;
grant execute on function public.verify_document_code(text, text) to anon, authenticated;
