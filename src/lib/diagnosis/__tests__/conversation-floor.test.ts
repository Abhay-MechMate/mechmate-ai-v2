import { describe, expect, it } from "vitest";
import { applyConversationFloor, diagnoseWithRules } from "../rules";
import { validResult, vehicle } from "./fixtures";

describe("assistant safety floor", () => {
  it("never lets an answer make the verdict less cautious", () => {
    const previous = validResult();
    previous.drivability.level = "drive_with_caution";
    const ai = validResult();
    ai.drivability.level = "ok_to_drive";
    const rules = diagnoseWithRules({ dtcCodes: ["P0420"], symptoms: null }, vehicle);
    const outcome = applyConversationFloor(ai, rules, previous);
    expect(outcome.result.drivability.level).toBe("drive_with_caution");
    expect(outcome.floor.previousKept).toBe(true);
  });

  it("raises fuel-smell evidence and replaces unsafe steps", () => {
    const previous = validResult();
    const ai = validResult();
    ai.inspectionSteps = [
      { instruction: "Remove the fuel line to inspect it.", difficulty: "diy_moderate" },
      { instruction: "Take it for a drive to reproduce the smell.", difficulty: "diy_easy" },
    ];
    const rules = diagnoseWithRules(
      { dtcCodes: ["P0420"], symptoms: "It smells like fuel near the rear tank" },
      vehicle,
    );
    const outcome = applyConversationFloor(ai, rules, previous);
    expect(outcome.result.drivability.level).toBe("do_not_drive");
    expect(outcome.result.safetyCritical).toBe(true);
    expect(outcome.result.inspectionSteps.join(" ")).not.toMatch(/remove|drive/i);
    expect(outcome.floor).toMatchObject({ rulesRaised: true, stepsReplaced: true });
  });

  it("strips hands-on and test-drive steps when the AI itself raises safety", () => {
    const ai = validResult();
    ai.drivability.level = "do_not_drive";
    ai.safetyCritical = true;
    ai.inspectionSteps = [
      { instruction: "Remove the caliper.", difficulty: "diy_moderate" },
      { instruction: "Road test the car.", difficulty: "diy_easy" },
    ];
    const rules = diagnoseWithRules({ dtcCodes: ["P0420"], symptoms: null }, vehicle);
    const outcome = applyConversationFloor(ai, rules, validResult());
    expect(outcome.result.inspectionSteps.join(" ")).not.toMatch(/remove|road test/i);
    expect(outcome.floor.stepsReplaced).toBe(true);
  });
});
