import type { DiagnosisResult, DiagnosisResultV1 } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeResult(raw: unknown): DiagnosisResult {
  if (!isRecord(raw)) throw new Error("Invalid diagnosis result");
  if (raw.schemaVersion === 2) return raw as DiagnosisResult;
  if (raw.schemaVersion === 1) {
    const legacy = raw as DiagnosisResultV1;
    return { ...legacy, schemaVersion: 2, round: 0, ruledOut: [] };
  }
  throw new Error("Unsupported diagnosis result schema version");
}
