import { beforeEach, describe, expect, it, vi } from "vitest";
import { validResult, vehicle } from "./fixtures";

vi.mock("../openrouter", () => ({
  diagnoseWithAi: vi.fn(),
}));

import { runDiagnosis } from "../engine";
import { diagnoseWithAi } from "../openrouter";

const mockedDiagnoseWithAi = vi.mocked(diagnoseWithAi);
const input = { dtcCodes: ["P0420"], symptoms: null };

describe("diagnosis fallback orchestration", () => {
  beforeEach(() => mockedDiagnoseWithAi.mockReset());

  it("uses rules without calling AI when the daily limit is reached", async () => {
    const result = await runDiagnosis(input, vehicle, { aiAllowed: false });
    expect(result).toMatchObject({ source: "rules", fallbackReason: "daily_limit" });
    expect(mockedDiagnoseWithAi).not.toHaveBeenCalled();
  });

  it("uses the deterministic result when AI fails", async () => {
    mockedDiagnoseWithAi.mockResolvedValue({
      ok: false,
      reason: "invalid_output",
      latencyMs: 10,
    });
    const result = await runDiagnosis(input, vehicle, { aiAllowed: true });
    expect(result).toMatchObject({ source: "rules", fallbackReason: "invalid_output" });
    expect(result.result.likelyCauses[0].title).toBe("Aging or failed catalytic converter");
  });

  it("applies the rules safety floor to a successful AI result", async () => {
    const aiResult = validResult();
    aiResult.drivability.level = "ok_to_drive";
    mockedDiagnoseWithAi.mockResolvedValue({
      ok: true,
      result: aiResult,
      model: "test/model",
      usage: { promptTokens: 1, completionTokens: 1, costUsd: 0.001 },
      latencyMs: 10,
    });
    const safetyInput = { dtcCodes: [], symptoms: "The brake pedal sinks to the floor" };
    const result = await runDiagnosis(safetyInput, vehicle, { aiAllowed: true });
    expect(result.source).toBe("ai");
    expect(result.result.drivability.level).toBe("drive_to_shop_only");
    expect(result.result.safetyCritical).toBe(true);
  });
});
