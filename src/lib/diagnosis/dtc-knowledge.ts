import type { Confidence, DrivabilityLevel, StepDifficulty, VehicleSystem } from "./types";

export type DtcEntry = {
  code: string;
  title: string;
  system: VehicleSystem;
  drivability: DrivabilityLevel;
  headline: string;
  safetyCritical: boolean;
  causes: {
    title: string;
    system: VehicleSystem;
    confidence: Confidence;
    explanation: string;
    detail?: string;
  }[];
  steps: { instruction: string; difficulty: StepDifficulty }[];
  tools: string[];
  stopDrivingIf: string[];
};

const FLASHING_CEL =
  "If the check-engine light is flashing, raw fuel can overheat and destroy the catalytic converter — stop and park it.";

export const DTC_KNOWLEDGE: Readonly<Record<string, DtcEntry>> = {
  P0300: {
    code: "P0300", title: "Random or multiple cylinder misfire detected", system: "ignition",
    drivability: "drive_with_caution",
    headline: "Drive gently and only short distances until it's checked — misfires can damage the catalytic converter.",
    safetyCritical: false,
    causes: [
      { title: "Worn spark plugs or failing ignition coils", system: "ignition", confidence: "medium", explanation: "The most common reason several cylinders misfire, especially on high-mileage engines." },
      { title: "Vacuum leak", system: "air_intake", confidence: "medium", explanation: "Unmetered air leans out all cylinders and causes random misfires, often worse at idle." },
      { title: "Low fuel pressure or fuel delivery problem", system: "fuel", confidence: "medium", explanation: "A weak fuel pump or clogged filter starves every cylinder, usually worse under load." },
      { title: "Dirty or faulty mass airflow (MAF) sensor", system: "air_intake", confidence: "low", explanation: "Wrong airflow readings give the wrong fuel mixture across all cylinders." },
      { title: "Low engine compression", system: "engine", confidence: "low", explanation: "Mechanical wear (valves, rings, head gasket) is less common but possible." },
    ],
    steps: [
      { instruction: "Note whether the check-engine light is steady or flashing; flashing means stop driving soon.", difficulty: "diy_easy" },
      { instruction: "Read freeze-frame data and look for other codes (especially P0301–P0308 and P0171/P0174) with a scanner.", difficulty: "diy_moderate" },
      { instruction: "With the engine off and cool, inspect spark plugs and coil boots for wear, oil, or cracks.", difficulty: "diy_moderate" },
      { instruction: "Listen around the intake for hissing with the engine idling, and check vacuum hoses for cracks.", difficulty: "diy_easy" },
      { instruction: "Check short- and long-term fuel trims in live data; high positive trims point to a lean condition.", difficulty: "diy_moderate" },
    ],
    tools: ["OBD-II scanner with live data", "Spark plug socket and ratchet", "Flashlight"],
    stopDrivingIf: [
      FLASHING_CEL,
      "If the engine starts shaking hard or losing power, the misfire can overheat and destroy the catalytic converter — stop and park it.",
      "If the exhaust smells like raw fuel or rotten eggs, unburned fuel may be overheating the converter and continued driving can melt it — stop and park it.",
    ],
  },
  P0301: {
    code: "P0301", title: "Cylinder 1 misfire detected", system: "ignition",
    drivability: "drive_with_caution",
    headline: "Drive gently and get it checked soon — a steady misfire can damage the catalytic converter.",
    safetyCritical: false,
    causes: [
      { title: "Failing cylinder 1 ignition coil", system: "ignition", confidence: "high", explanation: "Coils are the most common single-cylinder misfire cause and are easy to test by swapping.", detail: "With the engine off, swap the cylinder 1 coil with a neighboring cylinder, then see whether the misfire code moves to that cylinder." },
      { title: "Worn or fouled cylinder 1 spark plug", system: "ignition", confidence: "high", explanation: "A worn or oil-fouled plug can't fire reliably.", detail: "Remove the cylinder 1 plug and inspect it for wear, oil, or carbon before considering replacement." },
      { title: "Clogged or failing cylinder 1 fuel injector", system: "fuel", confidence: "medium", explanation: "If the coil and plug are good, the injector may not be delivering fuel." },
      { title: "Vacuum leak near cylinder 1", system: "air_intake", confidence: "low", explanation: "A leaking intake gasket by one cylinder can lean out just that cylinder." },
      { title: "Low compression in cylinder 1", system: "engine", confidence: "low", explanation: "A valve or ring problem in that cylinder; confirmed with a compression test." },
    ],
    steps: [
      { instruction: "With the engine off, swap the cylinder 1 ignition coil with a neighboring cylinder, clear the code, and drive to see if the misfire moves.", difficulty: "diy_moderate" },
      { instruction: "Remove and inspect the cylinder 1 spark plug for wear, oil, or carbon.", difficulty: "diy_moderate" },
      { instruction: "Check the cylinder 1 injector connector is fully seated and undamaged.", difficulty: "diy_easy" },
      { instruction: "If the misfire stays on cylinder 1, have a compression test done.", difficulty: "shop_recommended" },
    ],
    tools: ["OBD-II scanner", "Spark plug socket and ratchet", "Flashlight"],
    stopDrivingIf: [
      FLASHING_CEL,
      "If the engine starts shaking hard or losing power, the misfire can overheat and destroy the catalytic converter — stop and park it.",
    ],
  },
  P0420: {
    code: "P0420", title: "Catalytic converter efficiency below threshold (bank 1)", system: "emissions",
    drivability: "ok_to_drive",
    headline: "Usually safe to drive short-term; get it diagnosed within a few weeks to avoid failing emissions.",
    safetyCritical: false,
    causes: [
      { title: "Aging or failed catalytic converter", system: "emissions", confidence: "high", explanation: "The most common cause, especially past about 100,000 miles.", detail: "Before condemning the converter, scan for misfire or fuel-trim codes, check for exhaust leaks, and compare the upstream and downstream oxygen-sensor readings." },
      { title: "Faulty downstream or upstream oxygen sensor", system: "emissions", confidence: "medium", explanation: "A lazy O2 sensor can make a good converter look bad.", detail: "Compare both oxygen-sensor readings in live data. The downstream reading should stay fairly steady when the converter is working." },
      { title: "Exhaust leak near the oxygen sensors", system: "exhaust", confidence: "medium", explanation: "Outside air entering the exhaust skews the sensor readings.", detail: "With the engine cold, check before and around the converter for ticking sounds or soot marks that point to a leak." },
      { title: "Engine problem that damaged the converter (misfire or rich running)", system: "engine", confidence: "low", explanation: "Unburned fuel overheats the converter; fix the root cause before replacing it.", detail: "Scan for misfire and fuel-trim codes first. Those root-cause faults need attention before the converter is evaluated for replacement." },
    ],
    steps: [
      { instruction: "Scan for other codes; fix any misfire or fuel-trim codes first.", difficulty: "diy_moderate" },
      { instruction: "With the engine cold, look and listen for exhaust leaks (ticking, soot marks) before and around the converter.", difficulty: "diy_easy" },
      { instruction: "Compare upstream and downstream O2 sensor readings in live data; the downstream sensor should stay fairly steady.", difficulty: "diy_moderate" },
      { instruction: "If sensors and exhaust check out, have the converter tested before replacing it.", difficulty: "shop_recommended" },
    ],
    tools: ["OBD-II scanner with live data", "Flashlight"],
    stopDrivingIf: [
      FLASHING_CEL,
      "If the converter starts rattling or the exhaust smells like rotten eggs, its core may be breaking down and continued driving can melt or collapse it — stop and park it.",
      "If engine power drops sharply, the converter may be blocking the exhaust and continued driving can overheat exhaust components — stop and park it.",
    ],
  },
  P0171: {
    code: "P0171", title: "System too lean (bank 1)", system: "fuel", drivability: "drive_with_caution",
    headline: "OK for short trips, but get it checked soon — running lean can cause misfires and engine damage.", safetyCritical: false,
    causes: [
      { title: "Vacuum leak", system: "air_intake", confidence: "high", explanation: "Cracked hoses or intake leaks let in air the engine computer can't measure." },
      { title: "Dirty or faulty mass airflow (MAF) sensor", system: "air_intake", confidence: "medium", explanation: "A contaminated MAF under-reads airflow, so too little fuel is added." },
      { title: "Weak fuel pump or clogged fuel filter", system: "fuel", confidence: "medium", explanation: "Low fuel pressure leans the mixture, usually worse under load." },
      { title: "Clogged fuel injectors", system: "fuel", confidence: "low", explanation: "Restricted injectors deliver less fuel than commanded." },
      { title: "Exhaust leak before the upstream oxygen sensor", system: "exhaust", confidence: "low", explanation: "Extra oxygen makes the sensor report lean." },
    ],
    steps: [
      { instruction: "With the engine idling, listen for hissing and inspect vacuum hoses and the intake boot for cracks.", difficulty: "diy_easy" },
      { instruction: "Check fuel trims in live data at idle and at 2,500 rpm; lean at idle only suggests a vacuum leak, lean at higher rpm suggests fuel delivery or MAF.", difficulty: "diy_moderate" },
      { instruction: "With the engine off, clean the MAF sensor with MAF-specific cleaner.", difficulty: "diy_moderate" },
      { instruction: "If trims stay high, have fuel pressure tested or a smoke test done.", difficulty: "shop_recommended" },
    ],
    tools: ["OBD-II scanner with live data", "MAF sensor cleaner", "Screwdriver set", "Flashlight"],
    stopDrivingIf: [
      FLASHING_CEL,
      "If the engine starts stalling or hesitating badly, the lean condition can damage the engine and make acceleration unpredictable — stop and park it.",
    ],
  },
  P0411: {
    code: "P0411", title: "Secondary air injection system incorrect flow detected", system: "emissions", drivability: "ok_to_drive",
    headline: "Safe to drive; this affects cold-start emissions, so fix it before an emissions test.", safetyCritical: false,
    causes: [
      { title: "Failed secondary air pump", system: "emissions", confidence: "high", explanation: "Pumps often fail from moisture; you may hear it whine or not run at all on a cold start." },
      { title: "Stuck or failed air check (combination) valve", system: "emissions", confidence: "medium", explanation: "A stuck valve blocks airflow or lets exhaust back into the pump." },
      { title: "Cracked or disconnected air hose", system: "emissions", confidence: "medium", explanation: "Leaking hoses reduce the measured flow." },
      { title: "Blown fuse or failed relay for the air pump", system: "electrical", confidence: "medium", explanation: "If the pump never runs, check its power supply first." },
    ],
    steps: [
      { instruction: "On a cold start, listen for the air pump running for about 30–90 seconds.", difficulty: "diy_easy" },
      { instruction: "Check the air pump fuse and relay (see the owner's manual for location).", difficulty: "diy_easy" },
      { instruction: "With the engine off, inspect the air hoses for cracks or disconnections.", difficulty: "diy_easy" },
      { instruction: "Have the pump and check valve tested if power and hoses are fine.", difficulty: "shop_recommended" },
    ],
    tools: ["OBD-II scanner", "Multimeter", "Flashlight"], stopDrivingIf: [],
  },
  P0128: {
    code: "P0128", title: "Coolant temperature below thermostat regulating temperature", system: "cooling", drivability: "ok_to_drive",
    headline: "Safe to drive; expect a weak heater and worse fuel economy until it's fixed.", safetyCritical: false,
    causes: [
      { title: "Thermostat stuck open", system: "cooling", confidence: "high", explanation: "The engine warms up too slowly because coolant always flows through the radiator." },
      { title: "Faulty coolant temperature sensor", system: "cooling", confidence: "medium", explanation: "The sensor may report a lower temperature than the engine really is." },
      { title: "Low coolant level", system: "cooling", confidence: "low", explanation: "Low coolant can give false low readings at the sensor." },
      { title: "Cooling fan running all the time", system: "cooling", confidence: "low", explanation: "A stuck fan relay over-cools the engine." },
    ],
    steps: [
      { instruction: "With the engine cold, check the coolant level in the overflow tank. Never open the radiator cap when hot.", difficulty: "diy_easy" },
      { instruction: "Watch the temperature gauge or coolant temperature in live data during a 15-minute drive; it should reach normal and stay steady.", difficulty: "diy_moderate" },
      { instruction: "Check whether the cooling fan runs immediately on a cold start (it normally shouldn't).", difficulty: "diy_easy" },
    ],
    tools: ["OBD-II scanner with live data", "Flashlight"], stopDrivingIf: [
      "If the temperature gauge enters the red, continued driving can warp the cylinder head or destroy the engine — stop and let it cool.",
      "If steam appears or coolant odor becomes strong, coolant may be escaping and continued driving can overheat the engine — stop and let it cool.",
    ],
  },
  P0455: {
    code: "P0455", title: "Evaporative emission (EVAP) system large leak detected", system: "emissions", drivability: "ok_to_drive",
    headline: "Safe to drive; start with the gas cap.", safetyCritical: false,
    causes: [
      { title: "Loose, missing, or damaged gas cap", system: "fuel", confidence: "high", explanation: "The most common cause by far, especially right after refueling." },
      { title: "Cracked or disconnected EVAP hose", system: "emissions", confidence: "medium", explanation: "Hoses near the tank and canister age and crack." },
      { title: "Faulty purge or vent valve", system: "emissions", confidence: "medium", explanation: "A valve stuck open creates a large leak." },
      { title: "Leaking charcoal canister", system: "emissions", confidence: "low", explanation: "Less common, but the canister can crack." },
    ],
    steps: [
      { instruction: "Check the gas cap is present and clicks tight; inspect its rubber seal for cracks.", difficulty: "diy_easy" },
      { instruction: "Clear the code (or wait) and see if it returns after several drive cycles.", difficulty: "diy_moderate" },
      { instruction: "Look for cracked or disconnected hoses around the fuel tank and EVAP canister.", difficulty: "diy_easy" },
      { instruction: "If it returns, have a smoke test done to find the leak.", difficulty: "shop_recommended" },
    ],
    tools: ["OBD-II scanner", "Flashlight"], stopDrivingIf: [
      "If a strong fuel odor develops, fuel may be escaping and running or driving the car can ignite it — shut it off and park it.",
      "If fuel is dripping, running or driving the car can ignite the leak and damage the vehicle — shut it off and park it.",
    ],
  },
  P0135: {
    code: "P0135", title: "Oxygen sensor heater circuit malfunction (bank 1, sensor 1)", system: "emissions", drivability: "ok_to_drive",
    headline: "Safe to drive; fuel economy and emissions may suffer until it's fixed.", safetyCritical: false,
    causes: [
      { title: "Failed heater inside the upstream oxygen sensor", system: "emissions", confidence: "high", explanation: "The sensor's internal heater commonly burns out with age." },
      { title: "Blown fuse for the O2 sensor heater", system: "electrical", confidence: "medium", explanation: "A shorted heater can blow the fuse." },
      { title: "Damaged wiring or connector", system: "electrical", confidence: "medium", explanation: "Wires near the hot exhaust can melt or chafe." },
      { title: "Engine computer driver fault", system: "electrical", confidence: "low", explanation: "Rare; only after the sensor and wiring test good." },
    ],
    steps: [
      { instruction: "Check the O2 sensor heater fuse (see the owner's manual).", difficulty: "diy_easy" },
      { instruction: "With the engine cool, inspect the upstream O2 sensor wiring and connector for melting or corrosion.", difficulty: "diy_easy" },
      { instruction: "Measure the heater resistance at the sensor connector with a multimeter (typically a few ohms).", difficulty: "diy_moderate" },
    ],
    tools: ["OBD-II scanner", "Multimeter", "Flashlight"], stopDrivingIf: [],
  },
  P0101: {
    code: "P0101", title: "Mass airflow (MAF) sensor range/performance problem", system: "air_intake", drivability: "drive_with_caution",
    headline: "Usually drivable, but hesitation or stalling is possible — get it checked soon.", safetyCritical: false,
    causes: [
      { title: "Dirty MAF sensor", system: "air_intake", confidence: "high", explanation: "Dust or oil on the sensor wire skews readings." },
      { title: "Air leak between the MAF and the throttle body", system: "air_intake", confidence: "medium", explanation: "A cracked intake boot lets in air the sensor doesn't measure." },
      { title: "Clogged air filter", system: "air_intake", confidence: "medium", explanation: "Restricted airflow can push readings out of range." },
      { title: "Failing MAF sensor", system: "air_intake", confidence: "medium", explanation: "If cleaning doesn't help, the sensor itself may be bad." },
      { title: "Damaged MAF wiring or connector", system: "electrical", confidence: "low", explanation: "Corroded or loose connectors cause erratic signals." },
    ],
    steps: [
      { instruction: "Inspect the air filter and replace it if it's dirty.", difficulty: "diy_easy" },
      { instruction: "Inspect the intake boot between the MAF and throttle body for cracks or loose clamps.", difficulty: "diy_easy" },
      { instruction: "With the engine off, clean the MAF sensor with MAF-specific cleaner and let it dry fully.", difficulty: "diy_moderate" },
      { instruction: "Compare MAF readings at idle in live data against your vehicle's spec.", difficulty: "diy_moderate" },
    ],
    tools: ["OBD-II scanner with live data", "MAF sensor cleaner", "Screwdriver set", "Flashlight"],
    stopDrivingIf: [
      "If the engine stalls while moving, steering and brake assist can drop and make the car harder to control — stop and park it.",
      "If hesitation makes acceleration unpredictable, pulling into traffic becomes unsafe — stop and park it.",
    ],
  },
  P0505: {
    code: "P0505", title: "Idle air control system malfunction", system: "air_intake", drivability: "drive_with_caution",
    headline: "Drivable, but the engine may stall at stops — be careful in traffic until it's fixed.", safetyCritical: false,
    causes: [
      { title: "Dirty throttle body or idle air passage", system: "air_intake", confidence: "high", explanation: "Carbon buildup restricts idle airflow." },
      { title: "Vacuum leak", system: "air_intake", confidence: "medium", explanation: "Extra air makes the idle high or unstable." },
      { title: "Faulty idle air control valve (on vehicles that have one)", system: "air_intake", confidence: "medium", explanation: "Older vehicles use a separate valve that can stick." },
      { title: "Electronic throttle body fault", system: "electrical", confidence: "low", explanation: "On drive-by-wire vehicles the throttle motor controls idle." },
    ],
    steps: [
      { instruction: "Note whether idle is too high, too low, or surging, and whether it stalls.", difficulty: "diy_easy" },
      { instruction: "Listen for vacuum leaks around the intake with the engine idling.", difficulty: "diy_easy" },
      { instruction: "With the ignition off, inspect and clean the throttle body with throttle body cleaner. On electronic throttles, never push the throttle plate with the ignition on.", difficulty: "diy_moderate" },
      { instruction: "If idle is still unstable, have the idle control or throttle body tested.", difficulty: "shop_recommended" },
    ],
    tools: ["OBD-II scanner", "Throttle body cleaner", "Screwdriver set", "Flashlight"],
    stopDrivingIf: [
      "If the engine stalls while moving, steering and brake assist can drop and make the car harder to control — stop and park it.",
      "If steering or brakes become heavy after a stall, the lost power assist makes continued driving unsafe — stop and park it.",
    ],
  },
};

