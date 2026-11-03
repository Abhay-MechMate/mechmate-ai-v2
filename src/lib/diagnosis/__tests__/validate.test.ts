import { describe, expect, it } from "vitest";
import { extractJson, parseDiagnosisOutput } from "../validate";
import { validModelOutput } from "./fixtures";

describe("AI output validation", () => {
  it("accepts and preserves cause detail", () => {
    const result = parseDiagnosisOutput(validModelOutput(), ["P0420"]);
    expect(result?.likelyCauses[0].detail).toBe(
      "Verify the oxygen-sensor readings and check for exhaust leaks first.",
    );
  });

  it("accepts cause output without detail for backward compatibility", () => {
    const fixture = validModelOutput();
    delete fixture.likelyCauses[0].detail;
    const result = parseDiagnosisOutput(fixture, ["P0420"]);
    expect(result).not.toBeNull();
    expect(result?.likelyCauses[0].detail).toBeUndefined();
  });

  it("rejects missing required objects and bad enums", () => {
    const missing = { ...validModelOutput(), drivability: undefined };
    expect(parseDiagnosisOutput(missing, ["P0420"])).toBeNull();

    const bad = validModelOutput() as unknown as Record<string, unknown>;
    bad.drivability = { ...validModelOutput().drivability, level: "probably_fine" };
    expect(parseDiagnosisOutput(bad, ["P0420"])).toBeNull();
  });

  it("normalizes array limits and hallucinated notes", () => {
    const fixture = validModelOutput();
    fixture.likelyCauses = Array.from({ length: 9 }, (_, index) => ({
      ...fixture.likelyCauses[0],
      title: `Cause ${index}`,
    }));
    fixture.codeNotes.push({ code: "P0171", meaning: "Hallucinated", manufacturerSpecific: false });
    const result = parseDiagnosisOutput(fixture, ["P0420"]);
    expect(result?.likelyCauses).toHaveLength(5);
    expect(result?.codeNotes).toHaveLength(1);
    expect(result?.codeNotes[0].code).toBe("P0420");
  });

  it("forces safety flags for safety-critical cause systems", () => {
    const fixture = validModelOutput();
    fixture.likelyCauses[0].system = "brakes";
    const result = parseDiagnosisOutput(fixture, ["P0420"]);
    expect(result?.safetyCritical).toBe(true);
    expect(result?.seeMechanic.recommended).toBe(true);
  });

  it("extracts fenced JSON", () => {
    const fixture = validModelOutput();
    expect(extractJson(`\`\`\`json\n${JSON.stringify(fixture)}\n\`\`\``)).toEqual(fixture);
  });
});
