-- MechMate v2 — 0001: vehicles table (Phase 1: The Garage)
-- Run in Supabase SQL Editor. Safe to re-run (idempotent).

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nickname text,
  vin text unique,
  model_year int,
  make text not null,
  model text not null,
  trim_name text,
  engine text,
  mileage int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Real security: each user may only ever read/write their own rows.
alter table public.vehicles enable row level security;

create policy "vehicles_select_own"
  on public.vehicles for select
  using (auth.uid() = user_id);

create policy "vehicles_insert_own"
  on public.vehicles for insert
  with check (auth.uid() = user_id);

create policy "vehicles_update_own"
  on public.vehicles for update
  using (auth.uid() = user_id);

create policy "vehicles_delete_own"
  on public.vehicles for delete
  using (auth.uid() = user_id);
