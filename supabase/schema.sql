-- ============================================================
-- SolSystem Database Schema
-- Run this in your Supabase SQL editor to set up the project
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Tables
-- ────────────────────────────────────────────────────────────

create table if not exists public.suns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  slug        text not null unique check (slug ~ '^[a-z0-9][a-z0-9\-]*[a-z0-9]$'),
  description text check (char_length(description) <= 200),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists suns_slug_idx       on public.suns (slug);
create index if not exists suns_is_active_idx  on public.suns (is_active);

create table if not exists public.attendees (
  id              uuid primary key default gen_random_uuid(),
  sun_id          uuid not null references public.suns (id) on delete cascade,
  username        text not null check (char_length(username) between 1 and 40),
  email           text,
  color           text not null,
  planet_size     float not null check (planet_size between 0.3 and 1.5),
  orbit_radius    float not null check (orbit_radius between 3 and 40),
  orbit_speed     float not null check (orbit_speed between 0.01 and 2.0),
  orbit_phase     float not null,
  last_heartbeat  timestamptz not null default now(),
  joined_at       timestamptz not null default now(),
  session_token   text not null unique
);

create index if not exists attendees_sun_id_idx on public.attendees (sun_id);
create index if not exists attendees_heartbeat_idx on public.attendees (last_heartbeat);
create index if not exists attendees_token_idx on public.attendees (session_token);

-- ────────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────────

alter table public.suns     enable row level security;
alter table public.attendees enable row level security;

-- Suns: public read of active suns, open insert, update/delete via RPC only
create policy "public read active suns"
  on public.suns for select
  using (is_active = true);

create policy "public insert suns"
  on public.suns for insert
  with check (true);

create policy "public update suns"
  on public.suns for update
  using (true);

-- Attendees: public read (session_token excluded by view), open insert
-- Update/delete done via security-definer RPCs — no direct RLS needed for those paths
create policy "public read attendees"
  on public.attendees for select
  using (true);

create policy "public insert attendees"
  on public.attendees for insert
  with check (true);

-- ────────────────────────────────────────────────────────────
-- RPC Functions (security definer to bypass RLS for token ops)
-- ────────────────────────────────────────────────────────────

-- Send a heartbeat for the given session token
create or replace function public.heartbeat(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.attendees
  set last_heartbeat = now()
  where session_token = p_token;
end;
$$;

-- Remove an attendee by session token (voluntary leave)
create or replace function public.leave_sun(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.attendees
  where session_token = p_token;
end;
$$;

-- Remove attendees that have been idle for more than 10 minutes
create or replace function public.cleanup_idle_attendees()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.attendees
  where last_heartbeat < now() - interval '10 minutes';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- Scheduled cleanup via pg_cron (enable pg_cron extension first)
-- ────────────────────────────────────────────────────────────

-- Uncomment after enabling the pg_cron extension in Supabase dashboard:
--
-- select cron.schedule(
--   'cleanup-idle-attendees',
--   '* * * * *',   -- every minute
--   'select public.cleanup_idle_attendees()'
-- );

-- ────────────────────────────────────────────────────────────
-- Realtime: enable replication for attendees table
-- ────────────────────────────────────────────────────────────

-- Run this to enable realtime for the attendees table:
-- Go to Supabase Dashboard → Database → Replication → Tables
-- and enable replication for "attendees"
--
-- Or via SQL (if not already enabled):
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table public.suns, public.attendees;
commit;

-- ────────────────────────────────────────────────────────────
-- Helpful view (excludes session_token for safer selects)
-- ────────────────────────────────────────────────────────────

create or replace view public.attendees_public as
  select
    id, sun_id, username, email, color,
    planet_size, orbit_radius, orbit_speed, orbit_phase,
    last_heartbeat, joined_at
  from public.attendees;
