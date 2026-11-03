import {
  ASSISTANT_MAX_QUESTIONS,
  ASSISTANT_MIN_QUESTIONS,
  ASSISTANT_STATES,
  MAX_ANSWER_LENGTH,
  MAX_NOTE_LENGTH,
  NOT_SURE_OPTION,
  QUESTION_KINDS,
  QUESTION_REQUIREMENTS,
  type AssistantAnswer,
  type AssistantQuestion,
  type AssistantState,
  type QuestionsTurnPayload,
  type RediagnosisTurnInput,
} from "./assistant-types";
import { HANDS_ON_PATTERN } from "./rules";
import { parseDiagnosisOutput } from "./validate";
import type { DiagnosisResult, RuledOutCause } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function trimmed(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim() || null;
}

function enumValue<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && values.includes(value as T);
}

export type QuestionsParsed = Omit<QuestionsTurnPayload, "baseRound" | "checkReports">;

export function parseQuestionsOutput(
  value: unknown,
  baseline: DiagnosisResult,
  round: number,
): QuestionsParsed | null {
  if (
    !isRecord(value) ||
    !trimmed(value.intro) ||
    typeof value.canNarrowFurther !== "boolean" ||
    !(typeof value.stopReason === "string" || value.stopReason === null) ||
    !Array.isArray(value.questions)
  ) {
    return null;
  }

  const causeTitles = new Map(
    baseline.likelyCauses.map((cause) => [cause.title.toLowerCase(), cause.title]),
  );
  const prompts = new Set<string>();
  const questions: AssistantQuestion[] = [];

  for (const raw of value.questions) {
    if (!isRecord(raw)) continue;
    const prompt = trimmed(raw.prompt)?.slice(0, 240);
    const why = trimmed(raw.why)?.slice(0, 200);
    if (
      !prompt ||
      !why ||
      !enumValue(raw.kind, QUESTION_KINDS) ||
      !enumValue(raw.requires, QUESTION_REQUIREMENTS) ||
      !Array.isArray(raw.options) ||
      !Array.isArray(raw.targets)
    ) {
      continue;
    }
    if (
      raw.requires === "test_drive" &&
      ["drive_to_shop_only", "do_not_drive"].includes(baseline.drivability.level)
    ) {
      continue;
    }
    if (
      baseline.safetyCritical &&
      (raw.requires === "hand_tools" || HANDS_ON_PATTERN.test(prompt))
    ) {
      continue;
    }
    const promptKey = prompt.toLowerCase();
    if (prompts.has(promptKey)) continue;

    let options: string[] = [];
    if (raw.kind === "single_choice") {
      const seen = new Set<string>();
      for (const option of raw.options) {
        const text = trimmed(option);
        if (!text || text.length > 80) continue;
        const key = text.toLowerCase();
        if (key === NOT_SURE_OPTION.toLowerCase() || seen.has(key)) continue;
        seen.add(key);
        options.push(text);
      }
      if (options.length < 2 || options.length > 5) continue;
      options = [...options, NOT_SURE_OPTION];
    }
    const targets = raw.targets.flatMap((target) => {
      const title = trimmed(target);
      const canonical = title ? causeTitles.get(title.toLowerCase()) : undefined;
      return canonical ? [canonical] : [];
    });
    prompts.add(promptKey);
    questions.push({
      id: `r${round}q${questions.length + 1}`,
      kind: raw.kind,
      prompt,
      why,
      options,
      requires: raw.requires,
      targets: [...new Set(targets)],
    });
    if (questions.length === ASSISTANT_MAX_QUESTIONS) break;
  }

  if (value.canNarrowFurther) {
    if (questions.length < ASSISTANT_MIN_QUESTIONS) return null;
    return {
      intro: (value.intro as string).trim(),
      canNarrowFurther: true,
      stopReason: null,
      questions,
    };
  }
  const stopReason = trimmed(value.stopReason);
  if (!stopReason) return null;
  return {
    intro: (value.intro as string).trim(),
    canNarrowFurther: false,
    stopReason,
    questions: [],
  };
}

export type RediagnosisParsed = {
  result: DiagnosisResult;
  changes: { headline: string; reasons: string[] };
  noteReply: string | null;
  assistantState: AssistantState;
};

export function parseRediagnosisOutput(
  value: unknown,
  allowedCodes: string[],
  baseline: DiagnosisResult,
  round: number,
): RediagnosisParsed | null {
  if (!isRecord(value)) return null;
  const core = parseDiagnosisOutput(value, allowedCodes);
  if (!core || !Array.isArray(value.ruledOut) || !isRecord(value.changes)) return null;

  const likely = new Set(core.likelyCauses.map((cause) => cause.title.toLowerCase()));
  const merged: RuledOutCause[] = [];
  const seen = new Set<string>();
  for (const item of [...value.ruledOut, ...baseline.ruledOut]) {
    if (!isRecord(item)) continue;
    const title = trimmed(item.title);
    const reason = trimmed(item.reason)?.slice(0, 240);
    if (!title || !reason) continue;
    const key = title.toLowerCase();
    if (likely.has(key) || seen.has(key)) continue;
    seen.add(key);
    merged.push({ title, reason });
    if (merged.length === 8) break;
  }
  const gainedRuledOut = merged.some(
    (item) => !baseline.ruledOut.some((old) => old.title.toLowerCase() === item.title.toLowerCase()),
  );
  if (!core.likelyCauses.length && baseline.likelyCauses.length && !gainedRuledOut) return null;

  const headline = trimmed(value.changes.headline);
  const reasons = Array.isArray(value.changes.reasons)
    ? value.changes.reasons
        .flatMap((reason) => (trimmed(reason) ? [trimmed(reason) as string] : []))
        .slice(0, 4)
    : null;
  if (!headline || !reasons || !enumValue(value.assistantState, ASSISTANT_STATES)) return null;
  if (!(typeof value.noteReply === "string" || value.noteReply === null)) return null;

  return {
    result: { ...core, round, ruledOut: merged },
    changes: { headline, reasons },
    noteReply: trimmed(value.noteReply)?.slice(0, 600) ?? null,
    assistantState: value.assistantState,
  };
}

export function parseAnswers(
  formData: FormData,
  questions: AssistantQuestion[],
): { turn: RediagnosisTurnInput; error: string | null } {
  const answers: AssistantAnswer[] = [];
  for (const question of questions) {
    const raw = formData.get(`answer-${question.id}`);
    const answer = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
    if (answer.length > MAX_ANSWER_LENGTH) {
      return { turn: { questions, answers: [], note: null, extraCodes: [] }, error: "An answer is too long." };
    }
    if (question.kind === "single_choice") {
      if (answer && !question.options.includes(answer)) {
        return { turn: { questions, answers: [], note: null, extraCodes: [] }, error: "Choose one of the listed answers." };
      }
      answers.push({ questionId: question.id, choice: answer || null, text: null });
    } else {
      answers.push({ questionId: question.id, choice: null, text: answer || null });
    }
  }
  const rawNote = formData.get("note");
  const note = typeof rawNote === "string" ? rawNote.trim().replace(/\s+/g, " ") : "";
  if (note.length > MAX_NOTE_LENGTH) {
    return { turn: { questions, answers: [], note: null, extraCodes: [] }, error: "The note is too long." };
  }
  return {
    turn: { questions, answers, note: note || null, extraCodes: [] },
    error: null,
  };
}
