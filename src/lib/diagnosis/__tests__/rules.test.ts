import { describe, expect, it } from "vitest";
import { DTC_KNOWLEDGE } from "../dtc-knowledge";
import { diagnoseWithRules, matchSymptomRules } from "../rules";
import { vehicle } from "./fixtures";

describe("rule diagnosis", () => {
  it("provides useful output for every known code", () => {
    for (const code of Object.keys(DTC_KNOWLEDGE)) {
      const result = diagnoseWithRules({ dtcCodes: [code], symptoms: null }, vehicle);
      expect(result.likelyCauses.length).toBeGreaterThanOrEqual(1);
      expect(result.inspectionSteps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("handles the P0420 roadmap case", () => {
    const result = diagnoseWithRules({ dtcCodes: ["P0420"], symptoms: null }, vehicle);
    expect(result.likelyCauses[0].title).toBe("Aging or failed catalytic converter");
    expect(result.likelyCauses[0].detail).toContain("scan for misfire or fuel-trim codes");
    expect(result.likelyCauses[0].settlingTest).toContain("downstream signal mirrors");
    expect(result.drivability.level).toBe("ok_to_drive");
    expect(result.drivability.stopDrivingIf).toEqual([]);
    expect(result.codeNotes).toContainEqual(expect.objectContaining({ code: "P0420" }));
  });

  it("leaves mild verdicts without a stop-driving list", () => {
    const cautious = diagnoseWithRules({ dtcCodes: ["P0300"], symptoms: null }, vehicle);
    const unknown = diagnoseWithRules({ dtcCodes: [], symptoms: null }, vehicle);

    expect(cautious.drivability.level).toBe("drive_with_caution");
    expect(cautious.drivability.stopDrivingIf).toEqual([]);
    expect(unknown.drivability.level).toBe("drive_with_caution");
    expect(unknown.drivability.stopDrivingIf).toEqual([]);
  });

  it("escalates a flashing light with a misfire", () => {
    const result = diagnoseWithRules(
      { dtcCodes: ["P0300"], symptoms: "The check engine light is flashing" },
      vehicle,
    );
    expect(["drive_to_shop_only", "do_not_drive"]).toContain(result.drivability.level);
    expect(result.drivability.stopDrivingIf).toContain(
      "If the check-engine light is flashing, raw fuel can overheat and destroy the catalytic converter — stop and park it.",
    );
  });

  it("ranks misfire causes before catalyst causes", () => {
    const result = diagnoseWithRules({ dtcCodes: ["P0420", "P0300"], symptoms: null }, vehicle);
    const misfireIndex = result.likelyCauses.findIndex((cause) => cause.system === "ignition");
    const catalystIndex = result.likelyCauses.findIndex(
      (cause) => cause.title === "Aging or failed catalytic converter",
    );
    expect(misfireIndex).toBe(0);
    if (catalystIndex >= 0) expect(catalystIndex).toBeGreaterThan(misfireIndex);
  });

  it("treats brake wear symptoms as drivable (owner feedback: wear is not an emergency)", () => {
    const wear = diagnoseWithRules(
      { dtcCodes: [], symptoms: "Braking performance is reduced and the brakes squeal" },
      vehicle,
    );
    expect(wear.drivability.level).toBe("drive_with_caution");
    expect(wear.likelyCauses[0].title).toContain("Worn brake pads");
    expect(wear.inspectionSteps.length).toBeGreaterThan(0);
    expect(wear.drivability.stopDrivingIf).toEqual([]);

    const grind = diagnoseWithRules({ dtcCodes: [], symptoms: "My brakes are grinding" }, vehicle);
    expect(grind.drivability.level).toBe("drive_with_caution");
    expect(grind.safetyCritical).toBe(true);
  });

  it("keeps genuine brake hydraulic failure at shop-only", () => {
    const failure = diagnoseWithRules(
      { dtcCodes: [], symptoms: "The brake pedal sinks to the floor" },
      vehicle,
    );
    expect(failure.drivability.level).toBe("drive_to_shop_only");
    expect(failure.drivability.stopDrivingIf.length).toBeGreaterThan(0);
  });

  it("tiers steering and tire rules the same way", () => {
    const wobble = diagnoseWithRules(
      { dtcCodes: [], symptoms: "The wheel wobbles at highway speed" },
      vehicle,
    );
    expect(wobble.drivability.level).toBe("drive_with_caution");

    const heavy = diagnoseWithRules(
      { dtcCodes: [], symptoms: "Steering feels heavy when parking" },
      vehicle,
    );
    expect(heavy.drivability.level).toBe("drive_to_shop_only");

    const leak = diagnoseWithRules({ dtcCodes: [], symptoms: "The tire keeps losing air" }, vehicle);
    expect(leak.drivability.level).toBe("drive_with_caution");

    const cords = diagnoseWithRules({ dtcCodes: [], symptoms: "Cords showing on the tire" }, vehicle);
    expect(cords.drivability.level).toBe("drive_to_shop_only");
  });

  it("explains unknown manufacturer and chassis codes", () => {
    const manufacturer = diagnoseWithRules({ dtcCodes: ["P1234"], symptoms: null }, vehicle);
    expect(manufacturer.likelyCauses[0].confidence).toBe("low");
    expect(manufacturer.codeNotes[0].manufacturerSpecific).toBe(true);

    const chassis = diagnoseWithRules({ dtcCodes: ["C0035"], symptoms: null }, vehicle);
    expect(chassis.seeMechanic.recommended).toBe(true);
  });

  it("uses whole-word safety matching", () => {
    const brakes = diagnoseWithRules({ dtcCodes: [], symptoms: "My brakes are grinding" }, vehicle);
    expect(brakes.safetyCritical).toBe(true);
    expect(matchSymptomRules("my shot glass").map((rule) => rule.id)).not.toContain("overheating");
  });

  it("is deterministic", () => {
    const input = { dtcCodes: ["P0171"], symptoms: "The engine idles rough" };
    expect(diagnoseWithRules(input, vehicle)).toEqual(diagnoseWithRules(input, vehicle));
  });
});
