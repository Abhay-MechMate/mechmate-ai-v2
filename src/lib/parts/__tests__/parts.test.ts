import { describe, expect, it } from "vitest";
import { CAUSE_PARTS, NON_FIXABLE_CAUSES, SYSTEM_PARTS, type PartLine } from "../map";
import { autoZoneLink, buildStoreLinks, oreillyLink, rockAutoLink } from "../stores";
import { deriveParts } from "../derive";
import { DTC_KNOWLEDGE, SYMPTOM_RULES } from "@/lib/diagnosis/dtc-knowledge";
import { VEHICLE_SYSTEMS, type DiagnosisResult, type VehicleSnapshot } from "@/lib/diagnosis/types";
import { validResult } from "@/lib/diagnosis/__tests__/fixtures";

const vehicle: Pick<VehicleSnapshot, "make" | "model" | "modelYear"> = {
  make: "Audi",
  model: "Q5",
  modelYear: 2023,
};

const BRAND_PATTERN =
  /\b(bosch|duralast|napa|autozone|oreilly|rockauto|fel-pro|acdelco|denso|ngk|brembo|monroe|wagner|raybestos|gates|koyo|timken|moog|dorman|autolite|motorcraft)\b/i;

function allLines(): PartLine[] {
  return [
    ...Object.values(CAUSE_PARTS).flat(),
    ...Object.values(SYSTEM_PARTS).flat(),
  ].filter((line): line is PartLine => line !== undefined);
}

describe("parts map integrity", () => {
  it("uses only real vehicle systems for system fallbacks", () => {
    for (const system of Object.keys(SYSTEM_PARTS)) {
      expect(VEHICLE_SYSTEMS, `system key: ${system}`).toContain(system);
    }
  });

  it("every part line has label/searchTerms, no brand names, short notes", () => {
    for (const line of allLines()) {
      expect(line.label.trim().length, JSON.stringify(line)).toBeGreaterThan(0);
      expect(line.searchTerms.trim().length, JSON.stringify(line)).toBeGreaterThan(0);
      expect(line.label, `brand in label: ${line.label}`).not.toMatch(BRAND_PATTERN);
      expect(line.searchTerms, `brand in terms: ${line.searchTerms}`).not.toMatch(
        BRAND_PATTERN,
      );
      if (line.note) expect(line.note.length).toBeLessThanOrEqual(200);
    }
  });

  it("curated keys resolve to real rules or knowledge cause titles", () => {
    const knownTitles = new Set<string>();
    for (const knowledge of Object.values(DTC_KNOWLEDGE)) {
      for (const cause of knowledge.causes) knownTitles.add(cause.title.toLowerCase());
    }
    for (const rule of SYMPTOM_RULES) {
      for (const cause of rule.causes) knownTitles.add(cause.title.toLowerCase());
    }
    for (const key of Object.keys(CAUSE_PARTS)) {
      expect(knownTitles.has(key), `unmatched CAUSE_PARTS key: ${key}`).toBe(true);
    }
  });

  it("non-fixable causes are real rules or knowledge cause titles", () => {
    const knownTitles = new Set<string>();
    for (const knowledge of Object.values(DTC_KNOWLEDGE)) {
      for (const cause of knowledge.causes) knownTitles.add(cause.title.toLowerCase());
    }
    for (const rule of SYMPTOM_RULES) {
      for (const cause of rule.causes) knownTitles.add(cause.title.toLowerCase());
    }
    for (const title of NON_FIXABLE_CAUSES) {
      expect(knownTitles.has(title), `unmatched non-fixable cause: ${title}`).toBe(true);
    }
  });
});

