import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type {
  AiUsage,
  AssistantStatus,
  DiagnosisResult,
  FallbackReason,
} from "@/lib/diagnosis/types";
import type {
  AssistantTurn,
  QuestionsTurnPayload,
  RediagnosisTurnPayload,
} from "@/lib/diagnosis/assistant-types";
import { normalizeResult } from "@/lib/diagnosis/upgrade";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type TurnRow = {
  id: string;
  round_number: number;
  kind: "questions" | "rediagnosis";
  payload: QuestionsTurnPayload | RediagnosisTurnPayload;
  result: unknown | null;
  source: "ai" | "none";
  model: string | null;
  fallback_reason: FallbackReason | null;
  superseded_at: string | null;
  created_at: string;
};

export async function listTurns(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<AssistantTurn[] | null> {
  const { data, error } = await supabase
    .from("diagnostic_turns")
    .select("id, round_number, kind, payload, result, source, model, fallback_reason, superseded_at, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error || !data) return null;
  return (data as unknown as TurnRow[]).map((row) => {
    const meta = {
      id: row.id,
      round: row.round_number,
      source: row.source,
      model: row.model,
      fallbackReason: row.fallback_reason,
      superseded: row.superseded_at !== null,
      createdAt: row.created_at,
    };
    return row.kind === "questions"
      ? { ...meta, kind: "questions" as const, payload: row.payload as QuestionsTurnPayload }
      : {
          ...meta,
          kind: "rediagnosis" as const,
          payload: row.payload as RediagnosisTurnPayload,
          result: row.result ? normalizeResult(row.result) : null,
        };
  });
}

export async function countRecentAssistantTurns(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ count: number; oldestAt: string | null }> {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { data, count, error } = await supabase
    .from("diagnostic_turns")
    .select("created_at", { count: "exact" })
    .eq("user_id", userId)
    .eq("source", "ai")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) return { count: 0, oldestAt: null };
  const rows = data as unknown as { created_at: string }[] | null;
  return { count: count ?? 0, oldestAt: rows?.[0]?.created_at ?? null };
}

export async function countSessionTurns(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("diagnostic_turns")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  return error ? 0 : (count ?? 0);
}

export type WriteError =
  | "conflict" | "not_found" | "duplicate" | "previous_round_open"
  | "no_open_questions" | "round_already_answered" | "db_error";
export type WriteResult<T> = { ok: true; value: T } | { ok: false; error: WriteError };

function mapWriteError(error: { code?: string; message?: string }): WriteError {
  if (error.code === "23505") return "duplicate";
  const names: Record<string, WriteError> = {
    revision_conflict: "conflict",
    session_not_found: "not_found",
    previous_round_open: "previous_round_open",
    no_open_questions: "no_open_questions",
    round_already_answered: "round_already_answered",
  };
  return names[error.message ?? ""] ?? "db_error";
}

export async function recordQuestionsTurn(
  supabase: SupabaseClient,
  args: {
    sessionId: string; expectedRevision: number; round: number;
    payload: QuestionsTurnPayload; model: string; usage: AiUsage; latencyMs: number;
  },
): Promise<WriteResult<{ turnId: string }>> {
  const { data, error } = await supabase.rpc("record_questions_turn", {
    p_session_id: args.sessionId,
    p_expected_revision: args.expectedRevision,
    p_round_number: args.round,
    p_payload: args.payload,
    p_model: args.model,
    p_prompt_tokens: args.usage.promptTokens,
    p_completion_tokens: args.usage.completionTokens,
    p_cost_usd: args.usage.costUsd,
    p_latency_ms: args.latencyMs,
  });
  return error ? { ok: false, error: mapWriteError(error) } : { ok: true, value: { turnId: data as string } };
}

export async function applyRediagnosisTurn(
  supabase: SupabaseClient,
  args: {
    sessionId: string; expectedRevision: number; round: number;
    payload: RediagnosisTurnPayload; result: DiagnosisResult | null;
    model: string | null; fallbackReason: FallbackReason | null;
    usage: AiUsage | null; latencyMs: number | null; finish: boolean;
  },
): Promise<WriteResult<{ turnId: string; revision: number }>> {
  const { data, error } = await supabase.rpc("apply_rediagnosis_turn", {
    p_session_id: args.sessionId,
    p_expected_revision: args.expectedRevision,
    p_round_number: args.round,
    p_payload: args.payload,
    p_result: args.result,
    p_model: args.model,
    p_fallback_reason: args.fallbackReason,
    p_prompt_tokens: args.usage?.promptTokens ?? null,
    p_completion_tokens: args.usage?.completionTokens ?? null,
    p_cost_usd: args.usage?.costUsd ?? null,
    p_latency_ms: args.latencyMs,
    p_finish: args.finish,
  });
  if (error) return { ok: false, error: mapWriteError(error) };
  const value = data as { turnId: string; revision: number };
  return { ok: true, value };
}

export async function setAssistantStatus(
  supabase: SupabaseClient,
  sessionId: string,
  status: Extract<AssistantStatus, "active" | "finished">,
): Promise<boolean> {
  const { error } = await supabase
    .from("diagnostic_sessions")
    .update({ assistant_status: status, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  return !error;
}
