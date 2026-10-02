-- Scanned planets are labelled with the student number by default.
-- The per-sun setting stays, so numbers can still be hidden for a session.

alter table public.suns
  alter column show_student_numbers set default true;

-- Existing sessions: switch the labels on. The suns_sync_scan_planet_labels
-- trigger copies the student numbers onto the planets already in orbit.
update public.suns
set show_student_numbers = true
where not show_student_numbers;
