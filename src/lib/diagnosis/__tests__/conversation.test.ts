import { describe, expect, it } from "vitest";
import type {
  AssistantTurn,
  QuestionsTurnPayload,
  RediagnosisTurnPayload,
} from "../assistant-types";
import { deriveConversation } from "../conversation";
import type { DiagnosisResult } from "../types";
import { validResult } from "./fixtures";

const questionPayload: QuestionsTurnPayload = {
  baseRound: 0,
  checkReports: [],
  intro: "Two checks will split the causes.",
  canNarrowFurther: true,
  stopReason: null,
  questions: [
    {
      id: "r1q1",
      kind: "short_text",
      prompt: "What does the sensor show?",
      why: "It separates the causes.",
      options: [],
      requires: "scan_tool",
      targets: ["Aging catalytic converter"],
    },
  ],
};

const answerPayload: RediagnosisTurnPayload = {
  answers: [{ questionId: "r1q1", choice: null, text: "Steady" }],
  note: null,
  extraCodes: [],
  changes: { headline: "The ranking changed.", reasons: [] },
  noteReply: null,
  assistantState: "keep_going",
  floor: { rulesRaised: false, previousKept: false, stepsReplaced: false },
  diff: null,
};

function questions(
  round: number,
  overrides: Partial<QuestionsTurnPayload> = {},
  superseded = false,
): Extract<AssistantTurn, { kind: "questions" }> {
  return {
    id: `questions-${round}-${superseded}`,
    kind: "questions",
    round,
    source: "ai",
    model: "test-model",
    fallbackReason: null,
    createdAt: `2026-01-0${round}T00:00:00.000Z`,
    superseded,
    payload: {
      ...questionPayload,
      baseRound: round - 1,
      questions: questionPayload.questions.map((item) => ({
        ...item,
        id: `r${round}q1`,
      })),
      ...overrides,
    },
  };
}

function rediagnosis(
  round: number,
  result: DiagnosisResult | null,
  superseded = false,
): Extract<AssistantTurn, { kind: "rediagnosis" }> {
  return {
    id: `rediagnosis-${round}-${superseded}`,
    kind: "rediagnosis",
    round,
    source: result ? "ai" : "none",
    model: result ? "test-model" : null,
    fallbackReason: result ? null : "timeout",
    createdAt: `2026-01-0${round}T00:01:00.000Z`,
    superseded,
    payload: answerPayload,
    result,
  };
}

function updated(round: number): DiagnosisResult {
  return { ...validResult(), round, summary: `Round ${round}` };
}

const activeSession = () => ({
  initialResult: validResult(),
  assistantStatus: "active" as const,
});

describe("deriveConversation", () => {
  it("returns start when there are no turns", () => {
    expect(deriveConversation([], activeSession()).next).toEqual({ kind: "start" });
  });

  it("returns answer when questions are open", () => {
    expect(deriveConversation([questions(1)], activeSession()).next).toEqual({
      kind: "answer",
      round: 1,
    });
  });

  it("returns retry after a failed rediagnosis", () => {
    expect(
      deriveConversation([questions(1), rediagnosis(1, null)], activeSession()).next,
    ).toEqual({ kind: "retry", round: 1, reason: "timeout" });
  });

  it("returns ask_more after a successful first round", () => {
    expect(
      deriveConversation(
        [questions(1), rediagnosis(1, updated(1))],
        activeSession(),
      ).next,
    ).toEqual({ kind: "ask_more", round: 2 });
  });

  it("stops at the maximum round", () => {
    const turns: AssistantTurn[] = [];
    for (let round = 1; round <= 3; round += 1) {
      turns.push(questions(round), rediagnosis(round, updated(round)));
    }
    expect(deriveConversation(turns, activeSession()).next).toEqual({
      kind: "stopped",
      why: "max_rounds",
    });
  });

  it("stops when the questioner cannot narrow further", () => {
    const turn = questions(1, {
      canNarrowFurther: false,
      stopReason: "A scan-tool test is the next useful step.",
      questions: [],
    });
    expect(deriveConversation([turn], activeSession()).next).toEqual({
      kind: "stopped",
      why: "nothing_to_ask",
    });
  });

  it("ignores superseded rows and counts them", () => {
    const oldQuestions = questions(1, {}, true);
    const oldAnswer = rediagnosis(1, updated(1), true);
    const currentQuestions = questions(1);
    const conversation = deriveConversation(
      [oldQuestions, oldAnswer, currentQuestions],
      activeSession(),
    );
    expect(conversation.supersededCount).toBe(2);
    expect(conversation.rounds).toHaveLength(1);
    expect(conversation.rounds[0].questions.id).toBe(currentQuestions.id);
    expect(conversation.next).toEqual({ kind: "answer", round: 1 });
  });

  it("uses round 1's result as the baseline for round 2", () => {
    const roundOne = updated(1);
    const conversation = deriveConversation(
      [questions(1), rediagnosis(1, roundOne), questions(2)],
      activeSession(),
    );
    expect(conversation.baselineFor(2)).toBe(roundOne);
  });

  it("uses the initial result as the baseline for round 1", () => {
    const session = activeSession();
    const conversation = deriveConversation([questions(1)], session);
    expect(conversation.baselineFor(1)).toBe(session.initialResult);
  });
});
