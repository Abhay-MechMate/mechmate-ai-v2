import { describe, expect, it } from "vitest";
import {
  findNearbyStores,
  isValidZip,
  zipToCoords,
} from "../nearby";

describe("nearby stores (bundled OSM + Census data)", () => {
  it("validates 5-digit zips", () => {
    expect(isValidZip("01852")).toBe(true);
    expect(isValidZip("0185")).toBe(false);
    expect(isValidZip("abcde")).toBe(false);
  });

  it("resolves a real zip to coordinates", () => {
    const coords = zipToCoords("01852");
    expect(coords).not.toBeNull();
    expect(coords![0]).toBeGreaterThan(41);
    expect(coords![0]).toBeLessThan(44);
    expect(coords![1]).toBeGreaterThan(-72);
    expect(coords![1]).toBeLessThan(-70);
  });

  it("finds stores for Lowell MA, merged and sorted by distance", () => {
    const stores = findNearbyStores("01852");
    expect(stores.length).toBeGreaterThan(0);
    for (let i = 1; i < stores.length; i += 1) {
      expect(stores[i].distanceMiles).toBeGreaterThanOrEqual(
        stores[i - 1].distanceMiles,
      );
    }
    // Distances must be plausible (dataset is US-wide).
    expect(stores[0].distanceMiles).toBeLessThan(50);
    // No more than 3 per chain.
    const perBrand = new Map<string, number>();
    for (const store of stores) {
      perBrand.set(store.store, (perBrand.get(store.store) ?? 0) + 1);
    }
    for (const count of perBrand.values()) {
      expect(count).toBeLessThanOrEqual(3);
    }
  });

  it("covers multiple chains for a dense zip", () => {
    const stores = findNearbyStores("01852");
    const brands = new Set(stores.map((store) => store.store));
    expect(brands.size).toBeGreaterThanOrEqual(2);
  });

  it("returns an empty list for an unknown zip", () => {
    expect(findNearbyStores("99999")).toEqual([]);
  });

  it("is deterministic", () => {
    expect(findNearbyStores("01852")).toEqual(findNearbyStores("01852"));
  });
});
