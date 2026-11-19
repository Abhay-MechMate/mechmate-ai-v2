"use server";

// Parts feature actions. Pure computation against the bundled datasets — no
// auth needed (a zip resolves to public store locations, nothing user-owned).

import { findNearbyStores, isValidZip, type NearbyStore } from "@/lib/parts/nearby";

export type NearbyStoresResult =
  | { ok: true; stores: NearbyStore[] }
  | { ok: false; error: string };

export async function findNearbyStoresAction(zip: string): Promise<NearbyStoresResult> {
  if (!isValidZip(zip)) {
    return { ok: false, error: "Enter a 5-digit zip code." };
  }
  const stores = findNearbyStores(zip);
  if (stores.length === 0) {
    return { ok: false, error: "No stores found near that zip." };
  }
  return { ok: true, stores };
}
