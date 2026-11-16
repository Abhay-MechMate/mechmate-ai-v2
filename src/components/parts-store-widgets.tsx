"use client";

// Phase 4 client widgets for the parts section (owner decisions 2026-11-16):
//   - PartsStoreChips: the per-part store chips, reordered so the pinned store
//     comes first (owner picked "locator links + pinned favorite" instead of a
//     true distance sort, which would need a store-location dataset).
//   - PartsZipBar: enter a zip once; saved in this browser; shows "stores near
//     {zip}" locator links for the pickup stores.
// Settings live in localStorage (per device); moving them to the profile is a
// logged backlog item. State syncs from localStorage via useSyncExternalStore
// (never setState-in-an-effect) so SSR renders the default order and the
// client corrects it after hydration.
// Design rules: no title attributes (tooltips are banned), no opacity on text.

import {
  useCallback,
  useSyncExternalStore,
} from "react";
import type { VehicleSnapshot } from "@/lib/diagnosis/types";
import {
  buildStoreLinks,
  PICKUP_STORES,
  storeLocatorLink,
  type StoreKey,
} from "@/lib/parts/stores";

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

// --- zip + store locators ----------------------------------------------------

const STORE_LABELS: Record<StoreKey, string> = {
  rockauto: "RockAuto",
  autozone: "AutoZone",
  oreilly: "O'Reilly",
  advance: "Advance",
};

export function PartsZipBar() {
  const savedZipRaw = useStoredSetting(ZIP_STORAGE_KEY);
  const savedZip = savedZipRaw ?? "";
  const valid = /^\d{5}$/.test(savedZip.trim());

  if (valid) {
    return (
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
        <span>
          Stores near <span className="text-fg-secondary">{savedZip}</span>:
        </span>
        {PICKUP_STORES.map((store) => {
          const url = storeLocatorLink(store, savedZip);
          return url ? (
            <a
              key={store}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-line bg-canvas px-2 py-0.5 text-fg-secondary transition-colors hover:border-line-strong hover:text-fg"
            >
              find {STORE_LABELS[store]}
            </a>
          ) : null;
        })}
        <button
          type="button"
          onClick={() => writeSetting(ZIP_STORAGE_KEY, null)}
          className="underline underline-offset-2 transition-colors hover:text-fg"
        >
          change
        </button>
      </p>
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
        Your zip (find pickup stores near you):
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
        Save
      </button>
    </form>
  );
}
