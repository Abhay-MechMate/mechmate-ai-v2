// Phase 4 (owner decision 2026-11-19): the zip feature computes NEAREST STORES
// itself — store locations come from OpenStreetMap (ODbL, attribution in the
// UI) and zip centroids from the US Census Gazetteer; both are bundled JSON,
// so the runtime never depends on a third-party API being up. The dataset is
// rebuilt by scripts/refresh-parts-data.mjs when store counts drift.
//
// Caveat shown in the UI: OSM coverage of retail chains is high but not
// perfect, so the list is labeled approximate.

import zipCentroids from "./data/zip-centroids.json";
import storeLocations from "./data/store-locations.json";

export type NearbyStore = {
  store: "autozone" | "oreilly" | "advance";
  /** Distance from the zip centroid, rounded to 0.1 mi. */
  distanceMiles: number;
  lat: number;
  lng: number;
};

type Point = readonly [number, number];

const EARTH_RADIUS_MILES = 3958.8;

// JSON imports widen [lat, lng] tuples to number[]; cast via unknown.
const LOCATIONS: Record<string, readonly Point[]> = {
  autozone: (storeLocations.autozone ?? []) as unknown as readonly Point[],
  oreilly: (storeLocations.oreilly ?? []) as unknown as readonly Point[],
  advance: (storeLocations.advance ?? []) as unknown as readonly Point[],
};

export const STORE_DISPLAY_NAMES: Record<NearbyStore["store"], string> = {
  autozone: "AutoZone",
  oreilly: "O'Reilly",
  advance: "Advance",
};

export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip.trim());
}

export function zipToCoords(zip: string): Point | null {
  const point = (zipCentroids as unknown as Record<string, Point>)[zip.trim()];
  return point ?? null;
}

function haversineMiles(a: Point, b: Point): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

/**
 * The closest stores to a zip, all chains merged and sorted by distance.
 * Takes the nearest `perBrand` stores per chain (so one dense chain cannot
 * crowd out the others), then re-sorts the result. Zip centroids and store
 * coordinates are both approximations — distances are "as the crow flies".
 */
export function findNearbyStores(
  zip: string,
  perBrand = 3,
): NearbyStore[] {
  const coords = zipToCoords(zip);
  if (!coords) return [];

  const result: NearbyStore[] = [];
  for (const [store, points] of Object.entries(LOCATIONS)) {
    const withDistance = points.map((point) => ({
      store: store as NearbyStore["store"],
      distanceMiles: haversineMiles(coords, point),
      lat: point[0],
      lng: point[1],
    }));
    withDistance.sort((a, b) => a.distanceMiles - b.distanceMiles);
    result.push(...withDistance.slice(0, perBrand));
  }
  result.sort((a, b) => a.distanceMiles - b.distanceMiles);
  return result.map((item) => ({
    ...item,
    distanceMiles: Math.round(item.distanceMiles * 10) / 10,
  }));
}
