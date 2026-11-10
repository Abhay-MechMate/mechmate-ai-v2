import { DTC_KNOWLEDGE, SYMPTOM_RULES, describeUnknownCode } from "./dtc-knowledge";
import {
  DIAGNOSIS_SCHEMA_VERSION,
  DRIVABILITY_LEVELS,
  type DiagnosisInput,
  type DiagnosisResult,
  type DrivabilityLevel,
  type InspectionStep,
  type LikelyCause,
  type VehicleSnapshot,
} from "./types";
import type { SymptomRule } from "./dtc-knowledge";
import type { FloorReport } from "./assistant-types";

export const HANDS_ON_PATTERN =
  /\b(remove|disconnect|unplug|unbolt|disassemble|bleed|jack up|pull (the|off))\b/i;
export const NEGATIVE_CHOICE =
  /^\s*(no|not|none|never|nothing|didn't|doesn't|isn't|wasn't)\b/i;
const DRIVING_STEP_PATTERN =
  /\b(test[- ]drive|road test|drive it|take it for a drive)\b/i;

const CONFIDENCE_RANK = { high: 0, medium: 1, low: 2 } as const;

function dedupeStrings(values: string[], limit = Number.POSITIVE_INFINITY): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key) || seen.size >= limit) return false;
    seen.add(key);
    return true;
  });
}

function stopWarningsForLevel(
  level: DrivabilityLevel,
  warnings: string[],
): string[] {
  return level === "drive_to_shop_only" || level === "do_not_drive"
    ? dedupeStrings(warnings, 4)
    : [];
}

function dedupeSteps(steps: InspectionStep[]): InspectionStep[] {
  const seen = new Set<string>();
  return steps.filter((step) => {
    const key = step.instruction.toLowerCase();
    if (seen.has(key) || seen.size >= 6) return false;
    seen.add(key);
    return true;
  });
}

function mergeCauses(causes: LikelyCause[]): LikelyCause[] {
  const merged: LikelyCause[] = [];
  const indexes = new Map<string, number>();
  for (const cause of causes) {
    const key = cause.title.toLowerCase();
    const existingIndex = indexes.get(key);
    if (existingIndex === undefined) {
      indexes.set(key, merged.length);
      merged.push({ ...cause, relatedCodes: [...cause.relatedCodes] });
    } else {
      merged[existingIndex].relatedCodes = dedupeStrings([
        ...merged[existingIndex].relatedCodes,
        ...cause.relatedCodes,
      ]);
    }
  }
  return merged.slice(0, 5);
}

function vehicleLabel(vehicle: VehicleSnapshot): string {
  return vehicle.nickname || [vehicle.modelYear, vehicle.make, vehicle.model].filter(Boolean).join(" ");
}

export function matchSymptomRules(symptoms: string | null): SymptomRule[] {
  if (!symptoms) return [];
  return SYMPTOM_RULES.filter((rule) => rule.pattern.test(symptoms));
}

export function moreSevere(
  a: DrivabilityLevel,
  b: DrivabilityLevel,
): DrivabilityLevel {
  return DRIVABILITY_LEVELS.indexOf(a) >= DRIVABILITY_LEVELS.indexOf(b) ? a : b;
}

