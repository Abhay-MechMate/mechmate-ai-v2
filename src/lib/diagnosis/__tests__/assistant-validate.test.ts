import { describe, expect, it } from "vitest";
import { NOT_SURE_OPTION } from "../assistant-types";
import { parseQuestionsOutput, parseRediagnosisOutput } from "../assistant-validate";
import { validModelOutput, validResult } from "./fixtures";

function question(index: number) {
  return {
    kind: "single_choice",
    prompt: `What does sensor ${index} show?`,
    why: "This separates the converter from the sensor.",
    options: ["Steady", "Switching"],
    requires: "scan_tool",
    targets: ["Aging catalytic converter"],
  };
}

describe("assistant output validation", () => {
  it("validates, caps, and assigns ids to questioner output", () => {
    const parsed = parseQuestionsOutput({
      intro: "A few readings will split the causes:",
      canNarrowFurther: true,
      stopReason: null,
      questions: Array.from({ length: 6 }, (_, index) => question(index)),
    }, validResult(), 2);
    expect(parsed?.questions).toHaveLength(4);
    expect(parsed?.questions[0]).toMatchObject({ id: "r2q1" });
    expect(parsed?.questions[0].options.at(-1)).toBe(NOT_SURE_OPTION);
  });

  it("rejects fewer than two usable questions", () => {
    expect(parseQuestionsOutput({
      intro: "One question:",
      canNarrowFurther: true,
      stopReason: null,
      questions: [{ ...question(1), options: ["Only one"] }],
    }, validResult(), 1)).toBeNull();
  });

  it("validates a full rediagnosis and merges ruled-out causes", () => {
    const baseline = validResult();
    const output = {
      ...validModelOutput(),
      likelyCauses: [{
        ...validModelOutput().likelyCauses[0],
        title: "Faulty oxygen sensor",
        confidence: "medium" as const,
      }],
      ruledOut: [{ title: "Aging catalytic converter", reason: "The downstream signal stayed flat." }],
      changes: { headline: "The sensor moved up.", reasons: ["The live data changed the ranking."] },
      noteReply: null,
      assistantState: "narrowed",
    };
    const parsed = parseRediagnosisOutput(output, ["P0420"], baseline, 1);
    expect(parsed?.result).toMatchObject({ schemaVersion: 2, round: 1 });
    expect(parsed?.result.ruledOut[0].title).toBe("Aging catalytic converter");
  });

  it("rejects a rediagnosis that loses every cause without ruling one out", () => {
    expect(parseRediagnosisOutput({
      ...validModelOutput(),
      likelyCauses: [],
      ruledOut: [],
      changes: { headline: "Changed", reasons: [] },
      noteReply: null,
      assistantState: "keep_going",
    }, ["P0420"], validResult(), 1)).toBeNull();
  });
});
