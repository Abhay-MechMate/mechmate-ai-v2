"use server";

import {
  applyRediagnosisTurn,
  countRecentAssistantTurns,
  countSessionTurns,
  listTurns,
  recordQuestionsTurn,
  setAssistantStatus,
} from "@/app/diagnose/assistant-data";
import { getSession } from "@/app/diagnose/data";
import { generateQuestions, rediagnose } from "@/lib/diagnosis/assistant-engine";
import {
  ASSISTANT_MAX_ROUNDS,
  MAX_CHECK_REPORTS,
  MAX_FINDING_LENGTH,
  MAX_TURNS_PER_SESSION,
  NOT_SURE_OPTION,
  assistantDailyLimit,
  type RediagnosisTurnInput,
  type RediagnosisTurnPayload,
} from "@/lib/diagnosis/assistant-types";
import { parseAnswers } from "@/lib/diagnosis/assistant-validate";
import { deriveConversation, extractCodes } from "@/lib/diagnosis/conversation";
import type { ConversationContext } from "@/lib/diagnosis/assistant-prompt";
import type { FallbackReason } from "@/lib/diagnosis/types";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type AssistantActionState = {
  error: string | null;
  values?: Record<string, string>;
};

const CONFLICT = "This diagnosis changed in another tab. Reload to see the latest.";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function errorLabel(reason: FallbackReason): string {
  if (reason === "credits_exhausted") {
    return "MechMate's AI budget for this month is used up. Your report still works; the assistant will be back next month.";
  }
  if (reason === "daily_limit") {
    return "You've used today's assistant limit (24 replies per 24 hours). Your report is unchanged.";
  }
  return `I couldn't update the diagnosis right now (${reason.replaceAll("_", " ")}). Your report is unchanged. Try again in a minute.`;
}

function historyFor(
  conversation: ReturnType<typeof deriveConversation>,
  round: number,
): ConversationContext["history"] {
  return conversation.rounds
    .filter((item) => item.round < round && item.rediagnosis?.result)
    .map((item) => ({
      questions: item.questions.payload.questions,
      answers: item.rediagnosis!.payload.answers,
      note: item.rediagnosis!.payload.note,
    }));
}

function checkReportsThrough(
  conversation: ReturnType<typeof deriveConversation>,
  round: number,
) {
  return conversation.rounds
    .filter((item) => item.round <= round)
    .flatMap((item) => item.questions.payload.checkReports);
}

async function authenticatedContext(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");
  const session = await getSession(supabase, sessionId);
  if (!session) return { error: "This diagnosis no longer exists." as const };
  const turns = await listTurns(supabase, sessionId);
  if (!turns) return { error: "The assistant history couldn't be loaded. Try again." as const };
  return { supabase, user, session, conversation: deriveConversation(turns, session) };
}

export async function startRoundAction(
  _prev: AssistantActionState,
  formData: FormData,
): Promise<AssistantActionState> {
  const sessionId = text(formData, "sessionId");
  const expectedRevision = Number(text(formData, "expectedRevision"));
  const ctx = await authenticatedContext(sessionId);
  if ("error" in ctx) return { error: ctx.error ?? "The assistant couldn't be loaded." };
  if (expectedRevision !== ctx.session.revision) return { error: CONFLICT };
  if (ctx.conversation.next.kind === "answer") {
    redirect(`/diagnose/${sessionId}/assistant#round-${ctx.conversation.next.round}`);
  }
  if (ctx.conversation.next.kind !== "start" && ctx.conversation.next.kind !== "ask_more") {
    return { error: "Finish or reopen the current assistant round before asking more questions." };
  }
  if (await countSessionTurns(ctx.supabase, sessionId) >= MAX_TURNS_PER_SESSION) {
    return { error: "This conversation has reached its limit. Start a new diagnosis to keep going." };
  }
  const recent = await countRecentAssistantTurns(ctx.supabase, ctx.user.id);
  if (recent.count >= assistantDailyLimit()) return { error: errorLabel("daily_limit") };

  const round = ctx.conversation.next.kind === "start" ? 1 : ctx.conversation.next.round;
  const checkReports = ctx.session.result.inspectionSteps
    .slice(0, MAX_CHECK_REPORTS)
    .flatMap((step, index) => {
      if (text(formData, `check-${index}-done`) !== "on") return [];
      const finding = text(formData, `check-${index}-finding`).slice(0, MAX_FINDING_LENGTH);
      return [{ step: step.instruction, finding: finding || null }];
    });
  const allChecks = [...checkReportsThrough(ctx.conversation, round - 1), ...checkReports];
  const ai = await generateQuestions({
    input: { dtcCodes: ctx.session.dtcCodes, symptoms: ctx.session.symptoms },
    vehicle: ctx.session.vehicleSnapshot,
    baseline: ctx.conversation.baselineFor(round),
    round,
    checkReports: allChecks,
    history: historyFor(ctx.conversation, round),
  }, { aiAllowed: true });
  if (!ai.ok) return { error: errorLabel(ai.reason) };

  const write = await recordQuestionsTurn(ctx.supabase, {
    sessionId,
    expectedRevision,
    round,
    payload: {
      baseRound: ctx.conversation.baselineFor(round).round,
      checkReports,
      ...ai.payload,
    },
    model: ai.model,
    usage: ai.usage,
    latencyMs: ai.latencyMs,
  });
  if (!write.ok && write.error === "conflict") return { error: CONFLICT };
  if (!write.ok && write.error !== "duplicate") {
    return { error: "The questions were generated but couldn't be saved. Try again." };
  }
  redirect(`/diagnose/${sessionId}/assistant#round-${round}`);
}

