import { describe, expect, it } from "vitest";
import { NOT_SURE_OPTION } from "../assistant-types";
import {
  parseAnswers,
  parseQuestionsOutput,
  parseRediagnosisOutput,
} from "../assistant-validate";
import {
  validModelOutput,
  validQuestionsOutput,
  validRediagnosisOutput,
  validResult,
} from "./fixtures";

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
  it("accepts a valid questions output", () => {
    expect(parseQuestionsOutput(validQuestionsOutput(), validResult(), 1)?.questions).toHaveLength(2);
  });

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

  it("drops a single-choice question with one option", () => {
    const output = validQuestionsOutput();
    output.questions.push({ ...question(3), options: ["Only one"] });
    expect(parseQuestionsOutput(output, validResult(), 1)?.questions).toHaveLength(2);
  });

  it("removes an AI not-sure option and appends the canonical option once", () => {
    const output = validQuestionsOutput();
    output.questions[0].options.push("DIDN'T CHECK / NOT SURE", NOT_SURE_OPTION);
    const options = parseQuestionsOutput(output, validResult(), 1)?.questions[0].options;
    expect(options?.filter((item) => item === NOT_SURE_OPTION)).toHaveLength(1);
  });

  it("filters unknown targets", () => {
    const output = validQuestionsOutput();
    output.questions[0].targets.push("Imaginary cause");
    expect(parseQuestionsOutput(output, validResult(), 1)?.questions[0].targets).toEqual([
      "Aging catalytic converter",
    ]);
  });

  it("drops test-drive questions when the baseline is shop-only", () => {
    const baseline = validResult();
    baseline.drivability.level = "drive_to_shop_only";
    const output = validQuestionsOutput();
    output.questions.push({ ...question(3), requires: "test_drive" });
    expect(parseQuestionsOutput(output, baseline, 1)?.questions).toHaveLength(2);
  });

  it("drops hand-tool and hands-on questions for a shop-only baseline", () => {
    const baseline = validResult();
    baseline.drivability.level = "drive_to_shop_only";
    const output = validQuestionsOutput();
    output.questions.push(
      { ...question(3), requires: "hand_tools" },
      { ...question(4), prompt: "Remove the caliper and inspect it." },
    );
    expect(parseQuestionsOutput(output, baseline, 1)?.questions).toHaveLength(2);
  });

  it("keeps hand-tool questions when a safety-critical baseline is drivable", () => {
    const baseline = validResult();
    baseline.safetyCritical = true;
    baseline.drivability.level = "drive_with_caution";
    const output = validQuestionsOutput();
    output.questions.push({ ...question(3), requires: "hand_tools" });
    expect(parseQuestionsOutput(output, baseline, 1)?.questions).toHaveLength(3);
  });

  it("rejects a stop response without a stop reason", () => {
    expect(parseQuestionsOutput({
      intro: "No more questions.",
      canNarrowFurther: false,
      stopReason: null,
      questions: [],
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

  it("accepts the valid P0420 rediagnosis fixture", () => {
    expect(parseRediagnosisOutput(
      validRediagnosisOutput(),
      ["P0420"],
      validResult(),
      1,
    )?.result.round).toBe(1);
  });

  it("merges baseline ruled-out causes but removes titles back in likely causes", () => {
    const baseline = validResult();
    baseline.ruledOut = [
      { title: "Old exhaust leak", reason: "No soot was found." },
      { title: "Aging catalytic converter", reason: "Earlier evidence." },
    ];
    const parsed = parseRediagnosisOutput(
      validRediagnosisOutput(),
      ["P0420"],
      baseline,
      1,
    );
    expect(parsed?.result.ruledOut).toEqual([
      { title: "Old exhaust leak", reason: "No soot was found." },
    ]);
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

  it("drops hallucinated code notes but keeps notes for owner-supplied extra codes", () => {
    const output = validRediagnosisOutput();
    output.codeNotes.push({
      code: "P0171",
      meaning: "System too lean.",
      manufacturerSpecific: false,
    });
    expect(
      parseRediagnosisOutput(output, ["P0420"], validResult(), 1)?.result.codeNotes,
    ).not.toContainEqual(expect.objectContaining({ code: "P0171" }));
    expect(
      parseRediagnosisOutput(output, ["P0420", "P0171"], validResult(), 1)?.result.codeNotes,
    ).toContainEqual(expect.objectContaining({ code: "P0171" }));
  });

  it("rejects an unlisted choice and text submitted to a choice question", () => {
    const questions = parseQuestionsOutput(validQuestionsOutput(), validResult(), 1)!.questions;
    const form = new FormData();
    form.set(`answer-${questions[0].id}`, "A free-text answer");
    expect(parseAnswers(form, questions).error).toBe("Choose one of the listed answers.");
  });

  it("rejects a 201-character answer", () => {
    const questions = parseQuestionsOutput(validQuestionsOutput(), validResult(), 1)!.questions;
    const form = new FormData();
    form.set(`answer-${questions[1].id}`, "x".repeat(201));
    expect(parseAnswers(form, questions).error).toBe("An answer is too long.");
  });
});
