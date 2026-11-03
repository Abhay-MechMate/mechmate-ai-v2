import "server-only";

import { diffResults } from "./diff";
import { extractCodes } from "./conversation";
import { askQuestionsWithAi, rediagnoseWithAi } from "./openrouter";
import {
  NOT_SURE_OPTION,
  type FloorReport,
  type QuestionsTurnPayload,
  type RediagnosisTurnInput,
  type ResultDiff,
} from "./assistant-types";
import { applyConversationFloor, diagnoseWithRules, NEGATIVE_CHOICE } from "./rules";
import type { ConversationContext } from "./assistant-prompt";
import type { AiUsage, DiagnosisResult, FallbackReason } from "./types";

export type QuestionsOutcome =
  | {
      ok: true;
      payload: Omit<QuestionsTurnPayload, "baseRound" | "checkReports">;
      model: string;
      usage: AiUsage;
      latencyMs: number;
    }
  | { ok: false; reason: FallbackReason; latencyMs: number | null };

export type RediagnosisOutcome =
  | {
      ok: true;
      result: DiagnosisResult;
      payloadExtras: {
        changes: { headline: string; reasons: string[] };
        noteReply: string | null;
        assistantState: "keep_going" | "narrowed" | "needs_shop";
        floor: FloorReport;
        diff: ResultDiff;
      };
      model: string;
      usage: AiUsage;
      latencyMs: number;
    }
  | { ok: false; reason: FallbackReason; latencyMs: number | null };

export async function generateQuestions(
  ctx: ConversationContext,
  options: { aiAllowed: boolean },
): Promise<QuestionsOutcome> {
  if (!options.aiAllowed) return { ok: false, reason: "daily_limit", latencyMs: null };
  const response = await askQuestionsWithAi(ctx);
  return response.ok
    ? {
        ok: true,
        payload: response.value,
        model: response.model,
        usage: response.usage,
        latencyMs: response.latencyMs,
      }
    : response;
}

function ownerTexts(ctx: ConversationContext, turn: RediagnosisTurnInput): string[] {
  const texts = [
    ...ctx.checkReports.flatMap((report) => (report.finding ? [report.finding] : [])),
  ];
  const scanAnswers = (
    questions: RediagnosisTurnInput["questions"],
    answers: RediagnosisTurnInput["answers"],
  ) => {
    for (const answer of answers) {
      if (answer.text) texts.push(answer.text);
      if (answer.choice && answer.choice !== NOT_SURE_OPTION && !NEGATIVE_CHOICE.test(answer.choice)) {
        const question = questions.find((item) => item.id === answer.questionId);
        if (question) texts.push(`${question.prompt} ${answer.choice}`);
      }
    }
  };
  for (const history of ctx.history) {
    scanAnswers(history.questions, history.answers);
    if (history.note) texts.push(history.note);
  }
  scanAnswers(turn.questions, turn.answers);
  if (turn.note) texts.push(turn.note);
  return texts;
}

export async function rediagnose(
  ctx: ConversationContext,
  turn: RediagnosisTurnInput,
  options: { aiAllowed: boolean },
): Promise<RediagnosisOutcome> {
  if (!options.aiAllowed) return { ok: false, reason: "daily_limit", latencyMs: null };
  const texts = ownerTexts(ctx, turn);
  const extraCodes = [...new Set([...turn.extraCodes, ...extractCodes(texts)])].slice(0, 5);
  const safeTurn = { ...turn, extraCodes };
  const response = await rediagnoseWithAi(ctx, safeTurn);
  if (!response.ok) return response;

  const allowedCodes = [...new Set([...ctx.input.dtcCodes, ...extraCodes])];
  const rulesFloor = diagnoseWithRules(
    {
      dtcCodes: allowedCodes,
      symptoms: [ctx.input.symptoms, ...texts].filter(Boolean).join("\n") || null,
    },
    ctx.vehicle,
  );
  const floored = applyConversationFloor(response.value.result, rulesFloor, ctx.baseline);
  return {
    ok: true,
    result: floored.result,
    payloadExtras: {
      changes: response.value.changes,
      noteReply: response.value.noteReply,
      assistantState: response.value.assistantState,
      floor: floored.floor,
      diff: diffResults(ctx.baseline, floored.result),
    },
    model: response.model,
    usage: response.usage,
    latencyMs: response.latencyMs,
  };
}
