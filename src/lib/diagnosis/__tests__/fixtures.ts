import type {
  DiagnosisModelOutput,
  DiagnosisResult,
  DiagnosisResultV1,
  VehicleSnapshot,
} from "../types";

export const vehicle: VehicleSnapshot = {
  nickname: null,
  modelYear: 2014,
  make: "Toyota",
  model: "Camry",
  trimName: "LE",
  engine: "2.5L",
  mileage: 142000,
};

export function validModelOutput(): DiagnosisModelOutput {
  return {
    summary: "The catalyst code needs diagnosis, but the car is currently safe to drive.",
    drivability: {
      level: "ok_to_drive",
      headline: "Safe to drive short-term; arrange a diagnosis soon.",
      stopDrivingIf: [],
    },
    safetyCritical: false,
    seeMechanic: { recommended: false, reason: null },
    likelyCauses: [
      {
        title: "Aging catalytic converter",
        system: "emissions",
        confidence: "high",
        explanation: "This is the most common cause of P0420 at higher mileage.",
        detail: "Verify the oxygen-sensor readings and check for exhaust leaks first.",
        relatedCodes: ["P0420"],
      },
    ],
    inspectionSteps: [
      { instruction: "Check for other codes first.", difficulty: "diy_easy" },
      { instruction: "Inspect for exhaust leaks.", difficulty: "diy_easy" },
    ],
    toolsNeeded: ["OBD-II scanner", "Flashlight"],
    codeNotes: [
      {
        code: "P0420",
        meaning: "Catalytic converter efficiency below threshold.",
        manufacturerSpecific: false,
      },
    ],
  };
}

export function validResult(): DiagnosisResult {
  return { schemaVersion: 2, round: 0, ruledOut: [], ...validModelOutput() };
}

export function validV1Result(): DiagnosisResultV1 {
  return { schemaVersion: 1, ...validModelOutput() };
}

export function validQuestionsOutput() {
  return {
    intro: "Two readings will split the converter from the sensors:",
    canNarrowFurther: true,
    stopReason: null,
    questions: [
      {
        kind: "single_choice",
        prompt: "At steady rpm, what does the downstream oxygen sensor show?",
        why: "This shows whether the converter is storing oxygen.",
        options: ["Steady", "Switching like upstream"],
        requires: "scan_tool",
        targets: ["Aging catalytic converter"],
      },
      {
        kind: "short_text",
        prompt: "Do you see soot around the exhaust joints?",
        why: "A leak can skew the oxygen-sensor reading.",
        options: [],
        requires: "look_listen",
        targets: ["Aging catalytic converter"],
      },
    ],
  };
}

export function validRediagnosisOutput() {
  return {
    ...validModelOutput(),
    ruledOut: [],
    changes: {
      headline: "The downstream reading makes the sensor more likely.",
      reasons: ["The downstream signal stayed steady while the upstream signal switched."],
    },
    noteReply: null,
    assistantState: "narrowed",
  };
}
