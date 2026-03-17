-- Allow anon to delete attendee rows directly.
-- The session_token is a hard-to-guess UUID; client filters by it.
create policy "public delete attendees"
  on public.attendees for delete
  using (true);
