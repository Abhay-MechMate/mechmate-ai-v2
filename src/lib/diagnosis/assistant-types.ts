import type {
  AiUsage,
  AssistantStatus,
  Confidence,
  DiagnosisResult,
  DrivabilityLevel,
  FallbackReason,
} from "./types";

export const ASSISTANT_MAX_ROUNDS = 3;
export const ASSISTANT_MIN_QUESTIONS = 2;
export const ASSISTANT_MAX_QUESTIONS = 4;
export const MAX_CHECK_REPORTS = 6;
export const MAX_FINDING_LENGTH = 200;
export const MAX_ANSWER_LENGTH = 200;
export const MAX_NOTE_LENGTH = 500;
export const MAX_TURNS_PER_SESSION = 10;
export const AI_ASSISTANT_DAILY_LIMIT = 24;

export function assistantDailyLimit(): number {
  const value = Number.parseInt(process.env.ASSISTANT_DAILY_LIMIT ?? "", 10);
  return Number.isInteger(value) && value > 0 ? value : AI_ASSISTANT_DAILY_LIMIT;
}

export const QUESTION_KINDS = ["single_choice", "short_text"] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

export const QUESTION_REQUIREMENTS = [
  "nothing",
  "look_listen",
  "scan_tool",
  "hand_tools",
  "test_drive",
] as const;
export type QuestionRequirement = (typeof QUESTION_REQUIREMENTS)[number];

export const ASSISTANT_STATES = ["keep_going", "narrowed", "needs_shop"] as const;
export type AssistantState = (typeof ASSISTANT_STATES)[number];
export const NOT_SURE_OPTION = "Didn't check / not sure";

export type AssistantQuestion = {
  id: string;
  kind: QuestionKind;
  prompt: string;
  why: string;
  options: string[];
  requires: QuestionRequirement;
  targets: string[];
};

export type CheckReport = { step: string; finding: string | null };

export type QuestionsTurnPayload = {
  baseRound: number;
  checkReports: CheckReport[];
  intro: string;
  canNarrowFurther: boolean;
  stopReason: string | null;
  questions: AssistantQuestion[];
};

export type AssistantAnswer = {
  questionId: string;
  choice: string | null;
  text: string | null;
};

export type CauseMove = {
  title: string;
  fromRank: number | null;
  toRank: number | null;
  fromConfidence: Confidence | null;
  toConfidence: Confidence | null;
};

export type ResultDiff = {
  verdict: { from: DrivabilityLevel; to: DrivabilityLevel } | null;
  causes: CauseMove[];
  newlyRuledOut: string[];
  firstStepChanged: boolean;
};

export type FloorReport = {
  rulesRaised: boolean;
  previousKept: boolean;
  stepsReplaced: boolean;
};

export type RediagnosisTurnPayload = {
  answers: AssistantAnswer[];
  note: string | null;
  extraCodes: string[];
  changes: { headline: string; reasons: string[] } | null;
  noteReply: string | null;
  assistantState: AssistantState | null;
  floor: FloorReport | null;
  diff: ResultDiff | null;
};

type TurnMeta = {
  id: string;
  round: number;
  source: "ai" | "none";
  model: string | null;
  fallbackReason: FallbackReason | null;
  createdAt: string;
  superseded: boolean;
};

export type AssistantTurn =
  | ({ kind: "questions"; payload: QuestionsTurnPayload } & TurnMeta)
  | ({
      kind: "rediagnosis";
      payload: RediagnosisTurnPayload;
      result: DiagnosisResult | null;
    } & TurnMeta);

export type NextAction =
  | { kind: "start" }
  | { kind: "answer"; round: number }
  | { kind: "retry"; round: number; reason: FallbackReason }
  | { kind: "ask_more"; round: number }
  | { kind: "stopped"; why: "max_rounds" | "nothing_to_ask" | "finished" };

export type ConversationRound = {
  round: number;
  questions: Extract<AssistantTurn, { kind: "questions" }>;
  rediagnosis: Extract<AssistantTurn, { kind: "rediagnosis" }> | null;
};

export type Conversation = {
  rounds: ConversationRound[];
  supersededCount: number;
  next: NextAction;
  baselineFor: (round: number) => DiagnosisResult;
};

export type ConversationSession = {
  initialResult: DiagnosisResult;
  assistantStatus: AssistantStatus;
};

export type RediagnosisTurnInput = {
  questions: AssistantQuestion[];
  answers: AssistantAnswer[];
  note: string | null;
  extraCodes: string[];
};

export type AiResponse<T> =
  | { ok: true; value: T; model: string; usage: AiUsage; latencyMs: number }
  | { ok: false; reason: FallbackReason; latencyMs: number };
