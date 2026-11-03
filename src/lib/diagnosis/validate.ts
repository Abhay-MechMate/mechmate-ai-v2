import { DTC_PATTERN } from "./input";
import {
  CONFIDENCE_LEVELS,
  DIAGNOSIS_SCHEMA_VERSION,
  DRIVABILITY_LEVELS,
  SAFETY_CRITICAL_SYSTEMS,
  STEP_DIFFICULTIES,
  VEHICLE_SYSTEMS,
  type CodeNote,
  type DiagnosisResult,
  type InspectionStep,
  type LikelyCause,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function trimRequired(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function inArray<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function dedupeCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractJson(content: string): unknown | null {
  const trimmed = content.trim();
  const candidate = trimmed.includes("```")
    ? trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1)
    : trimmed;
  if (!candidate) return null;
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    return null;
  }
}

export function parseDiagnosisOutput(
  value: unknown,
  inputCodes: string[],
): DiagnosisResult | null {
  if (!isRecord(value)) return null;

  const summary = trimRequired(value.summary);
  const drivability = value.drivability;
  const seeMechanic = value.seeMechanic;
  if (
    !summary ||
    !isRecord(drivability) ||
    !inArray(drivability.level, DRIVABILITY_LEVELS) ||
    !trimRequired(drivability.headline) ||
    !isStringArray(drivability.stopDrivingIf) ||
    typeof value.safetyCritical !== "boolean" ||
    !isRecord(seeMechanic) ||
    typeof seeMechanic.recommended !== "boolean" ||
    !(typeof seeMechanic.reason === "string" || seeMechanic.reason === null) ||
    !Array.isArray(value.likelyCauses) ||
    !Array.isArray(value.inspectionSteps) ||
    value.inspectionSteps.length === 0 ||
    !isStringArray(value.toolsNeeded) ||
    !Array.isArray(value.codeNotes)
  ) {
    return null;
  }

  const likelyCauses: LikelyCause[] = [];
  for (const item of value.likelyCauses) {
    if (!isRecord(item)) return null;
    const title = trimRequired(item.title);
    const explanation = trimRequired(item.explanation);
    const detail = item.detail === undefined ? undefined : trimRequired(item.detail);
    if (
      !title ||
      !explanation ||
      (item.detail !== undefined && !detail) ||
      !inArray(item.system, VEHICLE_SYSTEMS) ||
      !inArray(item.confidence, CONFIDENCE_LEVELS) ||
      !isStringArray(item.relatedCodes)
    ) {
      return null;
    }
    likelyCauses.push({
      title,
      system: item.system,
      confidence: item.confidence,
      explanation,
      ...(detail ? { detail } : {}),
      relatedCodes: item.relatedCodes
        .map((code) => code.trim().toUpperCase())
        .filter((code) => DTC_PATTERN.test(code)),
    });
  }

  const inspectionSteps: InspectionStep[] = [];
  for (const item of value.inspectionSteps) {
    if (!isRecord(item)) return null;
    const instruction = trimRequired(item.instruction);
    if (!instruction || !inArray(item.difficulty, STEP_DIFFICULTIES)) return null;
    inspectionSteps.push({ instruction, difficulty: item.difficulty });
  }

  const codeNotes: CodeNote[] = [];
  for (const item of value.codeNotes) {
    if (
      !isRecord(item) ||
      typeof item.code !== "string" ||
      typeof item.meaning !== "string" ||
      typeof item.manufacturerSpecific !== "boolean"
    ) {
      return null;
    }
    const code = item.code.trim().toUpperCase();
    if (inputCodes.includes(code)) {
      codeNotes.push({
        code,
        meaning: item.meaning.trim(),
        manufacturerSpecific: item.manufacturerSpecific,
      });
    }
  }
  for (const code of inputCodes) {
    if (!codeNotes.some((note) => note.code === code)) {
      codeNotes.push({
        code,
        meaning: "Meaning not provided — look this code up for your exact vehicle.",
        manufacturerSpecific: code[1] === "1" || code[1] === "3",
      });
    }
  }

  const safetyCritical =
    value.safetyCritical ||
    likelyCauses.some((cause) => SAFETY_CRITICAL_SYSTEMS.includes(cause.system));
  const recommended = seeMechanic.recommended || safetyCritical;
  const suppliedReason =
    typeof seeMechanic.reason === "string" ? seeMechanic.reason.trim() : null;
  const reason = recommended
    ? suppliedReason || "This involves a system that should be inspected by a qualified mechanic."
    : null;

  return {
    schemaVersion: DIAGNOSIS_SCHEMA_VERSION,
    round: 0,
    summary: summary.slice(0, 800),
    drivability: {
      level: drivability.level,
      headline: (drivability.headline as string).trim(),
      stopDrivingIf: drivability.stopDrivingIf.map((item) => item.trim()).slice(0, 5),
    },
    safetyCritical,
    seeMechanic: { recommended, reason },
    likelyCauses: likelyCauses.slice(0, 5),
    ruledOut: [],
    inspectionSteps: inspectionSteps.slice(0, 6),
    toolsNeeded: dedupeCaseInsensitive(value.toolsNeeded.map((item) => item.trim())).slice(0, 8),
    codeNotes,
  };
}
