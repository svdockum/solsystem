-- ============================================================
-- Migration: widen orbit_speed constraint to support 200% increase
-- ============================================================
-- Affected: attendees.orbit_speed
--   Before: check (orbit_speed between 0.01 and 0.5)
--   After:  check (orbit_speed between 0.01 and 2.0)
-- ============================================================

alter table public.attendees
  drop constraint if exists attendees_orbit_speed_check;

alter table public.attendees
  add constraint attendees_orbit_speed_check
  check (orbit_speed between 0.01 and 2.0);
