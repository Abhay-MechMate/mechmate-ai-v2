// Phase 4: curated parts map. Data only — no logic lives here.
//
// Lookup tiers (see docs/PARTS_DESIGN.md §2):
//   1. CAUSE_PARTS   — exact match on a likely-cause title (curated, best quality)
//   2. SYSTEM_PARTS  — fallback keyed by VehicleSystem for AI causes we have not
//                      curated yet
//   3. Generic fallback — the cause title itself becomes the search terms
//      (handled in derive.ts; not represented here)
//
// Rules for entries (enforced by tests):
//   - labels and searchTerms use store vocabulary, never brand names
//   - notes are at most one sentence, never recommend a brand
//   - adding an entry is a data edit; no code changes

export type PartDifficulty = "diy_easy" | "diy_moderate" | "shop_recommended";

export type PartLine = {
  /** Store vocabulary, owner-readable, e.g. "Front brake pads". */
  label: string;
  /** Terms fed to store search, e.g. "front brake pads". */
  searchTerms: string;
  /** Max one sentence: pairs, position, tooling warnings. Never a brand. */
  note?: string;
  difficulty?: PartDifficulty;
};

/** Causes that cannot be fixed by buying a part — the section skips them. */
export const NON_FIXABLE_CAUSES = new Set<string>(
  [
    "Low engine compression",
    "Low compression in cylinder 1",
    "Airbag (SRS) system fault, often a seat or clock-spring connection",
    "High-voltage battery or hybrid system fault",
    "Engine computer driver fault",
    "Severe engine misfire",
  ].map((title) => title.toLowerCase()),
);