describe("store link builders", () => {
  it("builds the verified RockAuto vehicle-scoped URL", () => {
    expect(rockAutoLink(vehicle)).toBe("https://www.rockauto.com/en/catalog/audi,2023,q5");
  });

  it("degrades RockAuto to the make catalog without a year", () => {
    expect(rockAutoLink({ make: "Audi", model: "Q5", modelYear: null })).toBe(
      "https://www.rockauto.com/en/catalog/audi,q5",
    );
  });

  it("builds the verified AutoZone search URL", () => {
    expect(autoZoneLink("front brake pads")).toBe(
      "https://www.autozone.com/searchresult?searchText=front+brake+pads",
    );
  });

  it("builds the verified O'Reilly search URL", () => {
    expect(oreillyLink("front brake pads")).toBe(
      "https://www.oreillyauto.com/search?q=front+brake+pads",
    );
  });

  it("buildStoreLinks returns all three stores with fulfillment labels", () => {
    const links = buildStoreLinks(vehicle, { searchTerms: "catalytic converter" });
    expect(links.map((link) => link.store)).toEqual(["rockauto", "autozone", "oreilly"]);
    expect(links.every((link) => link.url.startsWith("https://"))).toBe(true);
    expect(links.every((link) => link.fulfillment.length > 0)).toBe(true);
  });

  it("handles multi-word makes and models", () => {
    expect(rockAutoLink({ make: "Land Rover", model: "Range Rover", modelYear: 2021 })).toBe(
      "https://www.rockauto.com/en/catalog/land-rover,2021,range-rover",
    );
  });
});

describe("deriveParts", () => {
  function resultWithCauses(
    causes: Array<Pick<DiagnosisResult["likelyCauses"][number], "title" | "system">>,
  ): DiagnosisResult {
    const base = validResult();
    base.likelyCauses = causes.map((cause) => ({
      ...base.likelyCauses[0],
      ...cause,
    }));
    return base;
  }

  it("matches curated cause parts for a rules cause", () => {
    const sections = deriveParts(
      resultWithCauses([{ title: "Aging or failed catalytic converter", system: "emissions" }]),
    );
    expect(sections).toHaveLength(1);
    expect(sections[0].matchedBy).toBe("cause");
    expect(sections[0].parts[0].label).toContain("Catalytic converter");
  });

  it("matches curated symptom-rule cause parts", () => {
    const sections = deriveParts(
      resultWithCauses([{ title: "Worn brake pads or rotors", system: "brakes" }]),
    );
    expect(sections[0].matchedBy).toBe("cause");
    const labels = sections[0].parts.map((part) => part.label).join(" ");
    expect(labels).toContain("Brake pads");
    expect(labels).toContain("rotor");
  });

  it("falls back to system parts for unmapped AI causes", () => {
    const sections = deriveParts(
      resultWithCauses([{ title: "Completely unmapped AI cause title", system: "cooling" }]),
    );
    expect(sections[0].matchedBy).toBe("system");
    expect(sections[0].parts[0].searchTerms).toContain("coolant");
  });

  it("falls back to the cause title itself when nothing else matches", () => {
    const sections = deriveParts(
      resultWithCauses([{ title: "Wing flap actuator stuck", system: "other" }]),
    );
    expect(sections[0].matchedBy).toBe("generic");
    expect(sections[0].parts[0].searchTerms).toBe("Wing flap actuator stuck");
  });

  it("skips non-fixable causes entirely", () => {
    const sections = deriveParts(
      resultWithCauses([{ title: "Low engine compression", system: "engine" }]),
    );
    expect(sections).toHaveLength(0);
  });

  it("dedupes the same part across causes", () => {
    const sections = deriveParts(
      resultWithCauses([
        { title: "Worn brake pads or rotors", system: "brakes" },
        { title: "Unmapped brake cause", system: "brakes" },
      ]),
    );
    const labels = sections.flatMap((section) => section.parts.map((part) => part.label.toLowerCase()));
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("considers at most the top 3 causes", () => {
    const sections = deriveParts(
      resultWithCauses([
        { title: "Clogged air filter", system: "air_intake" },
        { title: "Worn spark plugs or failing ignition coils", system: "ignition" },
        { title: "Thermostat stuck open", system: "cooling" },
        { title: "Clogged fuel injectors", system: "fuel" },
      ]),
    );
    expect(sections).toHaveLength(3);
    expect(sections.some((section) => section.causeTitle === "Clogged fuel injectors")).toBe(
      false,
    );
  });

  it("is deterministic", () => {
    const result = resultWithCauses([
      { title: "Aging or failed catalytic converter", system: "emissions" },
      { title: "Vacuum leak", system: "air_intake" },
    ]);
    expect(deriveParts(result)).toEqual(deriveParts(result));
  });

  it("handles empty causes defensively", () => {
    const empty = validResult();
    empty.likelyCauses = [];
    expect(deriveParts(empty)).toEqual([]);
  });
});
