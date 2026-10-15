-- 010 — fixes from the phase 6 code review.
--
-- Run AFTER 009: Supabase -> SQL Editor -> paste -> Run.

-- 1. Sharing needs VIEW permission too, and keeps needing it ----------

-- May this user (not the caller) share this patient right now?
create or replace function public.user_can_share_patient(p_user uuid, p_patient uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = p_user and status = 'active')
     and (
       exists (select 1 from public.patients p where p.id = p_patient and p.profile_id = p_user)
       or exists (select 1 from public.caregiver_links l
                   where l.patient_id = p_patient and l.caregiver_id = p_user
                     and l.status = 'active' and l.can_view and l.can_share)
     );
$$;
revoke execute on function public.user_can_share_patient(uuid, uuid) from public, anon, authenticated;

-- The logged-in user's version (used by the Share screen and create).
create or replace function public.can_share_patient(p_patient uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.user_can_share_patient((select auth.uid()), p_patient);
$$;

-- Create now returns the database's own expiry time for the countdown.
drop function if exists public.create_share_link(uuid, text, text[], int, text);
create function public.create_share_link(
  p_patient uuid,
  p_token_hash text,
  p_sections text[],
  p_minutes int,
  p_code_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  new_expiry timestamptz;
begin
  if not public.passed_email_code() then raise exception 'Email code required'; end if;
  if not public.can_share_patient(p_patient) then raise exception 'Not allowed to share'; end if;
  if p_minutes not in (30, 120, 1440) then raise exception 'Invalid duration'; end if;

  insert into public.share_links (patient_id, created_by, token_hash, access_code_hash, sections, expires_at)
  values (p_patient, (select auth.uid()), p_token_hash, p_code_hash,
          (select array_agg(distinct s) from unnest(p_sections) s),
          now() + make_interval(mins => p_minutes))
  returning id, expires_at into new_id, new_expiry;

  perform public.log_event('share.created', 'share_link', new_id::text,
    jsonb_build_object('sections', p_sections, 'minutes', p_minutes, 'code', p_code_hash is not null),
    p_patient);
  return jsonb_build_object('id', new_id, 'expires_at', new_expiry);
end;
$$;
revoke execute on function public.create_share_link(uuid, text, text[], int, text) from public, anon;
grant execute on function public.create_share_link(uuid, text, text[], int, text) to authenticated;

-- 2. Opening a shared link -------------------------------------------------
--    * dead if its creator may no longer share (removed caregiver,
--      share or view permission turned off, account no longer active)
--    * sends age, not the exact birthdate; no hospital number
--    * access log / audit at most once a minute per link
--    * the patient is told too when a caregiver's link is opened

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
  if l.id is null or l.revoked_at is not null or l.expires_at <= now()
     or not public.user_can_share_patient(l.created_by, l.patient_id) then
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

  -- One access-log + audit row per minute per link (refreshes don't flood).
  if not exists (select 1 from public.share_access_logs
                  where share_link_id = l.id and viewed_at > now() - interval '1 minute') then
    insert into public.share_access_logs (share_link_id, user_agent) values (l.id, left(p_user_agent, 200));
    perform public.log_event('share.viewed', 'share_link', l.id::text, '{}'::jsonb, l.patient_id);
  end if;

  -- "Your summary was viewed": the link's creator AND the patient (if they
  -- have a login and didn't make the link) — at most every 10 minutes.
  if l.last_notified_at is null or l.last_notified_at < now() - interval '10 minutes' then
    insert into public.notifications (profile_id, title, body, link, kind)
    select person, 'Your summary was viewed',
           'A shared link for ' || pat.full_name || ' was opened at '
             || to_char(now() at time zone 'Asia/Manila', 'FMHH12:MI AM') || '.',
           '/share', 'share_viewed'
      from (select l.created_by as person
            union select pat.profile_id where pat.profile_id is not null) people;
    update public.share_links set last_notified_at = now() where id = l.id;
  end if;

  result := jsonb_build_object(
    'status', 'ok',
    'sections', to_jsonb(l.sections),
    'expires_at', l.expires_at,
    'shared_by', sharer,
    'relation', relation,
    'patient', jsonb_build_object(
      'full_name', pat.full_name,
      'age', case when pat.birthdate is null then null
                  else extract(year from age(pat.birthdate))::int end,
      'sex', pat.sex)
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

-- 3. Removing a caregiver also ends the links they made -----------------

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
  update public.share_links set revoked_at = now()
   where created_by = l.caregiver_id and patient_id = l.patient_id and revoked_at is null;
  perform public.log_event('caregiver.revoked', 'caregiver_link', p_link::text, '{}'::jsonb, l.patient_id);
end;
$$;

-- 4. Re-inviting someone starts from the default permissions -----------

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
    return;
  end if;

  insert into public.caregiver_links (patient_id, caregiver_id, relationship, status, invited_by)
  values (p_patient, invitee, trim(p_relationship), 'pending', (select auth.uid()))
  on conflict (patient_id, caregiver_id)
    do update set status = 'pending', relationship = excluded.relationship,
                  invited_by = excluded.invited_by, consent_at = null,
                  can_request = true, can_view = true, can_share = false
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

-- 5. Verification never returns the title (it could name a test) --------

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
    'patient', public.mask_name(who),
    'facility', d.facility,
    'released_at', d.released_at
  );
end;
$$;

-- 6. Reminders: only while you can still access the patient -------------

drop policy if exists "manage own reminders" on public.reminders;
create policy "manage own reminders" on public.reminders for all to authenticated
  using ((select public.passed_email_code()) and profile_id = (select auth.uid())
         and public.can_access_patient(patient_id))
  with check ((select public.passed_email_code()) and profile_id = (select auth.uid())
              and public.can_access_patient(patient_id));

-- 7. Corrections: any record (not just PDFs), a rate limit, and an
--    admin screen to resolve them --------------------------------------

alter table public.correction_requests
  add column if not exists record_label text check (length(record_label) <= 120);

drop function if exists public.create_correction(uuid, text, uuid, text);
create function public.create_correction(
  p_patient uuid, p_kind text, p_document uuid, p_record_label text, p_details text
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
  -- At most 3 a hour per person and patient, so admins can't be flooded.
  if (select count(*) from public.correction_requests
       where requester_id = (select auth.uid()) and patient_id = p_patient
         and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Too many correction requests';
  end if;

  insert into public.correction_requests (patient_id, requester_id, document_id, record_label, kind, details)
  values (p_patient, (select auth.uid()), p_document, left(nullif(trim(p_record_label), ''), 120), p_kind, trim(p_details))
  returning id into new_id;

  select full_name into who from public.patients where id = p_patient;
  insert into public.notifications (profile_id, title, body, link, kind)
  select id, 'New correction request', 'A correction was requested for ' || who || '.',
         '/admin/corrections', 'correction_new'
    from public.profiles where role = 'admin';

  perform public.log_event('correction.created', 'correction_request', new_id::text,
    jsonb_build_object('kind', p_kind), p_patient);
  return new_id;
end;
$$;
revoke execute on function public.create_correction(uuid, text, uuid, text, text) from public, anon;
grant execute on function public.create_correction(uuid, text, uuid, text, text) to authenticated;

-- Records office marks a correction fixed or rejected (the requester is
-- notified by the trigger from 009). The record itself is changed by
-- the records office separately.
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
  select * into c from public.correction_requests where id = p_id;
  if c.id is null or c.status <> 'open' then raise exception 'Not open'; end if;
  update public.correction_requests
     set status = p_status, admin_note = left(nullif(trim(p_note), ''), 500)
   where id = p_id;
  perform public.log_event('correction.' || p_status, 'correction_request', p_id::text,
    jsonb_build_object('note', left(p_note, 200)), c.patient_id);
end;
$$;
revoke execute on function public.resolve_correction(uuid, text, text) from public, anon;
grant execute on function public.resolve_correction(uuid, text, text) to authenticated;
