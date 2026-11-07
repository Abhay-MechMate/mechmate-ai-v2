import { describe, expect, it } from "vitest";
import { normalizeResult } from "../upgrade";
import { validResult, validV1Result } from "./fixtures";

describe("diagnosis result upgrades", () => {
  it("upgrades v1 in memory without changing the source", () => {
    const legacy = validV1Result();
    const result = normalizeResult(legacy);
    expect(result).toMatchObject({ schemaVersion: 2, round: 0, ruledOut: [] });
    expect(legacy).not.toHaveProperty("round");
  });

  it("returns a v2 document as-is", () => {
    const current = validResult();
    expect(normalizeResult(current)).toBe(current);
  });

  it("rejects unknown documents", () => {
    expect(() => normalizeResult({ schemaVersion: 9 })).toThrow();
    expect(() => normalizeResult(null)).toThrow();
  });
});
