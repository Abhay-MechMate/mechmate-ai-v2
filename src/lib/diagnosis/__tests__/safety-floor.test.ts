import { describe, expect, it } from "vitest";
import { applySafetyFloor } from "../rules";
import { validResult } from "./fixtures";

describe("safety floor", () => {
  it("raises AI drivability to the rules level", () => {
    const ai = validResult();
    const rules = validResult();
    rules.drivability = {
      level: "do_not_drive",
      headline: "Stop driving now.",
      stopDrivingIf: ["You see smoke"],
    };
    const result = applySafetyFloor(ai, rules);
    expect(result.drivability.level).toBe("do_not_drive");
    expect(result.drivability.headline).toBe("Stop driving now.");
  });

  it("keeps an AI verdict that is already more severe", () => {
    const ai = validResult();
    ai.drivability.level = "do_not_drive";
    const rules = validResult();
    rules.drivability.level = "ok_to_drive";
    expect(applySafetyFloor(ai, rules)).toEqual(ai);
  });
});