export const CAUSE_PARTS: Record<string, PartLine[]> = {
  // --- emissions / exhaust ---
  "aging or failed catalytic converter": [
    {
      label: "Catalytic converter (direct fit for your car)",
      searchTerms: "catalytic converter",
      note: "Match the engine and exhaust layout; a shop-grade unit usually outlasts a bargain one.",
      difficulty: "shop_recommended",
    },
    {
      label: "Upstream O2 sensor",
      searchTerms: "upstream oxygen sensor",
      note: "Replace only if the settling test points at it — sensors are often blamed for converter codes.",
      difficulty: "diy_moderate",
    },
  ],
  "failed heater inside the upstream oxygen sensor": [
    {
      label: "Upstream O2 sensor (bank 1, sensor 1)",
      searchTerms: "upstream oxygen sensor bank 1",
      difficulty: "diy_moderate",
    },
  ],
  "faulty downstream or upstream oxygen sensor": [
    {
      label: "O2 sensor (position named in the cause)",
      searchTerms: "oxygen sensor",
      note: "Sensor 1 is before the converter, sensor 2 is after — buy the right position.",
      difficulty: "diy_moderate",
    },
  ],
  "loose, missing, or damaged gas cap": [
    {
      label: "Fuel filler gas cap",
      searchTerms: "gas cap fuel filler",
      difficulty: "diy_easy",
    },
  ],
  "faulty purge or vent valve": [
    {
      label: "EVAP purge valve (solenoid)",
      searchTerms: "evap purge valve solenoid",
      difficulty: "diy_easy",
    },
    {
      label: "EVAP vent valve",
      searchTerms: "evap vent valve solenoid",
      difficulty: "diy_easy",
    },
  ],
  "cracked or disconnected evap hose": [
    {
      label: "EVAP hose (rubber, correct inside diameter)",
      searchTerms: "evap vacuum hose",
      difficulty: "diy_easy",
    },
  ],
  "leaking charcoal canister": [
    {
      label: "Charcoal canister (EVAP)",
      searchTerms: "evap charcoal canister",
      difficulty: "diy_moderate",
    },
  ],
  "failed secondary air pump": [
    {
      label: "Secondary air injection pump",
      searchTerms: "secondary air injection pump",
      difficulty: "diy_moderate",
    },
  ],
  "blown fuse or failed relay for the air pump": [
    {
      label: "Air pump relay",
      searchTerms: "secondary air pump relay",
      difficulty: "diy_easy",
    },
  ],
  // --- ignition / misfire ---
  "worn spark plugs or failing ignition coils": [
    {
      label: "Spark plugs (correct heat range, full set)",
      searchTerms: "spark plugs",
      note: "Replace the set, not one cylinder, unless the engine uses coil-on-plug with one bad coil.",
      difficulty: "diy_moderate",
    },
    {
      label: "Ignition coil (position as diagnosed)",
      searchTerms: "ignition coil",
      difficulty: "diy_easy",
    },
  ],
  "failing cylinder 1 ignition coil": [
    {
      label: "Ignition coil (cylinder 1 position)",
      searchTerms: "ignition coil",
      difficulty: "diy_easy",
    },
  ],
  "worn or fouled cylinder 1 spark plug": [
    {
      label: "Spark plug (engine's exact heat range)",
      searchTerms: "spark plug",
      difficulty: "diy_easy",
    },
  ],
  // --- fuel / air ---
  "weak fuel pump or clogged fuel filter": [
    {
      label: "Fuel filter (if the engine has a serviceable one)",
      searchTerms: "fuel filter",
      note: "Many modern cars filter in-tank; check before ordering.",
      difficulty: "diy_moderate",
    },
    {
      label: "Fuel pump (only if pressure test confirms)",
      searchTerms: "fuel pump",
      difficulty: "shop_recommended",
    },
  ],
  "clogged fuel injectors": [
    {
      label: "Fuel injector cleaning kit / concentrated injector cleaner",
      searchTerms: "fuel injector cleaner",
      difficulty: "diy_easy",
    },
    {
      label: "Fuel injector (only for the cylinder that failed the balance test)",
      searchTerms: "fuel injector",
      difficulty: "diy_moderate",
    },
  ],
  "dirty or faulty mass airflow (maf) sensor": [
    {
      label: "MAF sensor cleaning spray",
      searchTerms: "maf sensor cleaner",
      note: "Clean first — most 'bad' MAFs are dirty MAFs. Never touch the wires.",
      difficulty: "diy_easy",
    },
    {
      label: "MAF sensor (only if cleaning does not clear it)",
      searchTerms: "mass air flow sensor",
      difficulty: "diy_easy",
    },
  ],
  "dirty maf sensor": [
    {
      label: "MAF sensor cleaning spray",
      searchTerms: "maf sensor cleaner",
      difficulty: "diy_easy",
    },
  ],
  "failing maf sensor": [
    {
      label: "MAF sensor",
      searchTerms: "mass air flow sensor",
      difficulty: "diy_easy",
    },
  ],
  "clogged air filter": [
    {
      label: "Engine air filter",
      searchTerms: "engine air filter",
      difficulty: "diy_easy",
    },
  ],
  "cracked or disconnected air hose": [
    {
      label: "Intake / vacuum hose (correct inside diameter)",
      searchTerms: "vacuum hose",
      difficulty: "diy_easy",
    },
  ],
  "vacuum leak": [
    {
      label: "Vacuum hose (assorted diameters)",
      searchTerms: "vacuum hose assortment",
      difficulty: "diy_easy",
    },
  ],
  "faulty idle air control valve (on vehicles that have one)": [
    {
      label: "Idle air control valve",
      searchTerms: "idle air control valve",
      difficulty: "diy_easy",
    },
    {
      label: "Throttle body / IAC cleaner spray",
      searchTerms: "throttle body cleaner",
      difficulty: "diy_easy",
    },
  ],
  "dirty throttle body or idle air passage": [
    {
      label: "Throttle body cleaner spray",
      searchTerms: "throttle body cleaner",
      note: "Clean with the ignition off; some throttle bodies need a relearn afterwards.",
      difficulty: "diy_easy",
    },
  ],
  // --- cooling ---
  "thermostat stuck open": [
    {
      label: "Thermostat (correct temperature rating) + gasket",
      searchTerms: "engine thermostat",
      difficulty: "diy_moderate",
    },
  ],
  "low coolant level": [
    {
      label: "Coolant (the exact type the manufacturer specifies)",
      searchTerms: "engine coolant",
      note: "Top up only after finding where it went — coolant does not disappear.",
      difficulty: "diy_easy",
    },
  ],
  "low coolant from a leak": [
    {
      label: "Coolant (the exact type the manufacturer specifies)",
      searchTerms: "engine coolant",
      difficulty: "diy_easy",
    },
    {
      label: "Cooling system pressure tester (rent or borrow)",
      searchTerms: "cooling system pressure tester",
      note: "Finds the leak without guessing at parts.",
      difficulty: "diy_moderate",
    },
  ],
  "stuck-closed thermostat, failed water pump, or cooling fan problem": [
    {
      label: "Thermostat (correct temperature rating) + gasket",
      searchTerms: "engine thermostat",
      difficulty: "diy_moderate",
    },
    {
      label: "Water pump (only if the weep hole or bearing is wet/noisy)",
      searchTerms: "water pump",
      difficulty: "shop_recommended",
    },
  ],
  // --- brakes (wear tier) ---
  "worn brake pads or rotors": [
    {
      label: "Brake pads (front or rear, as diagnosed)",
      searchTerms: "brake pads",
      note: "Always replace pads in axle pairs; break them in gently for the first 200 miles.",
      difficulty: "diy_moderate",
    },
    {
      label: "Brake rotors (front or rear, as diagnosed)",
      searchTerms: "brake rotor",
      note: "Replace in pairs if either rotor is scored, warped, or under the minimum thickness.",
      difficulty: "diy_moderate",
    },
    {
      label: "Brake cleaner spray + thread locker",
      searchTerms: "brake cleaner spray",
      difficulty: "diy_easy",
    },
  ],
  "low brake fluid": [
    {
      label: "Brake fluid (the DOT rating on the reservoir cap)",
      searchTerms: "brake fluid",
      note: "Topping up is a stopgap — a falling level means something is leaking or the pads are worn.",
      difficulty: "diy_easy",
    },
  ],
  // --- steering / suspension (wear tier) ---
  "worn steering or suspension parts (tie rods, ball joints, bushings)": [
    {
      label: "Sway bar end links (pair)",
      searchTerms: "sway bar end links",
      note: "The most common clunk-over-bumps part — confirm by the push-and-rock test before buying.",
      difficulty: "diy_moderate",
    },
    {
      label: "Tie rod end (inner or outer, side as diagnosed)",
      searchTerms: "tie rod end",
      difficulty: "diy_moderate",
    },
    {
      label: "Ball joint (upper or lower, side as diagnosed)",
      searchTerms: "ball joint",
      difficulty: "shop_recommended",
    },
  ],
  "failing steering component (tie rod, rack, pump)": [
    {
      label: "Power steering fluid (the type the manufacturer specifies)",
      searchTerms: "power steering fluid",
      difficulty: "diy_easy",
    },
  ],
  // --- tires ---
  "slow puncture or bead leak": [
    {
      label: "Tire repair plug kit",
      searchTerms: "tire plug kit",
      note: "Plugs are for tread punctures only — a sidewall puncture means the tire is done.",
      difficulty: "diy_moderate",
    },
  ],
  // --- electrical / misc ---
  "damaged wiring or connector": [
    {
      label: "Heat-shrink connectors + automotive wire (correct gauge)",
      searchTerms: "automotive wire connector kit",
      difficulty: "diy_moderate",
    },
  ],
  "damaged maf wiring or connector": [
    {
      label: "MAF connector pigtail (repair harness)",
      searchTerms: "maf sensor connector pigtail",
      difficulty: "diy_moderate",
    },
  ],
  "faulty coolant temperature sensor": [
    {
      label: "Coolant temperature sensor",
      searchTerms: "coolant temperature sensor",
      difficulty: "diy_easy",
    },
  ],
  "engine problem that damaged the converter (misfire or rich running)": [
    {
      label: "Spark plugs + ignition coils (fix the misfire first)",
      searchTerms: "spark plugs ignition coil",
      note: "A new converter without fixing the misfire just destroys the new converter.",
      difficulty: "diy_moderate",
    },
  ],
  "exhaust leak before the upstream oxygen sensor": [
    {
      label: "Exhaust clamp / flange gasket (size as measured)",
      searchTerms: "exhaust clamp gasket",
      difficulty: "diy_moderate",
    },
  ],
};

