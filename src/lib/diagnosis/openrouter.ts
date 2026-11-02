import "server-only";

import { buildMessages, DIAGNOSIS_JSON_SCHEMA } from "./prompt";
import { extractJson, parseDiagnosisOutput } from "./validate";
import type {
  AiUsage,
  DiagnosisInput,
  DiagnosisResult,
  FallbackReason,
  VehicleSnapshot,
} from "./types";

export const DEFAULT_PRIMARY_MODEL = "anthropic/claude-haiku-5.5";
export const DEFAULT_BACKUP_MODEL = "google/gemini-3.5-flash-lite";
export const ATTEMPT_TIMEOUT_MS = 20_000;
export const RETRY_DELAY_MS = 750;

export type AiDiagnosisResponse =
  | { ok: true; result: DiagnosisResult; model: string; usage: AiUsage; latencyMs: number }
  | { ok: false; reason: FallbackReason; latencyMs: number };

type AttemptResult =
  | { ok: true; result: DiagnosisResult; model: string; usage: AiUsage }
  | { ok: false; reason: FallbackReason; status?: number };

function envValue(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function classifyStatus(status: number): FallbackReason {
  if (status === 401 || status === 403) return "auth_error";
  if (status === 402) return "credits_exhausted";
  if (status === 429) return "rate_limited";
  return "http_error";
}

function isRetryable(reason: FallbackReason): boolean {
  return ["rate_limited", "http_error", "timeout", "network_error", "invalid_output"].includes(reason);
}

async function attemptDiagnosis(
  key: string,
  model: string,
  input: DiagnosisInput,
  vehicle: VehicleSnapshot,
): Promise<AttemptResult> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "X-Title": "MechMate",
  };
  const productionUrl = envValue("VERCEL_PROJECT_PRODUCTION_URL");
  if (productionUrl) headers["HTTP-Referer"] = `https://${productionUrl}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      body: JSON.stringify({
        model,
        messages: buildMessages(input, vehicle),
        response_format: {
          type: "json_schema",
          json_schema: { name: "diagnosis", strict: true, schema: DIAGNOSIS_JSON_SCHEMA },
        },
        provider: { require_parameters: true, data_collection: "deny" },
        temperature: 0.2,
        max_tokens: 1800,
      }),
    });

    if (!response.ok) {
      return { ok: false, reason: classifyStatus(response.status), status: response.status };
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { ok: false, reason: "invalid_output", status: response.status };
    }
    if (typeof body !== "object" || body === null) {
      return { ok: false, reason: "invalid_output", status: response.status };
    }
    const payload = body as Record<string, unknown>;
    if (payload.error || !Array.isArray(payload.choices) || payload.choices.length === 0) {
      return { ok: false, reason: "http_error", status: response.status };
    }
    const choice = payload.choices[0];
    if (typeof choice !== "object" || choice === null) {
      return { ok: false, reason: "http_error", status: response.status };
    }
    const choiceRecord = choice as Record<string, unknown>;
    if (choiceRecord.finish_reason === "length") {
      return { ok: false, reason: "invalid_output", status: response.status };
    }
    const message = choiceRecord.message;
    const content =
      typeof message === "object" && message !== null
        ? (message as Record<string, unknown>).content
        : null;
    if (typeof content !== "string") {
      return { ok: false, reason: "invalid_output", status: response.status };
    }
    const result = parseDiagnosisOutput(extractJson(content), input.dtcCodes);
    if (!result) {
      return { ok: false, reason: "invalid_output", status: response.status };
    }
    const usage =
      typeof payload.usage === "object" && payload.usage !== null
        ? (payload.usage as Record<string, unknown>)
        : {};
    return {
      ok: true,
      result,
      model: typeof payload.model === "string" ? payload.model : model,
      usage: {
        promptTokens: numberOrNull(usage.prompt_tokens),
        completionTokens: numberOrNull(usage.completion_tokens),
        costUsd: numberOrNull(usage.cost),
      },
    };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    return {
      ok: false,
      reason: name === "AbortError" || name === "TimeoutError" ? "timeout" : "network_error",
    };
  }
}

export async function diagnoseWithAi(
  input: DiagnosisInput,
  vehicle: VehicleSnapshot,
): Promise<AiDiagnosisResponse> {
  const startedAt = performance.now();
  const key = envValue("OPENROUTER_API_KEY");
  if (!key) {
    return { ok: false, reason: "not_configured", latencyMs: Math.round(performance.now() - startedAt) };
  }

  const models = [
    envValue("OPENROUTER_MODEL") ?? DEFAULT_PRIMARY_MODEL,
    envValue("OPENROUTER_BACKUP_MODEL") ?? DEFAULT_BACKUP_MODEL,
  ];
  let finalFailure: AttemptResult & { ok: false } = { ok: false, reason: "http_error" };

  for (let index = 0; index < models.length; index += 1) {
    const attempt = index + 1;
    const model = models[index];
    const result = await attemptDiagnosis(key, model, input, vehicle);
    if (result.ok) {
      return {
        ...result,
        latencyMs: Math.round(performance.now() - startedAt),
      };
    }

    finalFailure = result;
    console.warn("[diagnosis] ai attempt failed", {
      attempt,
      model,
      reason: result.reason,
      status: result.status,
    });
    if (!isRetryable(result.reason) || index === models.length - 1) break;
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }

  return {
    ok: false,
    reason: finalFailure.reason,
    latencyMs: Math.round(performance.now() - startedAt),
  };
}
