import { ASSISTANT_MAX_ROUNDS } from "./assistant-types";
import { NEGATIVE_CHOICE } from "./rules";
import { DTC_PATTERN } from "./input";
import { NOT_SURE_OPTION, type AssistantTurn, type Conversation } from "./assistant-types";
import type { DiagnosticSession } from "./types";

export function deriveConversation(
  turns: AssistantTurn[],
  session: Pick<DiagnosticSession, "initialResult" | "assistantStatus">,
): Conversation {
  const supersededCount = turns.filter((turn) => turn.superseded).length;
  const live = turns.filter((turn) => !turn.superseded);
  const rounds = live
    .filter((turn): turn is Extract<AssistantTurn, { kind: "questions" }> => turn.kind === "questions")
    .sort((a, b) => a.round - b.round)
    .map((questions) => ({
      round: questions.round,
      questions,
      rediagnosis:
        live.find(
          (turn): turn is Extract<AssistantTurn, { kind: "rediagnosis" }> =>
            turn.kind === "rediagnosis" && turn.round === questions.round,
        ) ?? null,
    }));

  let next: Conversation["next"];
  const latest = rounds.at(-1);
  if (!latest) next = { kind: "start" };
  else if (!latest.questions.payload.canNarrowFurther) {
    next = { kind: "stopped", why: "nothing_to_ask" };
  } else if (!latest.rediagnosis) next = { kind: "answer", round: latest.round };
  else if (!latest.rediagnosis.result) {
    next = {
      kind: "retry",
      round: latest.round,
      reason: latest.rediagnosis.fallbackReason ?? "http_error",
    };
  } else if (latest.round >= ASSISTANT_MAX_ROUNDS) {
    next = { kind: "stopped", why: "max_rounds" };
  } else if (session.assistantStatus === "finished") {
    next = { kind: "stopped", why: "finished" };
  } else next = { kind: "ask_more", round: latest.round + 1 };

  return {
    rounds,
    supersededCount,
    next,
    baselineFor(round) {
      if (round <= 1) return session.initialResult;
      const previous = rounds.find((item) => item.round === round - 1)?.rediagnosis;
      return previous?.result ?? session.initialResult;
    },
  };
}

export function collectOwnerText(
  conversation: Conversation,
  upToRound: number,
  current?: {
    questions: Extract<AssistantTurn, { kind: "questions" }>["payload"]["questions"];
    answers: Extract<AssistantTurn, { kind: "rediagnosis" }>["payload"]["answers"];
    note: string | null;
    checkReports: Extract<AssistantTurn, { kind: "questions" }>["payload"]["checkReports"];
  },
): string[] {
  const texts: string[] = [];
  const addRound = (
    questions: typeof current extends undefined ? never : NonNullable<typeof current>["questions"],
    answers: typeof current extends undefined ? never : NonNullable<typeof current>["answers"],
    note: string | null,
    checkReports: typeof current extends undefined ? never : NonNullable<typeof current>["checkReports"],
  ) => {
    texts.push(...checkReports.flatMap((report) => (report.finding ? [report.finding] : [])));
    for (const answer of answers) {
      if (answer.text) texts.push(answer.text);
      if (answer.choice && answer.choice !== NOT_SURE_OPTION && !NEGATIVE_CHOICE.test(answer.choice)) {
        const question = questions.find((item) => item.id === answer.questionId);
        if (question) texts.push(`${question.prompt} ${answer.choice}`);
      }
    }
    if (note) texts.push(note);
  };
  for (const round of conversation.rounds) {
    if (round.round >= upToRound || !round.rediagnosis?.result) continue;
    addRound(
      round.questions.payload.questions,
      round.rediagnosis.payload.answers,
      round.rediagnosis.payload.note,
      round.questions.payload.checkReports,
    );
  }
  if (current) addRound(current.questions, current.answers, current.note, current.checkReports);
  return texts;
}

export function extractCodes(texts: string[]): string[] {
  const normalized = texts
    .join(" ")
    .toUpperCase()
    .replace(/\b([PBCU])[\s-]+(?=[0-3])/g, "$1");
  const tokens = normalized.match(/\b[PBCU][0-3][0-9A-F]{3}\b/g) ?? [];
  return [...new Set(tokens.filter((token) => DTC_PATTERN.test(token)))].slice(0, 5);
}
