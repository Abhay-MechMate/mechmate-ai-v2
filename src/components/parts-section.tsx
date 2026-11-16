// Phase 4: "Parts you may need" section on the diagnosis report.
// Derived at render time from the current result (docs/PARTS_DESIGN.md §5).
// Layout rules from owner feedback (2026-11-16, "hard to look at"):
//   - store links are compact bordered chips, one row per part
//   - the fulfillment explanation appears ONCE under the header, never per link
//   - difficulty appears only when it changes a decision (shop-level jobs)
//   - framing text is one line
// Accent discipline: chips are bordered, never filled accent; hover tints text.

import type { VehicleSnapshot } from "@/lib/diagnosis/types";
import type { CauseParts } from "@/lib/parts/derive";
import { buildStoreLinks } from "@/lib/parts/stores";

type PartsSectionProps = {
  causes: CauseParts[];
  vehicle: VehicleSnapshot;
};

export function PartsSection({ causes, vehicle }: PartsSectionProps) {
  if (causes.length === 0) return null;
  const yearLabel = vehicle.modelYear ? String(vehicle.modelYear) : null;

  return (
    <section className="mt-6 rounded-xl border border-line bg-surface p-6">
      <h2 className="text-xl font-semibold">Parts you may need</h2>
      <p className="mt-2 text-sm leading-relaxed text-fg-secondary">
        {yearLabel
          ? `Links are pre-searched for your ${yearLabel} ${vehicle.make} ${vehicle.model} — each store confirms exact fitment.`
          : "Links are pre-searched — each store confirms exact fitment."}{" "}
        RockAuto ships to home; AutoZone and O&apos;Reilly also offer same-day
        store pickup.
      </p>

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
                  <div className="mt-2 flex flex-wrap gap-2">
                    {buildStoreLinks(vehicle, part).map((link) => (
                      <a
                        key={link.store}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border border-line bg-canvas px-2.5 py-1 text-xs text-fg-secondary transition-colors hover:border-line-strong hover:text-fg"
                      >
                        {link.name} →
                      </a>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