export type SymptomRule = {
  id: string;
  pattern: RegExp;
  system: VehicleSystem;
  drivability: DrivabilityLevel;
  safetyCritical: boolean;
  headline: string;
  causes: { title: string; confidence: Confidence; explanation: string }[];
  steps: { instruction: string; difficulty: StepDifficulty }[];
  tools: string[];
  stopDrivingIf: string[];
  mechanicReason: string | null;
};

export const SYMPTOM_RULES: readonly SymptomRule[] = [
  {
    id: "fuel_smell", pattern: /\b(smell(s|ing)? (of |like )?(gas|gasoline|fuel)|fuel leak|gas leak|leaking (gas|fuel))\b/i,
    system: "fuel", drivability: "do_not_drive", safetyCritical: true,
    headline: "Stop driving — a fuel leak is a fire risk.",
    causes: [{ title: "Fuel leak from a line, injector seal, or the tank", confidence: "medium", explanation: "A raw fuel smell usually means fuel is escaping somewhere." }],
    steps: [{ instruction: "Park outdoors away from ignition sources and look under the car for drips or wet spots without starting it.", difficulty: "diy_easy" }],
    tools: ["Flashlight"], stopDrivingIf: [
      "If fuel odor persists inside or around the car, fuel is likely escaping and running or driving it can ignite the leak — leave it parked.",
    ], mechanicReason: "Fuel leaks are a fire hazard and need professional repair.",
  },
  {
    id: "smoke_fire", pattern: /\b(smoke|smoking|burning smell|smells? (like )?burning|fire|flames?)\b/i,
    system: "engine", drivability: "do_not_drive", safetyCritical: true,
    headline: "Stop driving — smoke or a burning smell can mean a fire risk.",
    causes: [{ title: "Fluid leaking onto hot engine or exhaust parts, or an electrical short", confidence: "low", explanation: "Smoke from the engine bay usually comes from oil, coolant, or wiring." }],
    steps: [{ instruction: "Turn the engine off, let it cool, and look for leaks or melted wiring without touching hot parts.", difficulty: "diy_easy" }],
    tools: ["Flashlight"], stopDrivingIf: [
      "If smoke or a burning odor continues with the engine running, leaked fluid or damaged wiring can ignite and damage the car — shut it off and park it.",
    ], mechanicReason: "Smoke or burning smells can indicate a fire risk.",
  },
  {
    id: "overheating", pattern: /\b(overheat\w*|over[- ]heat\w*|temp(erature)? (gauge|light) (is )?(high|in the red|red)|steam(ing)?|boiling coolant)\b/i,
    system: "cooling", drivability: "do_not_drive", safetyCritical: true,
    headline: "Stop driving — overheating can destroy the engine within minutes.",
    causes: [
      { title: "Low coolant from a leak", confidence: "medium", explanation: "The most common cause of overheating." },
      { title: "Stuck-closed thermostat, failed water pump, or cooling fan problem", confidence: "medium", explanation: "Any of these stops coolant flow or airflow." },
    ],
    steps: [{ instruction: "Let the engine cool completely, then check the coolant level in the overflow tank. Never open the radiator cap when hot.", difficulty: "diy_easy" }],
    tools: ["Flashlight"], stopDrivingIf: [
      "If the temperature gauge enters the red, continued driving can warp the cylinder head or destroy the engine — stop and let it cool.",
      "If steam appears, coolant is escaping or boiling and continued driving can destroy the engine — stop and let it cool.",
    ], mechanicReason: "Overheating needs diagnosis before further driving to avoid engine damage.",
  },
  {
    id: "oil_pressure", pattern: /\b(oil (pressure )?(light|warning)|low oil pressure)\b/i,
    system: "engine", drivability: "do_not_drive", safetyCritical: true,
    headline: "Stop driving — low oil pressure can destroy the engine.",
    causes: [{ title: "Low oil level or oil pump/sensor problem", confidence: "medium", explanation: "The light means the engine may not be getting enough oil." }],
    steps: [{ instruction: "Turn the engine off, wait 5 minutes on level ground, and check the oil level on the dipstick.", difficulty: "diy_easy" }],
    tools: ["Rag or paper towel"], stopDrivingIf: [
      "If the oil-pressure light stays on, continuing to run the engine without oil pressure can destroy its bearings — shut it off immediately.",
    ], mechanicReason: "An oil pressure warning needs inspection before driving.",
  },
  {
    id: "brakes", pattern: /\b(brakes?|braking|brake pedal|pedal (goes|sinks) to the floor|brake light)\b/i,
    system: "brakes", drivability: "drive_to_shop_only", safetyCritical: true,
    headline: "Brake problems affect your ability to stop — drive only to a shop, gently.",
    causes: [
      { title: "Worn brake pads or rotors", confidence: "medium", explanation: "Grinding, squealing, or shaking when braking usually comes from worn or warped parts." },
      { title: "Low brake fluid or a leak", confidence: "low", explanation: "A soft or sinking pedal can mean fluid is low or leaking." },
    ],
    steps: [{ instruction: "With the engine off, check the brake fluid level in the reservoir and look for wet spots near each wheel.", difficulty: "diy_easy" }],
    tools: ["Flashlight"], stopDrivingIf: [
      "If the brake pedal feels soft or sinks, continued driving risks losing hydraulic braking — stop and have the car towed.",
      "If the brake warning light is on with low fluid, a hydraulic leak can lead to brake failure — stop and have the car towed.",
      "If braking is metal-on-metal, continued driving can destroy the rotors and reduce stopping ability — stop and have the car towed.",
    ], mechanicReason: "Brakes are safety-critical and should be inspected by a mechanic.",
  },
  {
    id: "steering_suspension", pattern: /\b(steering|pulls? (hard )?to (the )?(left|right)|wheel (wobble|wobbles|shakes?)|clunk(s|ing)?|wandering)\b/i,
    system: "steering", drivability: "drive_to_shop_only", safetyCritical: true,
    headline: "Steering or suspension issues can affect control — drive only to a shop.",
    causes: [{ title: "Worn steering or suspension parts (tie rods, ball joints, bushings)", confidence: "low", explanation: "Clunks, wandering, or pulling often come from worn joints or alignment problems." }],
    steps: [{ instruction: "Note when it happens (turning, bumps, braking, speed) and check tire pressures.", difficulty: "diy_easy" }],
    tools: ["Tire pressure gauge"], stopDrivingIf: [
      "If steering becomes loose or very heavy, continued driving risks losing directional control — stop and have the car towed.",
      "If the car wanders or a wheel wobbles, a steering, suspension, or wheel part may separate and cause loss of control — stop and have it towed.",
    ], mechanicReason: "Steering and suspension are safety-critical.",
  },
  {
    id: "tires", pattern: /\b(flat tire|tire (bulge|bubble|blowout)|losing air|cords? showing)\b/i,
    system: "tires_wheels", drivability: "drive_to_shop_only", safetyCritical: true,
    headline: "A damaged tire can fail suddenly — use the spare or drive only to a tire shop.",
    causes: [{ title: "Tire damage or puncture", confidence: "medium", explanation: "Bulges and air loss mean the tire's structure or seal is damaged." }],
    steps: [{ instruction: "Check the tire pressure and look for nails, bulges, or exposed cords.", difficulty: "diy_easy" }],
    tools: ["Tire pressure gauge", "Flashlight"], stopDrivingIf: [
      "If the tire is flat, bulging, or showing cords, continued driving can make it fail and damage the wheel or cause loss of control — use the spare or tow it.",
    ], mechanicReason: "Damaged tires should be inspected by a tire shop.",
  },
  {
    id: "flashing_cel", pattern: /\b(flashing|blinking)\b[^.]*\b(check engine|engine light|cel|mil)\b|\b(check engine|engine light|cel|mil)\b[^.]*\b(flashing|blinking)\b/i,
    system: "ignition", drivability: "drive_to_shop_only", safetyCritical: false,
    headline: "A flashing check-engine light means an active misfire — avoid driving except gently to a shop.",
    causes: [{ title: "Severe engine misfire", confidence: "medium", explanation: "A flashing light means misfires bad enough to damage the catalytic converter." }],
    steps: [{ instruction: "Scan for misfire codes (P0300–P0308) before driving further.", difficulty: "diy_moderate" }],
    tools: ["OBD-II scanner"], stopDrivingIf: [FLASHING_CEL], mechanicReason: null,
  },
  {
    id: "airbag", pattern: /\b(airbag|air bag|srs)\b/i,
    system: "srs_airbag", drivability: "drive_with_caution", safetyCritical: true,
    headline: "The car drives normally, but airbags may not deploy in a crash — get it checked soon.",
    causes: [{ title: "Airbag (SRS) system fault, often a seat or clock-spring connection", confidence: "low", explanation: "The SRS light means the system has disabled itself or found a fault." }],
    steps: [{ instruction: "Note which warning light is on. Do not unplug or probe any airbag connectors.", difficulty: "diy_easy" }],
    tools: [], stopDrivingIf: [], mechanicReason: "Airbag systems can deploy unexpectedly when serviced and must be handled by a professional.",
  },
  {
    id: "hybrid_hv", pattern: /\b(high[- ]voltage|hybrid (battery|system)|orange cables?|ev battery)\b/i,
    system: "hybrid_ev", drivability: "drive_to_shop_only", safetyCritical: true,
    headline: "Hybrid/EV high-voltage faults need a qualified technician.",
    causes: [{ title: "High-voltage battery or hybrid system fault", confidence: "low", explanation: "These systems carry lethal voltage." }],
    steps: [{ instruction: "Note the warning messages shown. Do not touch orange high-voltage cables or components.", difficulty: "diy_easy" }],
    tools: [], stopDrivingIf: [
      "If a hybrid/EV warning is joined by power loss, continued driving can leave the car without propulsion — stop and have it towed.",
    ], mechanicReason: "High-voltage systems are dangerous to work on without training.",
  },
];

