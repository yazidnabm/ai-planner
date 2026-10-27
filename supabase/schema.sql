-- =============================================================
-- AI Smart Life Planner — skema database (Supabase PostgreSQL)
-- Jalankan di SQL editor Supabase.
-- =============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
create type priority_level as enum ('low', 'medium', 'high');
create type task_status   as enum ('todo', 'in_progress', 'done');
create type plan_status   as enum ('draft', 'approved', 'archived');
create type run_status    as enum ('processing', 'completed', 'failed');

-- ---------- TABLES ----------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  timezone    text not null default 'Asia/Jakarta',
  created_at  timestamptz not null default now()
);

create table if not exists public.plans (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  title            text not null,
  goal_description text,
  plan_date        date not null,
  status           plan_status not null default 'draft',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.tasks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  plan_id          uuid references public.plans (id) on delete set null,
  title            text not null,
  description      text,
  task_date        date not null,
  start_time       time,
  end_time         time,
  duration_minutes integer not null default 30,
  priority         priority_level not null default 'medium',
  status           task_status not null default 'todo',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  plan_id        uuid references public.plans (id) on delete set null,
  input_prompt   text not null,
  result_summary text,
  status         run_status not null default 'processing',
  created_at     timestamptz not null default now()
);

-- ---------- INDEXES ----------
create index if not exists idx_tasks_user_date   on public.tasks (user_id, task_date);
create index if not exists idx_plans_user_date   on public.plans (user_id, plan_date);
create index if not exists idx_runs_user_created on public.agent_runs (user_id, created_at desc);

-- ---------- ROW LEVEL SECURITY ----------
alter table public.profiles   enable row level security;
alter table public.plans      enable row level security;
alter table public.tasks      enable row level security;
alter table public.agent_runs enable row level security;

-- profiles
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- plans
create policy "plans_select_own" on public.plans
  for select using (auth.uid() = user_id);
create policy "plans_insert_own" on public.plans
  for insert with check (auth.uid() = user_id);
create policy "plans_update_own" on public.plans
  for update using (auth.uid() = user_id);
create policy "plans_delete_own" on public.plans
  for delete using (auth.uid() = user_id);

-- tasks
create policy "tasks_select_own" on public.tasks
  for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on public.tasks
  for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on public.tasks
  for update using (auth.uid() = user_id);
create policy "tasks_delete_own" on public.tasks
  for delete using (auth.uid() = user_id);

-- agent_runs
create policy "runs_select_own" on public.agent_runs
  for select using (auth.uid() = user_id);
create policy "runs_insert_own" on public.agent_runs
  for insert with check (auth.uid() = user_id);
create policy "runs_update_own" on public.agent_runs
  for update using (auth.uid() = user_id);

-- ---------- TRIGGER: profil otomatis saat signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- GRANT akses ke role API ----------
-- Wajib: tanpa ini, anon/authenticated dapat error
-- "Could not find the table 'public.X' in the schema cache".
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;

-- Paksa PostgREST reload schema cache
notify pgrst, 'reload schema';
