// Phase 4: "Parts you may need" section on the diagnosis report.
// Derived at render time from the current result (docs/PARTS_DESIGN.md §5).
// Layout rules from owner feedback (2026-11-16, "hard to look at"):
//   - store links are compact bordered chips (client component, pin + zip live
//     in parts-store-widgets.tsx)
//   - fulfillment/instructions appear ONCE under the header, never per link
//   - difficulty appears only when it changes a decision (shop-level jobs)
//   - search links carry clean part terms; the store's own vehicle selection
//     does the fitment (vehicle-prefixed terms made O'Reilly return junk)
// Accent discipline: chips are bordered, never filled accent; hover tints text.

import type { VehicleSnapshot } from "@/lib/diagnosis/types";
import type { CauseParts } from "@/lib/parts/derive";
import {
  PartsStoreChips,
  PartsZipBar,
} from "@/components/parts-store-widgets";

type PartsSectionProps = {
  causes: CauseParts[];
  vehicle: VehicleSnapshot;
};

export function PartsSection({ causes, vehicle }: PartsSectionProps) {
  if (causes.length === 0) return null;

  return (
    <section className="mt-6 rounded-xl border border-line bg-surface p-6">
      <h2 className="text-xl font-semibold">Parts you may need</h2>
      <p className="mt-2 text-sm leading-relaxed text-fg-secondary">
        Search links open with the part name. Add your car once on a store&apos;s
        site and its results filter to fit — RockAuto already scopes to your
        car. Pin a store to keep it first, and save your zip for pickup-store
        locators.
      </p>

      <PartsZipBar />

      <div className="mt-4 divide-y divide-line">
        {causes.map((cause) => (
          <div key={cause.causeTitle} className="py-4 first:pt-0 last:pb-0">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
              {cause.causeTitle}
            </h3>
            <ul className="mt-3 space-y-4">
              {cause.parts.map((part) => (
                <li key={part.label}>
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="text-sm font-medium text-fg">{part.label}</p>
                    {part.difficulty === "shop_recommended" ? (
                      <span className="text-xs text-fg-muted">
                        shop-level job
                      </span>
                    ) : null}
                  </div>
                  {part.note ? (
                    <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">
                      {part.note}
                    </p>
                  ) : null}
                  <PartsStoreChips
                    vehicle={vehicle}
                    searchTerms={part.searchTerms}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
