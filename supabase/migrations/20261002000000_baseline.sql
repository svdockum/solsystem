-- ============================================================
-- SolSystem baseline schema
-- ============================================================
-- A Sun is a session (a lesson, an event) owned by a teacher login.
-- Planets (attendees) come from two sources:
--   'qr'   : someone joined via the QR code with a username
--   'scan' : the teacher scanned a student's barcode ("enter")
-- Scans (student number + time + mood/rating) are private to the owner.
-- Planet rows are public: they are what the wall screen renders.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Tables
-- ────────────────────────────────────────────────────────────

create table public.suns (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name                 text not null check (char_length(name) between 1 and 80),
  slug                 text not null unique check (slug ~ '^[a-z0-9][a-z0-9\-]*[a-z0-9]$'),
  description          text check (char_length(description) <= 200),
  is_active            boolean not null default true,
  -- Show student numbers next to scanned planets on the public live view
  show_student_numbers boolean not null default false,
  -- Which way the scanner is currently set
  scan_mode            text not null default 'enter' check (scan_mode in ('enter', 'leave')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index suns_owner_id_idx on public.suns (owner_id);

create table public.attendees (
  id              uuid primary key default gen_random_uuid(),
  sun_id          uuid not null references public.suns (id) on delete cascade,
  source          text not null default 'qr' check (source in ('qr', 'scan')),
  -- Public label. For scanned planets: the student number, or '' when hidden.
  username        text not null check (char_length(username) <= 40),
  -- Private columns: never granted to anon/authenticated (see grants below)
  email           text check (char_length(email) <= 254),
  student_number  text,
  session_token   text not null unique default gen_random_uuid()::text,
  color           text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  planet_size     float not null check (planet_size between 0.3 and 1.5),
  orbit_radius    float not null check (orbit_radius between 3 and 40),
  orbit_speed     float not null check (orbit_speed between 0.01 and 2.0),
  orbit_phase     float not null,
  last_heartbeat  timestamptz not null default now(),
  joined_at       timestamptz not null default now(),
  constraint attendees_source_shape check (
    (source = 'qr' and student_number is null and char_length(username) >= 1)
    or (source = 'scan' and student_number is not null)
  )
);

create index attendees_sun_id_idx on public.attendees (sun_id);
create index attendees_heartbeat_idx on public.attendees (last_heartbeat);
-- One planet per scanned student per sun
create unique index attendees_sun_student_idx
  on public.attendees (sun_id, student_number)
  where student_number is not null;

create table public.scans (
  id              uuid primary key default gen_random_uuid(),
  sun_id          uuid not null references public.suns (id) on delete cascade,
  student_number  text not null check (char_length(student_number) between 1 and 32),
  direction       text not null check (direction in ('enter', 'leave')),
  -- Asked on enter
  mood            text check (mood in ('energetic', 'fine', 'tired')),
  -- Asked on leave ("How good was it?")
  rating          text check (rating in ('outstanding', 'good', 'normal', 'could_be_better', 'very_boring')),
  scanned_at      timestamptz not null default now(),
  -- A second scan of the same student in the same direction overwrites the first
  constraint scans_one_per_direction unique (sun_id, student_number, direction),
  constraint scans_response_matches_direction check (
    (direction = 'enter' and rating is null) or (direction = 'leave' and mood is null)
  )
);

-- ────────────────────────────────────────────────────────────
-- Privileges
-- ────────────────────────────────────────────────────────────
-- Start from nothing and grant exactly what the app uses.

revoke all on public.suns, public.attendees, public.scans from anon, authenticated;

-- Suns: owner only. Anonymous visitors look a sun up by slug via get_sun_by_slug().
grant select, insert, update, delete on public.suns to authenticated;

-- Attendees: the planet columns are public; email, student_number and
-- session_token are not selectable by any client role.
grant select (
  id, sun_id, source, username, color, planet_size,
  orbit_radius, orbit_speed, orbit_phase, last_heartbeat, joined_at
) on public.attendees to anon, authenticated;

grant insert (
  sun_id, username, email, color, planet_size,
  orbit_radius, orbit_speed, orbit_phase, session_token
) on public.attendees to anon, authenticated;

grant delete on public.attendees to authenticated;

-- Scans: owner only. Rows are created through record_scan().
grant select, delete on public.scans to authenticated;
grant update (mood, rating) on public.scans to authenticated;

-- ────────────────────────────────────────────────────────────
-- Helper functions used by policies
-- ────────────────────────────────────────────────────────────

create function public.sun_is_active(p_sun_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.suns s where s.id = p_sun_id and s.is_active
  );
$$;

-- ────────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────────

alter table public.suns      enable row level security;
alter table public.attendees enable row level security;
alter table public.scans     enable row level security;

create policy "owner reads own suns"
  on public.suns for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "owner creates suns"
  on public.suns for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "owner updates own suns"
  on public.suns for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "owner deletes own suns"
  on public.suns for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy "public read planets"
  on public.attendees for select to anon, authenticated
  using (true);

create policy "public join active suns"
  on public.attendees for insert to anon, authenticated
  with check (source = 'qr' and public.sun_is_active(sun_id));

create policy "owner removes planets"
  on public.attendees for delete to authenticated
  using (
    exists (
      select 1 from public.suns s
      where s.id = attendees.sun_id and s.owner_id = (select auth.uid())
    )
  );

create policy "owner reads scans"
  on public.scans for select to authenticated
  using (
    exists (
      select 1 from public.suns s
      where s.id = scans.sun_id and s.owner_id = (select auth.uid())
    )
  );

create policy "owner updates scans"
  on public.scans for update to authenticated
  using (
    exists (
      select 1 from public.suns s
      where s.id = scans.sun_id and s.owner_id = (select auth.uid())
    )
  );

create policy "owner deletes scans"
  on public.scans for delete to authenticated
  using (
    exists (
      select 1 from public.suns s
      where s.id = scans.sun_id and s.owner_id = (select auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────
-- RPC: public sun lookup
-- ────────────────────────────────────────────────────────────

-- The slug is the share secret for the live view and join page, so suns
-- cannot be listed anonymously — only fetched by exact slug.
create function public.get_sun_by_slug(p_slug text)
returns table (id uuid, name text, slug text, description text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.name, s.slug, s.description, s.created_at
  from public.suns s
  where s.slug = p_slug and s.is_active;
$$;

-- ────────────────────────────────────────────────────────────
-- RPC: QR attendees (ownership proven by session token)
-- ────────────────────────────────────────────────────────────

create function public.heartbeat(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.attendees
  set last_heartbeat = now()
  where session_token = p_token;
$$;

create function public.leave_sun(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.attendees
  where session_token = p_token;
$$;

-- Emails of QR attendees, for the sun owner only
create function public.get_attendee_emails(p_sun_id uuid)
returns table (id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.email
  from public.attendees a
  join public.suns s on s.id = a.sun_id
  where a.sun_id = p_sun_id
    and s.owner_id = (select auth.uid())
    and a.email is not null;
$$;

-- Remove QR attendees idle for more than 10 minutes.
-- Scanned planets have no heartbeat: they stay until scanned out.
create function public.cleanup_idle_attendees()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  delete from public.attendees
  where source = 'qr'
    and last_heartbeat < now() - interval '10 minutes';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- RPC: barcode scans
-- ────────────────────────────────────────────────────────────

-- Record a scan for a sun the caller owns.
--   enter : upsert the scan, put the student's planet in orbit
--   leave : upsert the scan, remove the student's planet
-- A repeated scan overwrites the time and clears the previous answer.
-- Planet palette / ranges mirror app/composables/useJoin.ts and app/utils/orbits.ts.
create function public.record_scan(p_sun_id uuid, p_student_number text, p_direction text)
returns public.scans
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_show   boolean;
  v_number text := btrim(p_student_number);
  v_scan   public.scans;
  v_colors constant text[] := array[
    '#FF6B6B', '#FF9F43', '#FECA57', '#48DBFB', '#FF9FF3',
    '#54A0FF', '#5F27CD', '#00D2D3', '#1DD1A1', '#C44569',
    '#F8B739', '#EE5A24', '#009432', '#0652DD', '#9980FA',
    '#EA2027', '#006266', '#ED4C67', '#B53471', '#833471',
    '#7EFFF5', '#67E480', '#E96900', '#A29BFE', '#FD79A8'
  ];
  v_rings  constant float[] := array[
     9.5, 10.8, 12.1, 13.4, 14.7, 16.0, 17.3, 18.6,
    19.9, 21.2, 22.5, 23.8, 25.1, 26.4, 27.7
  ];
begin
  select s.show_student_numbers into v_show
  from public.suns s
  where s.id = p_sun_id and s.owner_id = (select auth.uid());

  if not found then
    raise exception 'Session not found' using errcode = '42501';
  end if;

  if v_number is null or char_length(v_number) not between 1 and 32 then
    raise exception 'Invalid student number' using errcode = '22023';
  end if;

  if p_direction is null or p_direction not in ('enter', 'leave') then
    raise exception 'Invalid direction' using errcode = '22023';
  end if;

  insert into public.scans (sun_id, student_number, direction)
  values (p_sun_id, v_number, p_direction)
  on conflict on constraint scans_one_per_direction
  do update set scanned_at = now(), mood = null, rating = null
  returning * into v_scan;

  if p_direction = 'enter' then
    insert into public.attendees (
      sun_id, source, username, student_number,
      color, planet_size, orbit_radius, orbit_speed, orbit_phase
    )
    values (
      p_sun_id,
      'scan',
      case when v_show then v_number else '' end,
      v_number,
      v_colors[1 + floor(random() * array_length(v_colors, 1))::int],
      0.35 + random() * 0.55,
      v_rings[1 + floor(random() * array_length(v_rings, 1))::int],
      0.162 + random() * 0.972,
      random() * 2 * pi()
    )
    on conflict (sun_id, student_number) where student_number is not null
    do nothing;
  else
    delete from public.attendees a
    where a.sun_id = p_sun_id and a.student_number = v_number;
  end if;

  return v_scan;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- Triggers
-- ────────────────────────────────────────────────────────────

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger suns_set_updated_at
  before update on public.suns
  for each row execute function public.set_updated_at();

-- Flipping show_student_numbers rewrites the public label of scanned planets,
-- so open live views pick it up through realtime.
create function public.sync_scan_planet_labels()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.attendees a
  set username = case when new.show_student_numbers then a.student_number else '' end
  where a.sun_id = new.id and a.source = 'scan';
  return null;
end;
$$;

create trigger suns_sync_scan_planet_labels
  after update of show_student_numbers on public.suns
  for each row
  when (old.show_student_numbers is distinct from new.show_student_numbers)
  execute function public.sync_scan_planet_labels();

-- Deleting an "enter" scan also removes that student's planet
create function public.remove_planet_for_deleted_scan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.attendees a
  where a.sun_id = old.sun_id and a.student_number = old.student_number;
  return null;
end;
$$;

create trigger scans_remove_planet
  after delete on public.scans
  for each row
  when (old.direction = 'enter')
  execute function public.remove_planet_for_deleted_scan();

-- ────────────────────────────────────────────────────────────
-- Function privileges
-- ────────────────────────────────────────────────────────────

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.sun_is_active(uuid)        to anon, authenticated;
grant execute on function public.get_sun_by_slug(text)      to anon, authenticated;
grant execute on function public.heartbeat(text)            to anon, authenticated;
grant execute on function public.leave_sun(text)            to anon, authenticated;
grant execute on function public.get_attendee_emails(uuid)  to authenticated;
grant execute on function public.record_scan(uuid, text, text) to authenticated;

-- ────────────────────────────────────────────────────────────
-- Realtime
-- ────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end;
$$;

alter publication supabase_realtime add table public.attendees, public.scans;

-- ────────────────────────────────────────────────────────────
-- Scheduled cleanup of idle QR attendees (every minute)
-- ────────────────────────────────────────────────────────────

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'cleanup-idle-attendees',
  '* * * * *',
  $$select public.cleanup_idle_attendees()$$
);
