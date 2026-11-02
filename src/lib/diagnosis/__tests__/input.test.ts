import { describe, expect, it } from "vitest";
import { buildDiagnosisInput, normalizeSymptoms, parseDtcCodes } from "../input";

describe("diagnosis input", () => {
  it("normalizes mixed-case, separated, and duplicate codes", () => {
    expect(parseDtcCodes("p0420, P0171")).toEqual({ codes: ["P0420", "P0171"] });
    expect(parseDtcCodes("P 0420")).toEqual({ codes: ["P0420"] });
    expect(parseDtcCodes("p0420 P0420, p 0171")).toEqual({ codes: ["P0420", "P0171"] });
  });

  it("rejects malformed or excessive codes", () => {
    expect(parseDtcCodes("0420")).toHaveProperty("error");
    expect(parseDtcCodes("P9420")).toHaveProperty("error");
    expect(parseDtcCodes("P0101 P0102 P0103 P0104 P0105 P0106")).toEqual({
      error: "Enter up to 5 codes at a time.",
    });
  });

  it("requires at least one useful input and enforces symptom lengths", () => {
    expect(buildDiagnosisInput("", "  ")).toHaveProperty("error");
    expect(normalizeSymptoms("ab")).toHaveProperty("error");
    expect(normalizeSymptoms("x".repeat(1001))).toHaveProperty("error");
  });
});