export async function submitAnswersAction(
  _prev: AssistantActionState,
  formData: FormData,
): Promise<AssistantActionState> {
  const values = Object.fromEntries(
    [...formData.entries()].flatMap(([key, value]) => typeof value === "string" ? [[key, value]] : []),
  );
  const sessionId = text(formData, "sessionId");
  const expectedRevision = Number(text(formData, "expectedRevision"));
  const round = Number(text(formData, "round"));
  const mode = text(formData, "mode");
  const ctx = await authenticatedContext(sessionId);
  if ("error" in ctx) return { error: ctx.error ?? "The assistant couldn't be loaded.", values };
  if (expectedRevision !== ctx.session.revision) return { error: CONFLICT, values };
  if (!Number.isInteger(round) || round < 1 || round > ASSISTANT_MAX_ROUNDS) {
    return { error: "That assistant round isn't valid.", values };
  }
  const conversationRound = ctx.conversation.rounds.find((item) => item.round === round);
  if (!conversationRound) return { error: "Those questions are no longer open.", values };
  const existing = conversationRound.rediagnosis;
  if (mode === "answer" && existing) return { error: "This round was already answered.", values };
  if (mode === "retry" && (!existing || existing.result)) return { error: "There is no failed update to retry.", values };
  if (mode === "edit" && !existing?.result) return { error: "There is no completed answer to edit.", values };
  if (!(["answer", "retry", "edit"] as const).includes(mode as "answer" | "retry" | "edit")) {
    return { error: "That assistant action isn't valid.", values };
  }

  let turn: RediagnosisTurnInput;
  if (mode === "retry") {
    turn = {
      questions: conversationRound.questions.payload.questions,
      answers: existing!.payload.answers,
      note: existing!.payload.note,
      extraCodes: existing!.payload.extraCodes,
    };
  } else {
    const parsed = parseAnswers(formData, conversationRound.questions.payload.questions);
    if (parsed.error) return { error: parsed.error, values };
    turn = parsed.turn;
  }
  const realAnswer = turn.answers.some(
    (answer) => answer.text || (answer.choice && answer.choice !== NOT_SURE_OPTION),
  );
  if (!realAnswer && !turn.note) {
    return { error: "Answer at least one question (or add a note) so I have something to work with.", values };
  }
  const ownerText = [
    ...turn.answers.flatMap((answer) => [answer.text, answer.choice].filter((item): item is string => Boolean(item))),
    ...(turn.note ? [turn.note] : []),
  ];
  turn.extraCodes = extractCodes(ownerText);

  if (await countSessionTurns(ctx.supabase, sessionId) >= MAX_TURNS_PER_SESSION) {
    return { error: "This conversation has reached its limit. Start a new diagnosis to keep going.", values };
  }
  const recent = await countRecentAssistantTurns(ctx.supabase, ctx.user.id);
  const aiAllowed = recent.count < assistantDailyLimit();
  const baseline = ctx.conversation.baselineFor(round);
  const aiContext: ConversationContext = {
    input: { dtcCodes: ctx.session.dtcCodes, symptoms: ctx.session.symptoms },
    vehicle: ctx.session.vehicleSnapshot,
    baseline,
    round,
    checkReports: checkReportsThrough(ctx.conversation, round),
    history: historyFor(ctx.conversation, round),
  };
  const outcome = await rediagnose(aiContext, turn, { aiAllowed });
  if (!outcome.ok && mode === "edit") return { error: errorLabel(outcome.reason), values };

  const failedPayload: RediagnosisTurnPayload = {
    answers: turn.answers,
    note: turn.note,
    extraCodes: turn.extraCodes,
    changes: null,
    noteReply: null,
    assistantState: null,
    floor: null,
    diff: null,
  };
  const write = await applyRediagnosisTurn(ctx.supabase, {
    sessionId,
    expectedRevision,
    round,
    payload: outcome.ok ? { ...failedPayload, ...outcome.payloadExtras } : failedPayload,
    result: outcome.ok ? outcome.result : null,
    model: outcome.ok ? outcome.model : null,
    fallbackReason: outcome.ok ? null : outcome.reason,
    usage: outcome.ok ? outcome.usage : null,
    latencyMs: outcome.latencyMs,
    finish: outcome.ok && round === ASSISTANT_MAX_ROUNDS,
  });
  if (!write.ok) {
    if (write.error === "conflict") return { error: CONFLICT, values };
    return { error: "The assistant update couldn't be saved. Reload and try again.", values };
  }
  redirect(
    outcome.ok
      ? `/diagnose/${sessionId}#assistant-update`
      : `/diagnose/${sessionId}/assistant#update-${round}`,
  );
}

export async function finishAssistantAction(formData: FormData): Promise<void> {
  const sessionId = text(formData, "sessionId");
  const ctx = await authenticatedContext(sessionId);
  if (!("error" in ctx)) await setAssistantStatus(ctx.supabase, sessionId, "finished");
  redirect(`/diagnose/${sessionId}`);
}

export async function reopenAssistantAction(formData: FormData): Promise<void> {
  const sessionId = text(formData, "sessionId");
  const ctx = await authenticatedContext(sessionId);
  if (!("error" in ctx) && ctx.conversation.rounds.length < ASSISTANT_MAX_ROUNDS) {
    await setAssistantStatus(ctx.supabase, sessionId, "active");
  }
  redirect(`/diagnose/${sessionId}/assistant`);
}

export async function startAssistant(
  prev: AssistantActionState,
  formData: FormData,
): Promise<AssistantActionState> {
  return startRoundAction(prev, formData);
}

export async function submitAnswers(
  prev: AssistantActionState,
  formData: FormData,
): Promise<AssistantActionState> {
  return submitAnswersAction(prev, formData);
}
