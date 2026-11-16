// Phase 4: store deep-link builders. Pure functions — no fetches, no secrets.
//
// URL formats verified 2026-11-12 (docs/PARTS_DESIGN.md §3):
//   - RockAuto: https://www.rockauto.com/en/catalog/{make},{year},{model}
//     (vehicle-scoped server-side; readable form confirmed live, internal
//     part-type codes not required)
//   - AutoZone: https://www.autozone.com/searchresult?searchText={terms}
//     (format from AutoZone's own indexed pages; the owner's vehicle is
//     selected once in AutoZone's UI, after which results are fit-filtered)
//   - O'Reilly: https://www.oreillyauto.com/search?q={terms}
//     (same vehicle-filter model as AutoZone)
//
// AutoZone and O'Reilly bot-wall scripts (403) but serve real browsers fine.
// Both formats are re-verified in a real browser during the visual pass.

import type { VehicleSnapshot } from "@/lib/diagnosis/types";
import type { PartLine } from "./map";

export type StoreKey = "rockauto" | "autozone" | "oreilly";

export type StoreLink = {
  store: StoreKey;
  /** Human label, e.g. "RockAuto". */
  name: string;
  url: string;
  /** The honest trade-off for this store. */
  fulfillment: string;
};

const STORE_NAMES: Record<StoreKey, string> = {
  rockauto: "RockAuto",
  autozone: "AutoZone",
  oreilly: "O'Reilly",
};

const FULFILLMENT: Record<StoreKey, string> = {
  rockauto: "online · ships to home",
  autozone: "online · same-day store pickup",
  oreilly: "online · same-day store pickup",
};

function slug(value: string): string {
  return value.trim().toLowerCase().replaceAll(/\s+/g, "-");
}

function encodeTerms(terms: string, joiner: string): string {
  return terms
    .trim()
    .split(/\s+/)
    .map((word) => encodeURIComponent(word))
    .join(joiner);
}

/** RockAuto vehicle path: make,year,model (their catalog handles the rest). */
function rockAutoVehiclePath(vehicle: Pick<VehicleSnapshot, "make" | "model" | "modelYear">): string {
  const parts = [slug(vehicle.make)];
  if (vehicle.modelYear) parts.push(String(vehicle.modelYear));
  parts.push(slug(vehicle.model));
  return parts.join(",");
}

export function rockAutoLink(
  vehicle: Pick<VehicleSnapshot, "make" | "model" | "modelYear">,
): string {
  return `https://www.rockauto.com/en/catalog/${rockAutoVehiclePath(vehicle)}`;
}

/**
 * AutoZone and O'Reilly have no public way to pre-select a vehicle via URL
 * (it lives in their own session), but their search boxes accept
 * "{year} {make} {model} {part terms}" as free text, which effectively puts
 * the car in for the owner (owner feedback 2026-11-16: links must carry the
 * vehicle). Without a year, fall back to the part terms alone.
 */
function searchTermsWithVehicle(
  vehicle: Pick<VehicleSnapshot, "make" | "model" | "modelYear">,
  part: Pick<PartLine, "searchTerms">,
): string {
  const vehicleTerms = vehicle.modelYear
    ? `${vehicle.modelYear} ${vehicle.make} ${vehicle.model}`
    : null;
  return [vehicleTerms, part.searchTerms].filter(Boolean).join(" ");
}

export function autoZoneLink(
  vehicle: Pick<VehicleSnapshot, "make" | "model" | "modelYear">,
  part: Pick<PartLine, "searchTerms">,
): string {
  return `https://www.autozone.com/searchresult?searchText=${encodeTerms(
    searchTermsWithVehicle(vehicle, part),
    "+",
  )}`;
}

export function oreillyLink(
  vehicle: Pick<VehicleSnapshot, "make" | "model" | "modelYear">,
  part: Pick<PartLine, "searchTerms">,
): string {
  return `https://www.oreillyauto.com/search?q=${encodeTerms(
    searchTermsWithVehicle(vehicle, part),
    "+",
  )}`;
}

export function buildStoreLinks(
  vehicle: Pick<VehicleSnapshot, "make" | "model" | "modelYear">,
  part: Pick<PartLine, "searchTerms">,
): StoreLink[] {
  return [
    { store: "rockauto", name: STORE_NAMES.rockauto, url: rockAutoLink(vehicle), fulfillment: FULFILLMENT.rockauto },
    { store: "autozone", name: STORE_NAMES.autozone, url: autoZoneLink(vehicle, part), fulfillment: FULFILLMENT.autozone },
    { store: "oreilly", name: STORE_NAMES.oreilly, url: oreillyLink(vehicle, part), fulfillment: FULFILLMENT.oreilly },
  ];
}
