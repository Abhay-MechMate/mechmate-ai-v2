import "server-only";

import {
  buildQuestionMessages, buildRediagnosisMessages, QUESTIONS_JSON_SCHEMA,
  REDIAGNOSIS_JSON_SCHEMA, type ConversationContext,
} from "./assistant-prompt";
import {
  parseQuestionsOutput, parseRediagnosisOutput,
  type QuestionsParsed, type RediagnosisParsed,
} from "./assistant-validate";
import type { AiResponse, RediagnosisTurnInput } from "./assistant-types";
import { buildMessages, DIAGNOSIS_JSON_SCHEMA, type ChatMessage } from "./prompt";
import { extractJson, parseDiagnosisOutput } from "./validate";
import type {
  AiUsage, DiagnosisInput, DiagnosisResult, FallbackReason, VehicleSnapshot,
} from "./types";

export const DEFAULT_PRIMARY_MODEL = "anthropic/claude-haiku-5.5";
export const DEFAULT_BACKUP_MODEL = "google/gemini-3.5-flash-lite";
export const ATTEMPT_TIMEOUT_MS = 20_000;
export const RETRY_DELAY_MS = 750;

export type AiDiagnosisResponse =
  | { ok: true; result: DiagnosisResult; model: string; usage: AiUsage; latencyMs: number }
  | { ok: false; reason: FallbackReason; latencyMs: number };

type SchemaName = "diagnosis" | "assistant_questions" | "rediagnosis";
type AttemptResult<T> =
  | { ok: true; value: T; model: string; usage: AiUsage }
  | { ok: false; reason: FallbackReason; status?: number };

function envValue(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

export function isAiConfigured(): boolean {
  return envValue("OPENROUTER_API_KEY") !== null;
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

async function attemptStructured<T>(
  key: string,
  model: string,
  args: {
    messages: ChatMessage[];
    schemaName: SchemaName;
    schema: object;
    maxTokens: number;
    parse: (value: unknown) => T | null;
  },
): Promise<AttemptResult<T>> {
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
        messages: args.messages,
        response_format: {
          type: "json_schema",
          json_schema: { name: args.schemaName, strict: true, schema: args.schema },
        },
        provider: { require_parameters: true, data_collection: "deny" },
        temperature: 0.2,
        max_tokens: args.maxTokens,
      }),
    });
    if (!response.ok) return { ok: false, reason: classifyStatus(response.status), status: response.status };
    let body: unknown;
    try { body = await response.json(); }
    catch { return { ok: false, reason: "invalid_output", status: response.status }; }
    if (typeof body !== "object" || body === null) return { ok: false, reason: "invalid_output" };
    const payload = body as Record<string, unknown>;
    if (payload.error || !Array.isArray(payload.choices) || payload.choices.length === 0) {
      return { ok: false, reason: "http_error", status: response.status };
    }
    const choice = payload.choices[0];
    if (typeof choice !== "object" || choice === null) return { ok: false, reason: "http_error" };
    const choiceRecord = choice as Record<string, unknown>;
    if (choiceRecord.finish_reason === "length") return { ok: false, reason: "invalid_output" };
    const message = choiceRecord.message;
    const content = typeof message === "object" && message !== null
      ? (message as Record<string, unknown>).content : null;
    if (typeof content !== "string") return { ok: false, reason: "invalid_output" };
    const value = args.parse(extractJson(content));
    if (!value) return { ok: false, reason: "invalid_output", status: response.status };
    const usage = typeof payload.usage === "object" && payload.usage !== null
      ? (payload.usage as Record<string, unknown>) : {};
    return {
      ok: true,
      value,
      model: typeof payload.model === "string" ? payload.model : model,
      usage: {
        promptTokens: numberOrNull(usage.prompt_tokens),
        completionTokens: numberOrNull(usage.completion_tokens),
        costUsd: numberOrNull(usage.cost),
      },
    };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    return { ok: false, reason: name === "AbortError" || name === "TimeoutError" ? "timeout" : "network_error" };
  }
}

async function requestStructured<T>(args: {
  messages: ChatMessage[];
  schemaName: SchemaName;
  schema: object;
  maxTokens: number;
  parse: (value: unknown) => T | null;
}): Promise<AiResponse<T>> {
  const startedAt = performance.now();
  const key = envValue("OPENROUTER_API_KEY");
  if (!key) return { ok: false, reason: "not_configured", latencyMs: Math.round(performance.now() - startedAt) };
  const models = [
    envValue("OPENROUTER_MODEL") ?? DEFAULT_PRIMARY_MODEL,
    envValue("OPENROUTER_BACKUP_MODEL") ?? DEFAULT_BACKUP_MODEL,
  ];
  let finalFailure: AttemptResult<T> & { ok: false } = { ok: false, reason: "http_error" };
  for (let index = 0; index < models.length; index += 1) {
    const result = await attemptStructured(key, models[index], args);
    if (result.ok) return { ...result, latencyMs: Math.round(performance.now() - startedAt) };
    finalFailure = result;
    console.warn("[diagnosis] ai attempt failed", {
      schemaName: args.schemaName, attempt: index + 1, model: models[index],
      reason: result.reason, status: result.status,
    });
    if (!isRetryable(result.reason) || index === models.length - 1) break;
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }
  return { ok: false, reason: finalFailure.reason, latencyMs: Math.round(performance.now() - startedAt) };
}

export async function diagnoseWithAi(
  input: DiagnosisInput,
  vehicle: VehicleSnapshot,
): Promise<AiDiagnosisResponse> {
  const response = await requestStructured({
    messages: buildMessages(input, vehicle), schemaName: "diagnosis",
    schema: DIAGNOSIS_JSON_SCHEMA, maxTokens: 1800,
    parse: (value) => parseDiagnosisOutput(value, input.dtcCodes),
  });
  return response.ok
    ? { ok: true, result: response.value, model: response.model, usage: response.usage, latencyMs: response.latencyMs }
    : response;
}

export function askQuestionsWithAi(ctx: ConversationContext): Promise<AiResponse<QuestionsParsed>> {
  return requestStructured({
    messages: buildQuestionMessages(ctx), schemaName: "assistant_questions",
    schema: QUESTIONS_JSON_SCHEMA, maxTokens: 800,
    parse: (value) => parseQuestionsOutput(value, ctx.baseline, ctx.round),
  });
}

export function rediagnoseWithAi(
  ctx: ConversationContext,
  turn: RediagnosisTurnInput,
): Promise<AiResponse<RediagnosisParsed>> {
  const allowedCodes = [...new Set([...ctx.input.dtcCodes, ...turn.extraCodes])];
  return requestStructured({
    messages: buildRediagnosisMessages(ctx, turn), schemaName: "rediagnosis",
    schema: REDIAGNOSIS_JSON_SCHEMA, maxTokens: 2400,
    parse: (value) => parseRediagnosisOutput(value, allowedCodes, ctx.baseline, ctx.round),
  });
}
