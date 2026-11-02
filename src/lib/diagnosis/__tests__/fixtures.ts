import type { DiagnosisModelOutput, DiagnosisResult, VehicleSnapshot } from "../types";

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
      stopDrivingIf: ["The check-engine light starts flashing"],
    },
    safetyCritical: false,
    seeMechanic: { recommended: false, reason: null },
    likelyCauses: [
      {
        title: "Aging catalytic converter",
        system: "emissions",
        confidence: "high",
        explanation: "This is the most common cause of P0420 at higher mileage.",
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
  return { schemaVersion: 1, ...validModelOutput() };
}
