// Phase 4: store deep-link builders. Pure functions — no fetches, no secrets.
//
// URL formats verified (docs/PARTS_DESIGN.md §3):
//   - RockAuto: /en/catalog/{make},{year},{model} — vehicle-scoped server-side
//     (verified live 2026-11-12; readable form, no internal codes needed)
//   - AutoZone: /searchresult?searchText={terms} (format from their indexed pages)
//   - O'Reilly: /search?q={terms} (same model)
//   - Advance: /web/SearchResults?searchTerm={terms} (format from their indexed pages)
//
// Owner feedback 2026-11-16: vehicle-prefixed search terms made O'Reilly return
// thousands of wrong results, so search links carry CLEAN PART TERMS ONLY. The
// copy tells the owner to add their car on the store's site once — results then
// filter to fit. AutoZone/O'Reilly/Advance bot-wall scripts (403) but serve
// real browsers fine; re-verify in a real browser during the visual pass.
//
// Store-locator links (owner decision 2026-11-16: locator links + pinned
// favorite instead of a true distance sort):
//   - Advance: stores.advanceautoparts.com/?zipcode={zip} (200 verified, param accepted)
//   - O'Reilly: locations.oreillyauto.com/en-us/?searchterm={zip} (200; Where2GetIt
//     platform reads searchterm — confirm in the visual pass)
//   - AutoZone: /locations/ (JS-only locator, zip cannot be carried in the URL)

import type { VehicleSnapshot } from "@/lib/diagnosis/types";
import type { PartLine } from "./map";

export type StoreKey = "rockauto" | "autozone" | "oreilly" | "advance";

export type StoreLink = {
  store: StoreKey;
  /** Human label, e.g. "RockAuto". */
  name: string;
  url: string;
};

const STORE_NAMES: Record<StoreKey, string> = {
  rockauto: "RockAuto",
  autozone: "AutoZone",
  oreilly: "O'Reilly",
  advance: "Advance",
};

/** Which stores have physical pickup locations (eligible for locator links). */
export const PICKUP_STORES: StoreKey[] = ["autozone", "oreilly", "advance"];

type VehicleInfo = Pick<VehicleSnapshot, "make" | "model" | "modelYear">;
type PartInfo = Pick<PartLine, "searchTerms">;

function slug(value: string): string {
  return value.trim().toLowerCase().replaceAll(/\s+/g, "-");
}

function encodeTerms(terms: string): string {
  return terms
    .trim()
    .split(/\s+/)
    .map((word) => encodeURIComponent(word))
    .join("+");
}

/** RockAuto vehicle path: make,year,model (their catalog handles the rest). */
function rockAutoVehiclePath(vehicle: VehicleInfo): string {
  const parts = [slug(vehicle.make)];
  if (vehicle.modelYear) parts.push(String(vehicle.modelYear));
  parts.push(slug(vehicle.model));
  return parts.join(",");
}

export function rockAutoLink(vehicle: VehicleInfo): string {
  return `https://www.rockauto.com/en/catalog/${rockAutoVehiclePath(vehicle)}`;
}

export function autoZoneLink(part: PartInfo): string {
  return `https://www.autozone.com/searchresult?searchText=${encodeTerms(part.searchTerms)}`;
}

export function oreillyLink(part: PartInfo): string {
  return `https://www.oreillyauto.com/search?q=${encodeTerms(part.searchTerms)}`;
}

export function advanceLink(part: PartInfo): string {
  return `https://www.advanceautoparts.com/web/SearchResults?searchTerm=${encodeTerms(part.searchTerms)}`;
}

export function buildStoreLinks(
  vehicle: VehicleInfo,
  part: PartInfo,
  preferredStore?: StoreKey | null,
): StoreLink[] {
  const links: StoreLink[] = [
    { store: "rockauto", name: STORE_NAMES.rockauto, url: rockAutoLink(vehicle) },
    { store: "autozone", name: STORE_NAMES.autozone, url: autoZoneLink(part) },
    { store: "oreilly", name: STORE_NAMES.oreilly, url: oreillyLink(part) },
    { store: "advance", name: STORE_NAMES.advance, url: advanceLink(part) },
  ];
  if (!preferredStore) return links;
  return [...links].sort(
    (a, b) => Number(b.store === preferredStore) - Number(a.store === preferredStore),
  );
}

/**
 * Locator deep-link per pickup store. Returns null for stores without a
 * URL-addressable locator or without local stores (RockAuto).
 */
export function storeLocatorLink(store: StoreKey, zip: string): string | null {
  const trimmed = zip.trim();
  if (!/^\d{5}$/.test(trimmed)) return null;
  switch (store) {
    case "advance":
      return `https://stores.advanceautoparts.com/?zipcode=${trimmed}`;
    case "oreilly":
      return `https://locations.oreillyauto.com/en-us/?searchterm=${trimmed}`;
    case "autozone":
      return `https://www.autozone.com/locations/`;
    case "rockauto":
      return null;
  }
}
