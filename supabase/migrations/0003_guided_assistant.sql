-- MechMate v2 — 0003: guided assistant (Phase 3)
-- Run in Supabase SQL Editor after 0002 and BEFORE deploying Phase 3 app code.
-- Safe to re-run (idempotent). Phase 2 app code keeps working after this runs.

------------------------------------------------------------------------------
-- 1. Session columns
------------------------------------------------------------------------------
alter table public.diagnostic_sessions
  add column if not exists initial_result jsonb,
  add column if not exists revision int not null default 0,
  add column if not exists assistant_status text not null default 'not_started';

-- Backfill: every existing row's current result IS its first-pass result.
update public.diagnostic_sessions
   set initial_result = result
 where initial_result is null;

-- initial_result: filled from result on insert, immutable afterwards.
-- (NOT NULL is checked after BEFORE triggers, so Phase 2 inserts still pass.)
create or replace function public.diagnostic_sessions_initial_result()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.initial_result := coalesce(new.initial_result, new.result);
  else
    new.initial_result := old.initial_result;
  end if;
  return new;
end;
$$;

drop trigger if exists diagnostic_sessions_initial_result on public.diagnostic_sessions;
create trigger diagnostic_sessions_initial_result
  before insert or update on public.diagnostic_sessions
  for each row execute function public.diagnostic_sessions_initial_result();

alter table public.diagnostic_sessions
  alter column initial_result set not null;

alter table public.diagnostic_sessions
  drop constraint if exists diagnostic_sessions_initial_result_is_object;
alter table public.diagnostic_sessions
  add constraint diagnostic_sessions_initial_result_is_object
  check (jsonb_typeof(initial_result) = 'object');

alter table public.diagnostic_sessions
  drop constraint if exists diagnostic_sessions_revision_valid;
alter table public.diagnostic_sessions
  add constraint diagnostic_sessions_revision_valid
  check (revision >= 0);

alter table public.diagnostic_sessions
  drop constraint if exists diagnostic_sessions_assistant_status_valid;
alter table public.diagnostic_sessions
  add constraint diagnostic_sessions_assistant_status_valid
  check (assistant_status in ('not_started', 'active', 'finished'));

------------------------------------------------------------------------------
-- 2. Turns: one row per assistant AI turn
------------------------------------------------------------------------------
create table if not exists public.diagnostic_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.diagnostic_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  round_number smallint not null,
  kind text not null,

  -- questions:   QuestionsTurnPayload   (src/lib/diagnosis/assistant-types.ts)
  -- rediagnosis: RediagnosisTurnPayload (owner's answers live here, always)
  payload jsonb not null,
  -- rediagnosis only: the DiagnosisResult after this round; null if the AI failed.
  result jsonb,

  source text not null,           -- 'ai' = AI produced this turn, 'none' = it failed
  model text,
  fallback_reason text,
  prompt_tokens int,
  completion_tokens int,
  cost_usd numeric(10, 6),
  latency_ms int,

  superseded_at timestamptz,      -- set when the owner edits an earlier round
  created_at timestamptz not null default now(),

  constraint diagnostic_turns_round_valid
    check (round_number between 1 and 3),
  constraint diagnostic_turns_kind_valid
    check (kind in ('questions', 'rediagnosis')),
  constraint diagnostic_turns_source_valid
    check (source in ('ai', 'none')),
  constraint diagnostic_turns_payload_is_object
    check (jsonb_typeof(payload) = 'object'),
  constraint diagnostic_turns_outcome_consistent
    check (
      (kind = 'questions' and source = 'ai' and result is null)
      or (kind = 'rediagnosis' and source = 'ai'
          and result is not null and jsonb_typeof(result) = 'object')
      or (kind = 'rediagnosis' and source = 'none' and result is null)
    ),
  constraint diagnostic_turns_fallback_consistent
    check ((source = 'ai') = (fallback_reason is null))
);

-- At most one live questions turn and one live rediagnosis turn per round.
create unique index if not exists diagnostic_turns_live_idx
  on public.diagnostic_turns (session_id, round_number, kind)
  where superseded_at is null;

-- Conversation page: all turns of a session in order.
create index if not exists diagnostic_turns_session_idx
  on public.diagnostic_turns (session_id, created_at);

-- Per-user daily assistant cap count.
create index if not exists diagnostic_turns_user_created_idx
  on public.diagnostic_turns (user_id, created_at desc);

alter table public.diagnostic_turns enable row level security;

-- Turns are append-only: content is never updated, only superseded_at.
-- Revoke table-level UPDATE first (Supabase default privileges grant ALL),
-- which also drops any column grants; then grant the one updatable column.
revoke all on public.diagnostic_turns from anon;
revoke update, delete on public.diagnostic_turns from authenticated;
grant select, insert on public.diagnostic_turns to authenticated;
grant update (superseded_at) on public.diagnostic_turns to authenticated;

drop policy if exists "diagnostic_turns_select_own" on public.diagnostic_turns;
create policy "diagnostic_turns_select_own"
  on public.diagnostic_turns for select
  using (auth.uid() = user_id);

-- FKs bypass RLS: also require that the parent session is the caller's.
drop policy if exists "diagnostic_turns_insert_own" on public.diagnostic_turns;
create policy "diagnostic_turns_insert_own"
  on public.diagnostic_turns for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.diagnostic_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "diagnostic_turns_update_own" on public.diagnostic_turns;