export type UnknownCodeInfo = {
  system: VehicleSystem;
  area: string;
  manufacturerSpecific: boolean;
  safetyCritical: boolean;
};

export function describeUnknownCode(code: string): UnknownCodeInfo {
  const manufacturerSpecific = code[1] === "1" || code[1] === "3";
  if (code[0] === "B") {
    return {
      system: code.startsWith("B00") ? "srs_airbag" : "body",
      area: "the body systems (lights, airbags, comfort features)",
      manufacturerSpecific,
      safetyCritical: code.startsWith("B00"),
    };
  }
  if (code[0] === "C") {
    return { system: "brakes", area: "the chassis systems (ABS, stability control, steering, suspension)", manufacturerSpecific, safetyCritical: true };
  }
  if (code[0] === "U") {
    return { system: "network", area: "communication between the vehicle's computer modules", manufacturerSpecific, safetyCritical: false };
  }

  const powertrainAreas: Record<string, Pick<UnknownCodeInfo, "system" | "area">> = {
    "1": { system: "fuel", area: "fuel and air metering" },
    "2": { system: "fuel", area: "fuel and air metering" },
    "3": { system: "ignition", area: "the ignition system or misfires" },
    "4": { system: "emissions", area: "the emissions controls" },
    "5": { system: "air_intake", area: "vehicle speed, idle control, or auxiliary inputs" },
    "6": { system: "electrical", area: "the engine computer or its output circuits" },
    "7": { system: "transmission", area: "the transmission" },
    "8": { system: "transmission", area: "the transmission" },
    "9": { system: "transmission", area: "the transmission" },
  };
  const area = powertrainAreas[code[2]] ?? { system: "engine" as const, area: "the powertrain" };
  return { ...area, manufacturerSpecific, safetyCritical: false };
}
