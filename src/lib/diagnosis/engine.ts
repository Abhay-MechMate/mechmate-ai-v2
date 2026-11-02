import "server-only";

import { diagnoseWithAi } from "./openrouter";
import { applySafetyFloor, diagnoseWithRules } from "./rules";
import type { DiagnosisInput, DiagnosisOutcome, VehicleSnapshot } from "./types";

export async function runDiagnosis(
  input: DiagnosisInput,
  vehicle: VehicleSnapshot,
  options: { aiAllowed: boolean },
): Promise<DiagnosisOutcome> {
  const rules = diagnoseWithRules(input, vehicle);
  if (!options.aiAllowed) {
    return {
      result: rules,
      source: "rules",
      model: null,
      fallbackReason: "daily_limit",
      usage: null,
      latencyMs: null,
    };
  }

  const ai = await diagnoseWithAi(input, vehicle);
  if (ai.ok) {
    return {
      result: applySafetyFloor(ai.result, rules),
      source: "ai",
      model: ai.model,
      fallbackReason: null,
      usage: ai.usage,
      latencyMs: ai.latencyMs,
    };
  }

  return {
    result: rules,
    source: "rules",
    model: null,
    fallbackReason: ai.reason,
    usage: null,
    latencyMs: ai.latencyMs,
  };
}