create policy "diagnostic_turns_update_own"
  on public.diagnostic_turns for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No delete policy: turns go away only with their session (on delete cascade).

------------------------------------------------------------------------------
-- 3. Atomic write paths (security invoker: RLS still applies to every statement)
------------------------------------------------------------------------------

-- Record a questions turn for round p_round_number. Does not bump revision.
create or replace function public.record_questions_turn(
  p_session_id uuid,
  p_expected_revision int,
  p_round_number smallint,
  p_payload jsonb,
  p_model text,
  p_prompt_tokens int,
  p_completion_tokens int,
  p_cost_usd numeric,
  p_latency_ms int
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_revision int;
  v_turn_id uuid;
begin
  select s.revision into v_revision
    from public.diagnostic_sessions s
   where s.id = p_session_id
     for update;
  if not found then
    raise exception 'session_not_found';
  end if;
  if v_revision <> p_expected_revision then
    raise exception 'revision_conflict';
  end if;
  if p_round_number > 1 and not exists (
    select 1 from public.diagnostic_turns t
     where t.session_id = p_session_id
       and t.round_number = p_round_number - 1
       and t.kind = 'rediagnosis'
       and t.result is not null
       and t.superseded_at is null
  ) then
    raise exception 'previous_round_open';
  end if;

  -- A second live questions turn for this round fails on diagnostic_turns_live_idx (23505).
  insert into public.diagnostic_turns (
    session_id, user_id, round_number, kind, payload, result, source,
    model, fallback_reason, prompt_tokens, completion_tokens, cost_usd, latency_ms
  ) values (
    p_session_id, auth.uid(), p_round_number, 'questions', p_payload, null, 'ai',
    p_model, null, p_prompt_tokens, p_completion_tokens, p_cost_usd, p_latency_ms
  )
  returning id into v_turn_id;

  update public.diagnostic_sessions
     set assistant_status = 'active', updated_at = now()
   where id = p_session_id;

  return v_turn_id;
end;
$$;

-- Record a rediagnosis turn (success: p_result not null; failure: p_result null)
-- and, on success, replace the session's current result.
create or replace function public.apply_rediagnosis_turn(
  p_session_id uuid,
  p_expected_revision int,
  p_round_number smallint,
  p_payload jsonb,
  p_result jsonb,
  p_model text,
  p_fallback_reason text,
  p_prompt_tokens int,
  p_completion_tokens int,
  p_cost_usd numeric,
  p_latency_ms int,
  p_finish boolean
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_revision int;
  v_turn_id uuid;
begin
  select s.revision into v_revision
    from public.diagnostic_sessions s
   where s.id = p_session_id
     for update;
  if not found then
    raise exception 'session_not_found';
  end if;
  if v_revision <> p_expected_revision then
    raise exception 'revision_conflict';
  end if;
  if not exists (
    select 1 from public.diagnostic_turns t
     where t.session_id = p_session_id
       and t.round_number = p_round_number
       and t.kind = 'questions'
       and t.superseded_at is null
  ) then
    raise exception 'no_open_questions';
  end if;

  if p_result is not null then
    -- Success: this round's previous rediagnosis (failed or edited) and every
    -- later round are now stale.
    update public.diagnostic_turns
       set superseded_at = now()
     where session_id = p_session_id
       and superseded_at is null
       and (
         round_number > p_round_number
         or (round_number = p_round_number and kind = 'rediagnosis')
       );
  else
    -- Failure may only replace an earlier failure, never a successful round
    -- (failed edits are not recorded at all; the app returns an error instead).
    if exists (
      select 1 from public.diagnostic_turns t
       where t.session_id = p_session_id
         and t.round_number = p_round_number
         and t.kind = 'rediagnosis'
         and t.result is not null
         and t.superseded_at is null
    ) then
      raise exception 'round_already_answered';
    end if;
    update public.diagnostic_turns
       set superseded_at = now()
     where session_id = p_session_id
       and round_number = p_round_number
       and kind = 'rediagnosis'
       and result is null
       and superseded_at is null;
  end if;

  insert into public.diagnostic_turns (
    session_id, user_id, round_number, kind, payload, result, source,
    model, fallback_reason, prompt_tokens, completion_tokens, cost_usd, latency_ms
  ) values (
    p_session_id, auth.uid(), p_round_number, 'rediagnosis', p_payload, p_result,
    case when p_result is null then 'none' else 'ai' end,
    p_model, p_fallback_reason, p_prompt_tokens, p_completion_tokens, p_cost_usd, p_latency_ms
  )
  returning id into v_turn_id;

  update public.diagnostic_sessions
     set revision = revision + 1,
         result = coalesce(p_result, result),
         assistant_status = case when p_finish then 'finished' else 'active' end,
         updated_at = now()
   where id = p_session_id
  returning revision into v_revision;

  return jsonb_build_object('turnId', v_turn_id, 'revision', v_revision);
end;
$$;

revoke all on function public.record_questions_turn(uuid, int, smallint, jsonb, text, int, int, numeric, int) from public, anon;
grant execute on function public.record_questions_turn(uuid, int, smallint, jsonb, text, int, int, numeric, int) to authenticated;

revoke all on function public.apply_rediagnosis_turn(uuid, int, smallint, jsonb, jsonb, text, text, int, int, numeric, int, boolean) from public, anon;
grant execute on function public.apply_rediagnosis_turn(uuid, int, smallint, jsonb, jsonb, text, text, int, int, numeric, int, boolean) to authenticated;
