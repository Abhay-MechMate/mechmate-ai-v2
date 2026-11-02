-- MechMate v2 — 0002: diagnostic sessions (Phase 2: The diagnosis loop)
-- Run in Supabase SQL Editor after 0001. Safe to re-run (idempotent).

create table if not exists public.diagnostic_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Nullable + set null: deleting a vehicle keeps its diagnosis history.
  vehicle_id uuid references public.vehicles (id) on delete set null,
  -- The vehicle as it was at diagnosis time; this is what reports render.
  vehicle_snapshot jsonb not null,

  -- Inputs (kept separate from the result so Phase 3 can re-run / extend).
  dtc_codes text[] not null default '{}',
  symptoms text,

  -- Output: the full DiagnosisResult document (see src/lib/diagnosis/types.ts).
  result jsonb not null,
  result_source text not null,
  model text,
  fallback_reason text,

  -- Cost / performance bookkeeping (null when result_source = 'rules').
  prompt_tokens int,
  completion_tokens int,
  cost_usd numeric(10, 6),
  latency_ms int,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint diagnostic_sessions_has_input
    check (cardinality(dtc_codes) > 0 or symptoms is not null),
  constraint diagnostic_sessions_dtc_codes_valid
    check (
      cardinality(dtc_codes) <= 5
      and array_to_string(dtc_codes, ',') ~ '^([PBCU][0-3][0-9A-F]{3}(,|$))*$'
    ),
  constraint diagnostic_sessions_symptoms_length
    check (symptoms is null or char_length(symptoms) between 3 and 1000),
  constraint diagnostic_sessions_result_is_object
    check (jsonb_typeof(result) = 'object'),
  constraint diagnostic_sessions_vehicle_snapshot_is_object
    check (jsonb_typeof(vehicle_snapshot) = 'object'),
  constraint diagnostic_sessions_result_source_valid
    check (result_source in ('ai', 'rules'))
);

-- History page: newest first per user. Also serves the per-user daily AI cap count.
create index if not exists diagnostic_sessions_user_created_idx
  on public.diagnostic_sessions (user_id, created_at desc);

create index if not exists diagnostic_sessions_vehicle_idx
  on public.diagnostic_sessions (vehicle_id);

-- Real security: each user may only ever read/write their own rows.
alter table public.diagnostic_sessions enable row level security;

grant select, insert, update, delete on public.diagnostic_sessions to authenticated;

drop policy if exists "diagnostic_sessions_select_own" on public.diagnostic_sessions;
create policy "diagnostic_sessions_select_own"
  on public.diagnostic_sessions for select
  using (auth.uid() = user_id);

-- Insert/update must also reference a vehicle the caller owns (FKs bypass RLS).
drop policy if exists "diagnostic_sessions_insert_own" on public.diagnostic_sessions;
create policy "diagnostic_sessions_insert_own"
  on public.diagnostic_sessions for insert
  with check (
    auth.uid() = user_id
    and (
      vehicle_id is null
      or exists (
        select 1 from public.vehicles v
        where v.id = vehicle_id and v.user_id = auth.uid()
      )
    )
  );

drop policy if exists "diagnostic_sessions_update_own" on public.diagnostic_sessions;
create policy "diagnostic_sessions_update_own"
  on public.diagnostic_sessions for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      vehicle_id is null
      or exists (
        select 1 from public.vehicles v
        where v.id = vehicle_id and v.user_id = auth.uid()
      )
    )
  );

drop policy if exists "diagnostic_sessions_delete_own" on public.diagnostic_sessions;
create policy "diagnostic_sessions_delete_own"
  on public.diagnostic_sessions for delete
  using (auth.uid() = user_id);