export function diagnoseWithRules(
  input: DiagnosisInput,
  vehicle: VehicleSnapshot,
): DiagnosisResult {
  const knownCodes = input.dtcCodes.filter((code) => code in DTC_KNOWLEDGE);
  const unknownCodes = input.dtcCodes.filter((code) => !(code in DTC_KNOWLEDGE));
  const symptomRules = matchSymptomRules(input.symptoms);
  const hasMisfireAndCatalyst =
    input.dtcCodes.some((code) => /^P030[0-8]$/.test(code)) && input.dtcCodes.includes("P0420");

  const codeOrder = hasMisfireAndCatalyst
    ? [
        ...knownCodes.filter((code) => /^P030[0-8]$/.test(code)),
        ...knownCodes.filter((code) => !/^P030[0-8]$/.test(code)),
      ]
    : knownCodes;

  const misfireCauses: LikelyCause[] = [];
  const otherCauses: LikelyCause[] = [];
  for (const code of codeOrder) {
    const target = hasMisfireAndCatalyst && /^P030[0-8]$/.test(code) ? misfireCauses : otherCauses;
    for (const cause of DTC_KNOWLEDGE[code].causes) {
      target.push({
        ...cause,
        explanation:
          code === "P0420" && cause.title === "Aging or failed catalytic converter" && hasMisfireAndCatalyst
            ? `${cause.explanation} Fix the misfire first — it can damage the converter.`
            : cause.explanation,
        relatedCodes: [code],
      });
    }
  }
  for (const rule of symptomRules) {
    for (const cause of rule.causes) {
      otherCauses.push({ ...cause, system: rule.system, relatedCodes: [] });
    }
  }
  for (const code of unknownCodes) {
    const info = describeUnknownCode(code);
    otherCauses.push({
      title: `Fault in ${info.area}`,
      system: info.system,
      confidence: "low",
      explanation:
        "MechMate's built-in guide doesn't include this code; its exact meaning depends on your vehicle." +
        (info.manufacturerSpecific ? " This is a manufacturer-specific code." : ""),
      relatedCodes: [code],
    });
  }

  const sortByConfidence = (a: LikelyCause, b: LikelyCause) =>
    CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence];
  const likelyCauses = mergeCauses([
    ...misfireCauses.sort(sortByConfidence),
    ...otherCauses.sort(sortByConfidence),
  ]);

  let drivabilityLevel: DrivabilityLevel =
    input.dtcCodes.length === 0 && symptomRules.length === 0 ? "drive_with_caution" : "ok_to_drive";
  for (const rule of symptomRules) drivabilityLevel = moreSevere(drivabilityLevel, rule.drivability);
  for (const code of knownCodes) {
    drivabilityLevel = moreSevere(drivabilityLevel, DTC_KNOWLEDGE[code].drivability);
  }
  for (const code of unknownCodes) {
    drivabilityLevel = moreSevere(
      drivabilityLevel,
      describeUnknownCode(code).safetyCritical ? "drive_with_caution" : "ok_to_drive",
    );
  }

  const headlineSource = [
    ...symptomRules.map((rule) => ({ level: rule.drivability, headline: rule.headline })),
    ...knownCodes.map((code) => ({
      level: DTC_KNOWLEDGE[code].drivability,
      headline: DTC_KNOWLEDGE[code].headline,
    })),
  ].find((source) => source.level === drivabilityLevel);
  const headline = headlineSource?.headline ??
    (unknownCodes.length > 0
      ? "We can't tell how serious this is from the code alone — drive gently until it's checked."
      : "We can't tell how serious this is yet — drive gently and get it checked soon.");

  const stopDrivingIf = stopWarningsForLevel(
    drivabilityLevel,
    [
      ...symptomRules.flatMap((rule) => rule.stopDrivingIf),
      ...knownCodes.flatMap((code) => DTC_KNOWLEDGE[code].stopDrivingIf),
    ],
  );

  const unknownInfo = unknownCodes.map(describeUnknownCode);
  const safetyCritical =
    symptomRules.some((rule) => rule.safetyCritical) ||
    knownCodes.some((code) => DTC_KNOWLEDGE[code].safetyCritical) ||
    unknownInfo.some((info) => info.safetyCritical);
  const mechanicReason = symptomRules.find((rule) => rule.mechanicReason)?.mechanicReason ??
    (unknownInfo.some((info) => info.safetyCritical)
      ? "Chassis and airbag codes involve safety systems that need professional diagnosis."
      : "This involves a safety-critical system.");

  const safetyRules = symptomRules.filter((rule) => rule.safetyCritical);
  let inspectionSteps: InspectionStep[];
  let tools: string[];
  if (safetyRules.length > 0) {
    inspectionSteps = safetyRules.flatMap((rule) => rule.steps.map((step) => ({ ...step })));
    tools = safetyRules.flatMap((rule) => rule.tools);
  } else {
    inspectionSteps = [
      ...symptomRules.flatMap((rule) => rule.steps.map((step) => ({ ...step }))),
      ...knownCodes.flatMap((code) => DTC_KNOWLEDGE[code].steps.map((step) => ({ ...step }))),
    ];
    tools = [
      ...symptomRules.flatMap((rule) => rule.tools),
      ...knownCodes.flatMap((code) => DTC_KNOWLEDGE[code].tools),
    ];
    if (unknownCodes.length > 0) {
      inspectionSteps.push(
        { instruction: "Double-check the code was typed correctly and scan for any other codes and freeze-frame data.", difficulty: "diy_moderate" },
        { instruction: "Look up this code's exact meaning for your vehicle in a service manual or repair database.", difficulty: "diy_easy" },
      );
      tools.push("OBD-II scanner");
    }
  }
  if (inspectionSteps.length === 0) {
    inspectionSteps = [
      { instruction: "Scan the car for trouble codes — many parts stores do this free.", difficulty: "diy_easy" },
      { instruction: "Note exactly when it happens: cold or warm engine, speed, braking, turning.", difficulty: "diy_easy" },
      { instruction: "Check engine oil and coolant levels with the engine off and cool.", difficulty: "diy_easy" },
      { instruction: "Look under the car for fresh drips or leaks.", difficulty: "diy_easy" },
    ];
  }
  inspectionSteps = dedupeSteps(inspectionSteps);
  const toolsNeeded = dedupeStrings(tools, 8);

  const codeNotes = input.dtcCodes.map((code) => {
    const entry = DTC_KNOWLEDGE[code];
    if (entry) return { code, meaning: entry.title, manufacturerSpecific: false };
    const info = describeUnknownCode(code);
    return {
      code,
      meaning: `Not in MechMate's built-in guide — relates to ${info.area}.`,
      manufacturerSpecific: info.manufacturerSpecific,
    };
  });

  let summary: string;
  if (knownCodes.length > 0) {
    const meanings = knownCodes
      .map((code) => `${code} means ${DTC_KNOWLEDGE[code].title.toLowerCase()}`)
      .join("; ");
    summary = `${vehicleLabel(vehicle)}: ${meanings}. The most likely cause is ${likelyCauses[0].title.toLowerCase()}, but confirm it with the checks below before buying parts.`;
  } else if (symptomRules.length > 0) {
    summary = `Based on your description, this most likely involves the ${symptomRules[0].system.replaceAll("_", " ")} system. ${symptomRules[0].headline}`;
  } else if (unknownCodes.length > 0) {
    const isAre = unknownCodes.length === 1 ? "is" : "are";
    summary = `${unknownCodes.join(", ")} ${isAre} not in MechMate's built-in guide. Based on the code structure, it relates to ${unknownInfo[0].area}.`;
  } else {
    summary = "MechMate's built-in guide can't narrow this down from the description alone. Start with the general checks below, and scanning for trouble codes will help most.";
  }

  return {
    schemaVersion: DIAGNOSIS_SCHEMA_VERSION,
    round: 0,
    summary,
    drivability: { level: drivabilityLevel, headline, stopDrivingIf },
    safetyCritical,
    seeMechanic: safetyCritical
      ? { recommended: true, reason: mechanicReason }
      : { recommended: false, reason: null },
    likelyCauses,
    ruledOut: [],
    inspectionSteps,
    toolsNeeded,
    codeNotes,
  };
}

