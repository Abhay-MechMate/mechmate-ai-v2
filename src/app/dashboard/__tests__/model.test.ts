import { dashboardCars, onboardingSteps, selectOpenConversations, type OpenSessionRow } from "@/app/dashboard/model";
import type { AssistantTurn, QuestionsTurnPayload, RediagnosisTurnPayload } from "@/lib/diagnosis/assistant-types";
import { validResult, vehicle } from "@/lib/diagnosis/__tests__/fixtures";
import { describe, expect, it } from "vitest";

const questionsPayload: QuestionsTurnPayload = { baseRound: 0, checkReports: [], intro: "Questions", canNarrowFurther: true, stopReason: null, questions: [{ id: "q1", kind: "short_text", prompt: "What happened?", why: "It helps", options: [], requires: "nothing", targets: [] }] };
const answerPayload: RediagnosisTurnPayload = { answers: [], note: null, extraCodes: [], changes: null, noteReply: null, assistantState: "keep_going", floor: null, diff: null };

function question(round = 1, canNarrowFurther = true): Extract<AssistantTurn, { kind: "questions" }> {
  return { id: `q-${round}`, kind: "questions", round, source: "ai", model: "test", fallbackReason: null, superseded: false, createdAt: "2026-01-01T00:00:00Z", payload: { ...questionsPayload, baseRound: round - 1, canNarrowFurther } };
}
function rediagnosis(round = 1, success = true): Extract<AssistantTurn, { kind: "rediagnosis" }> {
  return { id: `r-${round}`, kind: "rediagnosis", round, source: success ? "ai" : "none", model: success ? "test" : null, fallbackReason: success ? null : "timeout", superseded: false, createdAt: "2026-01-01T00:01:00Z", payload: answerPayload, result: success ? { ...validResult(), round } : null };
}
function row(id: string, updatedAt: string, vehicleId: string | null = "v1"): OpenSessionRow {
  return { id, vehicle_id: vehicleId, vehicle_snapshot: vehicle, symptoms: "Rough idle when cold", dtc_codes: [], initial_result: validResult(), assistant_status: "active", updated_at: updatedAt, top_cause: "Vacuum leak" };
}

describe("dashboard model", () => {
  it("maps answer and retry anchors", () => {
    const result = selectOpenConversations([
      { row: row("answer", "2026-01-01T00:00:00Z"), turns: [question(2)] },
      { row: row("retry", "2026-01-02T00:00:00Z"), turns: [question(1), rediagnosis(1, false)] },
    ], 3);
    expect(result.map((item) => [item.next, item.round, item.href])).toEqual([
      ["answer", 2, "/diagnose/answer/assistant#round-2"],
      ["retry", 1, "/diagnose/retry/assistant#round-1"],
    ]);
  });

  it("maps ask-more to the last completed round without an anchor", () => {
    expect(selectOpenConversations([{ row: row("more", "2026-01-01T00:00:00Z"), turns: [question(), rediagnosis()] }], 3)[0]).toMatchObject({ next: "ask_more", round: 1, href: "/diagnose/more/assistant" });
  });

  it("excludes stopped, missing, and empty turn histories", () => {
    expect(selectOpenConversations([
      { row: row("stopped", "2026-01-03T00:00:00Z"), turns: [question(1, false)] },
      { row: row("failed", "2026-01-02T00:00:00Z"), turns: null },
      { row: row("start", "2026-01-01T00:00:00Z"), turns: [] },
    ], 3)).toEqual([]);
  });

  it("sorts by urgency then recency, limits after filtering, and marks removed vehicles", () => {
    const result = selectOpenConversations([
      { row: row("more", "2026-01-04T00:00:00Z"), turns: [question(), rediagnosis()] },
      { row: row("answer-old", "2026-01-01T00:00:00Z", null), turns: [question()] },
      { row: row("answer-new", "2026-01-03T00:00:00Z"), turns: [question()] },
      { row: row("retry", "2026-01-05T00:00:00Z"), turns: [question(), rediagnosis(1, false)] },
    ], 3);
    expect(result.map((item) => item.sessionId)).toEqual(["answer-new", "answer-old", "retry"]);
    expect(result[1].vehicleRemoved).toBe(true);
  });

  it("builds onboarding and car limits", () => {
    expect(onboardingSteps({ vehicleCount: 1, sessionCount: 0, anyRefined: false }).map((step) => step.done)).toEqual([true, false, false]);
    expect(dashboardCars([1, 2, 3], 2)).toEqual({ shown: [1, 2], hidden: 1 });
  });
});
