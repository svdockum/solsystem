-- ============================================================
-- Migration: widen orbit_radius constraint to support 20 rings
-- ============================================================
-- What changed:
--   Ring count increased from 15 to 20. Continuing the same
--   1.3-unit spacing from 9.5, the outermost ring is now 34.2.
--   Constraint ceiling raised to 40 for headroom.
--
-- Affected: attendees.orbit_radius
--   Before: check (orbit_radius between 3 and 30)
--   After:  check (orbit_radius between 3 and 40)
-- ============================================================

alter table public.attendees
  drop constraint if exists attendees_orbit_radius_check;

alter table public.attendees
  add constraint attendees_orbit_radius_check
  check (orbit_radius between 3 and 40);
