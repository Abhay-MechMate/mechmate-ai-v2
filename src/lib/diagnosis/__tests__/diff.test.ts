import { describe, expect, it } from "vitest";
import { diffResults } from "../diff";
import type { DiagnosisResult, LikelyCause } from "../types";
import { validResult } from "./fixtures";

function cause(title: string, confidence: LikelyCause["confidence"]): LikelyCause {
  return {
    title,
    confidence,
    system: "emissions",
    explanation: `${title} explanation`,
    relatedCodes: ["P0420"],
  };
}

function result(causes: LikelyCause[]): DiagnosisResult {
  return { ...validResult(), likelyCauses: causes };
}

describe("diagnosis result diff", () => {
  it("reports rank moves", () => {
    const diff = diffResults(
      result([cause("Converter", "high"), cause("O2 sensor", "medium")]),
      result([cause("O2 sensor", "medium"), cause("Converter", "high")]),
    );
    expect(diff.causes).toEqual([
      expect.objectContaining({ title: "O2 sensor", fromRank: 2, toRank: 1 }),
      expect.objectContaining({ title: "Converter", fromRank: 1, toRank: 2 }),
    ]);
  });

  it("reports confidence changes", () => {
    const diff = diffResults(
      result([cause("Converter", "high")]),
      result([cause("Converter", "low")]),
    );
    expect(diff.causes).toEqual([
      expect.objectContaining({
        title: "Converter",
        fromConfidence: "high",
        toConfidence: "low",
      }),
    ]);
  });

  it("reports a new cause with no previous rank", () => {
    const diff = diffResults(
      result([cause("Converter", "high")]),
      result([cause("Converter", "high"), cause("Wiring", "low")]),
    );
    expect(diff.causes).toContainEqual({
      title: "Wiring",
      fromRank: null,
      toRank: 2,
      fromConfidence: null,
      toConfidence: "low",
    });
  });

  it("reports newly ruled-out causes", () => {
    const before = result([cause("Converter", "high")]);
    const after = {
      ...result([]),
      ruledOut: [{ title: "Converter", reason: "The waveform rules it out." }],
    };
    expect(diffResults(before, after).newlyRuledOut).toEqual(["Converter"]);
  });

  it("reports a verdict change", () => {
    const before = result([cause("Converter", "high")]);
    const after = structuredClone(before);
    after.drivability.level = "drive_with_caution";
    expect(diffResults(before, after).verdict).toEqual({
      from: "ok_to_drive",
      to: "drive_with_caution",
    });
  });

  it("returns an empty diff when nothing changed", () => {
    const before = result([cause("Converter", "high")]);
    expect(diffResults(before, structuredClone(before))).toEqual({
      verdict: null,
      causes: [],
      newlyRuledOut: [],
      firstStepChanged: false,
    });
  });
});