export const SYSTEM_PARTS: Partial<Record<string, PartLine[]>> = {
  brakes: [
    {
      label: "Brake pads (front or rear, as diagnosed)",
      searchTerms: "brake pads",
      difficulty: "diy_moderate",
    },
    {
      label: "Brake fluid (the DOT rating on the reservoir cap)",
      searchTerms: "brake fluid",
      difficulty: "diy_easy",
    },
  ],
  cooling: [
    {
      label: "Coolant (the exact type the manufacturer specifies)",
      searchTerms: "engine coolant",
      difficulty: "diy_easy",
    },
    {
      label: "Radiator / heater hoses (replace the soft or swollen one)",
      searchTerms: "radiator hose",
      difficulty: "diy_moderate",
    },
  ],
  engine: [
    {
      label: "Spark plugs (correct heat range)",
      searchTerms: "spark plugs",
      difficulty: "diy_moderate",
    },
    {
      label: "Engine air filter",
      searchTerms: "engine air filter",
      difficulty: "diy_easy",
    },
  ],
  ignition: [
    {
      label: "Spark plugs (correct heat range)",
      searchTerms: "spark plugs",
      difficulty: "diy_moderate",
    },
    {
      label: "Ignition coil (position as diagnosed)",
      searchTerms: "ignition coil",
      difficulty: "diy_easy",
    },
  ],
  fuel: [
    {
      label: "Fuel filter (if the engine has a serviceable one)",
      searchTerms: "fuel filter",
      difficulty: "diy_moderate",
    },
  ],
  air_intake: [
    {
      label: "Engine air filter",
      searchTerms: "engine air filter",
      difficulty: "diy_easy",
    },
    {
      label: "Intake / vacuum hose (correct inside diameter)",
      searchTerms: "vacuum hose",
      difficulty: "diy_easy",
    },
  ],
  emissions: [
    {
      label: "Gas cap",
      searchTerms: "gas cap fuel filler",
      difficulty: "diy_easy",
    },
    {
      label: "O2 sensor (position as diagnosed)",
      searchTerms: "oxygen sensor",
      difficulty: "diy_moderate",
    },
  ],
  exhaust: [
    {
      label: "Exhaust clamp / flange gasket (size as measured)",
      searchTerms: "exhaust clamp gasket",
      difficulty: "diy_moderate",
    },
  ],
  electrical: [
    {
      label: "Heat-shrink connectors + automotive wire (correct gauge)",
      searchTerms: "automotive wire connector kit",
      difficulty: "diy_moderate",
    },
    {
      label: "Fuses (assorted automotive blade fuses)",
      searchTerms: "automotive blade fuse assortment",
      difficulty: "diy_easy",
    },
  ],
  steering: [
    {
      label: "Sway bar end links (pair)",
      searchTerms: "sway bar end links",
      difficulty: "diy_moderate",
    },
    {
      label: "Tie rod end (side as diagnosed)",
      searchTerms: "tie rod end",
      difficulty: "diy_moderate",
    },
  ],
  suspension: [
    {
      label: "Shocks / struts (pair, as diagnosed)",
      searchTerms: "shocks struts",
      difficulty: "shop_recommended",
    },
  ],
  tires_wheels: [
    {
      label: "Tire pressure gauge",
      searchTerms: "tire pressure gauge",
      difficulty: "diy_easy",
    },
    {
      label: "Tire repair plug kit",
      searchTerms: "tire plug kit",
      difficulty: "diy_moderate",
    },
  ],
  hvac: [
    {
      label: "Cabin air filter",
      searchTerms: "cabin air filter",
      difficulty: "diy_easy",
    },
  ],
  body: [
    {
      label: "Trim / clip assortment for the affected panel",
      searchTerms: "automotive trim clip assortment",
      difficulty: "diy_moderate",
    },
  ],
  transmission: [
    {
      label: "Transmission fluid (the exact type the manufacturer specifies)",
      searchTerms: "transmission fluid",
      note: "Check the level and condition first; do not flush a slipping transmission.",
      difficulty: "diy_moderate",
    },
  ],
  // Intentionally no entries: srs_airbag, hybrid_ev, network, other —
  // these are not owner-fixable with a purchasable part.
};
