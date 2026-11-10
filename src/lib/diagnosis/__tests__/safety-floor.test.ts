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
      stopDrivingIf: [
        "If smoke continues with the engine running, leaked fluid or damaged wiring can ignite and damage the car — shut it off and park it.",
      ],
    };
    const result = applySafetyFloor(ai, rules);
    expect(result.drivability.level).toBe("do_not_drive");
    expect(result.drivability.headline).toBe("Stop driving now.");
  });

  it("removes stop-driving lists from mild verdicts", () => {
    const ai = validResult();
    ai.drivability.stopDrivingIf = ["A generic warning appears"];

    const result = applySafetyFloor(ai, validResult());

    expect(result.drivability.level).toBe("ok_to_drive");
    expect(result.drivability.stopDrivingIf).toEqual([]);
  });

  it("keeps an AI verdict that is already more severe", () => {
    const ai = validResult();
    ai.drivability.level = "do_not_drive";
    const rules = validResult();
    rules.drivability.level = "ok_to_drive";
    expect(applySafetyFloor(ai, rules)).toEqual(ai);
  });
});
