"use client";

// Phase 4 client widgets for the parts section (owner decisions 2026-11-16):
//   - PartsStoreChips: the per-part store chips, reordered so the pinned store
//     comes first.
//   - PartsZipBar: enter a zip once; saved in this browser; shows the closest
//     stores per chain with crow-fly distances (owner decision 2026-11-19:
//     real distances computed from bundled OpenStreetMap + Census data —
//     the old store-locator links were useless empty search boxes).
// Settings live in localStorage (per device); moving them to the profile is a
// logged backlog item. State syncs from localStorage via useSyncExternalStore
// (never setState-in-an-effect) so SSR renders the default order and the
// client corrects it after hydration.
// Design rules: no title attributes (tooltips are banned), no opacity on text.

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import type { VehicleSnapshot } from "@/lib/diagnosis/types";
import { buildStoreLinks, type StoreKey } from "@/lib/parts/stores";
import { STORE_DISPLAY_NAMES } from "@/lib/parts/nearby";
import { findNearbyStoresAction } from "@/app/parts/actions";

const PIN_STORAGE_KEY = "mm-parts-pin";
const ZIP_STORAGE_KEY = "mm-parts-zip";

// --- localStorage-backed settings store -------------------------------------

const listeners = new Set<() => void>();
const cache = new Map<string, string | null>();

function readSetting(key: string): string | null {
  if (!cache.has(key)) cache.set(key, window.localStorage.getItem(key));
  return cache.get(key) ?? null;
}

function writeSetting(key: string, value: string | null): void {
  if (value === null) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, value);
  cache.set(key, value);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function useStoredSetting(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => readSetting(key),
    () => null,
  );
}

// --- pinned store chips ------------------------------------------------------

function isStoreKey(value: string | null): value is StoreKey {
  return (
    value === "rockauto" ||
    value === "autozone" ||
    value === "oreilly" ||
    value === "advance"
  );
}

export function PartsStoreChips({
  vehicle,
  searchTerms,
}: {
  vehicle: VehicleSnapshot;
  searchTerms: string;
}) {
  const pinnedRaw = useStoredSetting(PIN_STORAGE_KEY);
  const pinned = isStoreKey(pinnedRaw) ? pinnedRaw : null;

  const togglePin = useCallback(
    (store: StoreKey) => {
      writeSetting(PIN_STORAGE_KEY, pinned === store ? null : store);
    },
    [pinned],
  );

  const links = buildStoreLinks(vehicle, { searchTerms }, pinned);

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {links.map((link) => (
        <span key={link.store} className="flex items-center gap-1">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
              pinned === link.store
                ? "border-accent text-accent hover:text-accent-hover"
                : "border-line bg-canvas text-fg-secondary hover:border-line-strong hover:text-fg"
            }`}
          >
            {link.name} →
          </a>
          <button
            type="button"
            onClick={() => togglePin(link.store)}
            aria-label={pinned === link.store ? `Unpin ${link.name}` : `Pin ${link.name} first`}
            className="rounded px-1 text-xs text-fg-muted transition-colors hover:text-fg"
          >
            {pinned === link.store ? "★" : "☆"}
          </button>
        </span>
      ))}
    </div>
  );
}

// --- zip → nearest stores (owner decision 2026-11-19: real distance list) ----

type NearbyStoresResult = Awaited<ReturnType<typeof findNearbyStoresAction>>;

function mapsLink(store: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}`;
}

export function PartsZipBar() {
  const savedZipRaw = useStoredSetting(ZIP_STORAGE_KEY);
  const savedZip = savedZipRaw ?? "";
  const valid = /^\d{5}$/.test(savedZip.trim());

  const [state, setState] = useState<{
    status: "idle" | "done";
    result: NearbyStoresResult | null;
  }>({ status: "idle", result: null });

  // Loaded zip from a previous visit → compute the list automatically.
  // No synchronous setState here (React hooks rule): state updates only after
  // the action resolves.
  useEffect(() => {
    if (!valid || state.status !== "idle") return;
    let cancelled = false;
    findNearbyStoresAction(savedZip).then((result) => {
      if (!cancelled) setState({ status: "done", result });
    });
    return () => {
      cancelled = true;
    };
  }, [valid, state.status, savedZip]);

  if (valid) {
    return (
      <div className="mt-3">
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
          <span>
            Closest stores to{" "}
            <span className="text-fg-secondary">{savedZip}</span>
          </span>
          <span aria-hidden>·</span>
          <span>crow-fly distances, from OpenStreetMap data</span>
          <button
            type="button"
            onClick={() => writeSetting(ZIP_STORAGE_KEY, null)}
            className="underline underline-offset-2 transition-colors hover:text-fg"
          >
            change
          </button>
        </p>
        {state.status === "idle" ? (
          <p className="mt-2 text-xs text-fg-muted">Finding stores…</p>
        ) : null}
        {state.status === "done" &&
        state.result &&
        !state.result.ok ? (
          <p className="mt-2 text-xs text-fg-muted">{state.result.error}</p>
        ) : null}
        {state.status === "done" && state.result?.ok ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {state.result.stores.map((store) => (
              <li key={`${store.store}:${store.lat},${store.lng}`}>
                <a
                  href={mapsLink(store)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-baseline gap-1.5 rounded-md border border-line bg-canvas px-2.5 py-1 text-xs text-fg-secondary transition-colors hover:border-line-strong hover:text-fg"
                >
                  <span className="font-medium text-fg">{store.distanceMiles.toFixed(1)} mi</span>
                  <span>{STORE_DISPLAY_NAMES[store.store]}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const value = String(data.get("zip") ?? "").trim();
        if (/^\d{5}$/.test(value)) writeSetting(ZIP_STORAGE_KEY, value);
      }}
      className="mt-3 flex items-center gap-2"
    >
      <label htmlFor="parts-zip" className="text-xs text-fg-muted">
        Your zip (find the closest stores):
      </label>
      <input
        id="parts-zip"
        name="zip"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={5}
        defaultValue=""
        className="w-20 rounded-md border border-line-strong bg-canvas px-2 py-1 text-xs text-fg placeholder:text-fg-muted"
      />
      <button
        type="submit"
        className="rounded-md border border-line px-2 py-1 text-xs text-fg-secondary transition-colors hover:border-line-strong hover:text-fg"
      >
        Find stores
      </button>
    </form>
  );
}
