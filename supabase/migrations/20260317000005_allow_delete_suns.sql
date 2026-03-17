-- Allow anon to delete suns (no auth system — same open pattern as insert/update)
create policy "public delete suns"
  on public.suns for delete
  using (true);
