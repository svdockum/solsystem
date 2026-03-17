-- ============================================================
-- Migration: widen orbit_radius check constraint
-- ============================================================
-- What changed:
--   The ring system was redesigned to use 15 fixed ring radii
--   (4.5 → 22.7). The original constraint allowed up to 25.
--   This migration widens the ceiling to 30 to give headroom
--   for future ring additions without another migration.
--
-- Affected: attendees.orbit_radius
--   Before: check (orbit_radius between 3 and 25)
--   After:  check (orbit_radius between 3 and 30)
-- ============================================================

-- PostgreSQL auto-names inline check constraints as {table}_{column}_check.
-- Drop the old constraint, then re-add with the updated range.

alter table public.attendees
  drop constraint if exists attendees_orbit_radius_check;

alter table public.attendees
  add constraint attendees_orbit_radius_check
  check (orbit_radius between 3 and 30);
