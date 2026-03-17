-- ============================================================
-- Migration: reset to 15 rings with 2.0-unit spacing
-- ============================================================
-- What changed:
--   Ring count reverted from 20 back to 15.
--   Spacing increased from 1.3 to 2.0 units between rings.
--   New radii: 9.5, 11.5, 13.5 ... 37.5 (max 37.5).
--   No constraint change needed — 37.5 is within the existing
--   ceiling of 40 set in migration 20260317000002.
--
-- This is a client-side-only change (app/utils/orbits.ts).
-- No database schema changes are required.
-- Existing attendees keep their current orbit_radius values;
-- new joiners will be assigned the updated ring positions.
-- ============================================================

-- No SQL changes needed for this migration.
-- Document only: rings updated in app/utils/orbits.ts
select 'rings reset to 15, spacing 2.0, max radius 37.5' as info;
