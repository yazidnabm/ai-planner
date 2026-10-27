-- =============================================================
-- FIX: Grant akses tabel ke role anon & authenticated
-- Jalankan ini di SQL Editor Supabase (paste + Run).
-- Tanpa ini, anon/authenticated dapat error:
--   "Could not find the table 'public.X' in the schema cache"
-- =============================================================

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

-- Ensure grants also apply to tables/sequences created later
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;

-- Paksa PostgREST reload schema cache
notify pgrst, 'reload schema';
