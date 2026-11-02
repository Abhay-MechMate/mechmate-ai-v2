import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type {
  DiagnosisInput,
  DiagnosisOutcome,
  DiagnosticSession,
  DiagnosticSessionSummary,
  VehicleSnapshot,
} from "@/lib/diagnosis/types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const AI_DAILY_LIMIT_PER_USER = 20;

type VehicleRow = {
  id: string;
  nickname: string | null;
  model_year: number | null;
  make: string;
  model: string;
  trim_name: string | null;
  engine: string | null;
  mileage: number | null;
};

function mapVehicleSnapshot(row: Omit<VehicleRow, "id">): VehicleSnapshot {
  return {
    nickname: row.nickname,
    modelYear: row.model_year,
    make: row.make,
    model: row.model,
    trimName: row.trim_name,
    engine: row.engine,
    mileage: row.mileage,
  };
}

export async function getOwnedVehicleSnapshot(
  supabase: SupabaseClient,
  vehicleId: string,
): Promise<{ id: string; snapshot: VehicleSnapshot } | null> {
  if (!UUID_PATTERN.test(vehicleId)) return null;

  const { data, error } = await supabase
    .from("vehicles")
    .select(
      "id, nickname, model_year, make, model, trim_name, engine, mileage",
    )
    .eq("id", vehicleId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as VehicleRow;
  return { id: row.id, snapshot: mapVehicleSnapshot(row) };
}

export async function countRecentAiSessions(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count, error } = await supabase
    .from("diagnostic_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("result_source", "ai")
    .gte("created_at", since);

  return error ? 0 : (count ?? 0);
}

export async function createSession(
  supabase: SupabaseClient,
  args: {
    userId: string;
    vehicleId: string;
    snapshot: VehicleSnapshot;
    input: DiagnosisInput;
    outcome: DiagnosisOutcome;
  },
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("diagnostic_sessions")
    .insert({
      user_id: args.userId,
      vehicle_id: args.vehicleId,
      vehicle_snapshot: args.snapshot,
      dtc_codes: args.input.dtcCodes,
      symptoms: args.input.symptoms,
      result: args.outcome.result,
      result_source: args.outcome.source,
      model: args.outcome.model,
      fallback_reason: args.outcome.fallbackReason,
      prompt_tokens: args.outcome.usage?.promptTokens ?? null,
      completion_tokens: args.outcome.usage?.completionTokens ?? null,
      cost_usd: args.outcome.usage?.costUsd ?? null,
      latency_ms: args.outcome.latencyMs,
    })
    .select("id")
    .single();

  return error || !data ? null : { id: data.id as string };
}

type SessionSummaryRow = {
  id: string;
  vehicle_snapshot: VehicleSnapshot;
  dtc_codes: string[];
  symptoms: string | null;
  result_source: DiagnosticSessionSummary["resultSource"];
  created_at: string;
  drivability: DiagnosticSessionSummary["drivabilityLevel"];
  top_cause: string | null;
};

export async function listSessions(
  supabase: SupabaseClient,
  limit = 50,
): Promise<DiagnosticSessionSummary[] | null> {
  const { data, error } = await supabase
    .from("diagnostic_sessions")
    .select(
      "id, vehicle_snapshot, dtc_codes, symptoms, result_source, created_at, drivability:result->drivability->>level, top_cause:result->likelyCauses->0->>title",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return null;

  return (data as unknown as SessionSummaryRow[]).map((row) => ({
    id: row.id,
    vehicleSnapshot: row.vehicle_snapshot,
    dtcCodes: row.dtc_codes,
    symptoms: row.symptoms,
    drivabilityLevel: row.drivability,
    topCause: row.top_cause,
    resultSource: row.result_source,
    createdAt: row.created_at,
  }));
}

type SessionRow = {
  id: string;
  vehicle_id: string | null;
  vehicle_snapshot: VehicleSnapshot;
  dtc_codes: string[];
  symptoms: string | null;
  result: DiagnosticSession["result"];
  result_source: DiagnosticSession["resultSource"];
  model: string | null;
  fallback_reason: DiagnosticSession["fallbackReason"];
  created_at: string;
};

export async function getSession(
  supabase: SupabaseClient,
  id: string,
): Promise<DiagnosticSession | null> {
  if (!UUID_PATTERN.test(id)) return null;

  const { data, error } = await supabase
    .from("diagnostic_sessions")
    .select(
      "id, vehicle_id, vehicle_snapshot, dtc_codes, symptoms, result, result_source, model, fallback_reason, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as SessionRow;
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    vehicleSnapshot: row.vehicle_snapshot,
    dtcCodes: row.dtc_codes,
    symptoms: row.symptoms,
    result: row.result,
    resultSource: row.result_source,
    model: row.model,
    fallbackReason: row.fallback_reason,
    createdAt: row.created_at,
  };
}
