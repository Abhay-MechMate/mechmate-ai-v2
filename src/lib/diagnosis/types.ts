export const DIAGNOSIS_SCHEMA_VERSION = 2 as const;

export const DRIVABILITY_LEVELS = [
  "ok_to_drive",
  "drive_with_caution",
  "drive_to_shop_only",
  "do_not_drive",
] as const;
export type DrivabilityLevel = (typeof DRIVABILITY_LEVELS)[number];

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export const STEP_DIFFICULTIES = [
  "diy_easy",
  "diy_moderate",
  "shop_recommended",
] as const;
export type StepDifficulty = (typeof STEP_DIFFICULTIES)[number];

export const VEHICLE_SYSTEMS = [
  "engine", "ignition", "fuel", "air_intake", "emissions", "exhaust", "cooling",
  "electrical", "transmission", "brakes", "steering", "suspension", "tires_wheels",
  "hvac", "body", "srs_airbag", "hybrid_ev", "network", "other",
] as const;
export type VehicleSystem = (typeof VEHICLE_SYSTEMS)[number];

export const SAFETY_CRITICAL_SYSTEMS: readonly VehicleSystem[] = [
  "brakes", "steering", "suspension", "tires_wheels", "srs_airbag", "hybrid_ev",
];

export type LikelyCause = {
  title: string;
  system: VehicleSystem;
  confidence: Confidence;
  explanation: string;
  detail?: string;
  settlingTest?: string;
  relatedCodes: string[];
};

export type InspectionStep = {
  instruction: string;
  difficulty: StepDifficulty;
};

export type CodeNote = {
  code: string;
  meaning: string;
  manufacturerSpecific: boolean;
};

export type RuledOutCause = {
  title: string;
  reason: string;
};

export type DiagnosisResult = {
  schemaVersion: typeof DIAGNOSIS_SCHEMA_VERSION;
  round: number;
  summary: string;
  drivability: {
    level: DrivabilityLevel;
    headline: string;
    stopDrivingIf: string[];
  };
  safetyCritical: boolean;
  seeMechanic: { recommended: boolean; reason: string | null };
  likelyCauses: LikelyCause[];
  ruledOut: RuledOutCause[];
  inspectionSteps: InspectionStep[];
  toolsNeeded: string[];
  codeNotes: CodeNote[];
};

export type DiagnosisModelOutput = Omit<
  DiagnosisResult,
  "schemaVersion" | "round" | "ruledOut"
>;

export type DiagnosisResultV1 = Omit<
  DiagnosisResult,
  "schemaVersion" | "round" | "ruledOut"
> & { schemaVersion: 1 };

export type AssistantStatus = "not_started" | "active" | "finished";

export type VehicleSnapshot = {
  nickname: string | null;
  modelYear: number | null;
  make: string;
  model: string;
  trimName: string | null;
  engine: string | null;
  mileage: number | null;
};

export type DiagnosisInput = {
  dtcCodes: string[];
  symptoms: string | null;
};

export type ResultSource = "ai" | "rules";

export type FallbackReason =
  | "not_configured"
  | "daily_limit"
  | "credits_exhausted"
  | "auth_error"
  | "rate_limited"
  | "http_error"
  | "timeout"
  | "network_error"
  | "invalid_output";

export type AiUsage = {
  promptTokens: number | null;
  completionTokens: number | null;
  costUsd: number | null;
};

export type DiagnosisOutcome = {
  result: DiagnosisResult;
  source: ResultSource;
  model: string | null;
  fallbackReason: FallbackReason | null;
  usage: AiUsage | null;
  latencyMs: number | null;
};

export type DiagnosticSession = {
  id: string;
  vehicleId: string | null;
  vehicleSnapshot: VehicleSnapshot;
  dtcCodes: string[];
  symptoms: string | null;
  result: DiagnosisResult;
  initialResult: DiagnosisResult;
  revision: number;
  assistantStatus: AssistantStatus;
  resultSource: ResultSource;
  model: string | null;
  fallbackReason: FallbackReason | null;
  createdAt: string;
};

export type DiagnosticSessionSummary = {
  id: string;
  vehicleSnapshot: VehicleSnapshot;
  dtcCodes: string[];
  symptoms: string | null;
  drivabilityLevel: DrivabilityLevel | null;
  topCause: string | null;
  resultSource: ResultSource;
  refinedRound: number;
  createdAt: string;
};