export function applySafetyFloor(
  ai: DiagnosisResult,
  rules: DiagnosisResult,
): DiagnosisResult {
  const rulesWon =
    DRIVABILITY_LEVELS.indexOf(rules.drivability.level) >
    DRIVABILITY_LEVELS.indexOf(ai.drivability.level);
  const level = moreSevere(ai.drivability.level, rules.drivability.level);
  const stopDrivingIf = stopWarningsForLevel(
    level,
    rulesWon
      ? [...rules.drivability.stopDrivingIf, ...ai.drivability.stopDrivingIf]
      : ai.drivability.stopDrivingIf,
  );
  return {
    ...ai,
    drivability: rulesWon
      ? {
          level,
          headline: rules.drivability.headline,
          stopDrivingIf,
        }
      : { ...ai.drivability, stopDrivingIf },
    safetyCritical: ai.safetyCritical || rules.safetyCritical,
    seeMechanic: {
      recommended: ai.seeMechanic.recommended || rules.seeMechanic.recommended,
      reason: ai.seeMechanic.reason || rules.seeMechanic.reason,
    },
  };
}

export function applyConversationFloor(
  ai: DiagnosisResult,
  rulesFloor: DiagnosisResult,
  previous: DiagnosisResult,
): { result: DiagnosisResult; floor: FloorReport } {
  const severity = (result: DiagnosisResult) =>
    DRIVABILITY_LEVELS.indexOf(result.drivability.level);
  const rulesRaised =
    severity(rulesFloor) > severity(ai) ||
    (!ai.safetyCritical && rulesFloor.safetyCritical) ||
    (!ai.seeMechanic.recommended && rulesFloor.seeMechanic.recommended);
  const afterRules = applySafetyFloor(ai, rulesFloor);
  const previousKept =
    severity(previous) > severity(afterRules) ||
    (!afterRules.safetyCritical && previous.safetyCritical) ||
    (!afterRules.seeMechanic.recommended && previous.seeMechanic.recommended);
  let result = applySafetyFloor(afterRules, previous);
  let stepsReplaced = false;

  if (severity(result) >= DRIVABILITY_LEVELS.indexOf("drive_to_shop_only")) {
    if (severity(previous) > severity(afterRules)) {
      result = {
        ...result,
        inspectionSteps: previous.inspectionSteps,
        toolsNeeded: previous.toolsNeeded,
      };
      stepsReplaced = true;
    } else if (severity(rulesFloor) > severity(ai)) {
      result = {
        ...result,
        inspectionSteps: rulesFloor.inspectionSteps,
        toolsNeeded: rulesFloor.toolsNeeded,
      };
      stepsReplaced = true;
    }
  }

  if (
    result.safetyCritical ||
    severity(result) >= DRIVABILITY_LEVELS.indexOf("drive_to_shop_only")
  ) {
    const safeSteps = result.inspectionSteps.filter(
      (step) =>
        !HANDS_ON_PATTERN.test(step.instruction) &&
        !DRIVING_STEP_PATTERN.test(step.instruction),
    );
    if (safeSteps.length !== result.inspectionSteps.length) {
      result = {
        ...result,
        inspectionSteps:
          safeSteps.length > 0 ? safeSteps : rulesFloor.inspectionSteps,
        toolsNeeded: safeSteps.length > 0 ? result.toolsNeeded : rulesFloor.toolsNeeded,
      };
      stepsReplaced = true;
    }
  }

  return { result, floor: { rulesRaised, previousKept, stepsReplaced } };
}
