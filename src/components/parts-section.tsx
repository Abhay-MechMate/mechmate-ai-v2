// Phase 4: "Parts you may need" section on the diagnosis report.
// Derived at render time from the current result (docs/PARTS_DESIGN.md §5).
// Accent discipline: store links are secondary-style links, never filled
// accent buttons; labels/notes use fg tokens; no popups, no shadows.

import type { VehicleSnapshot } from "@/lib/diagnosis/types";
import type { CauseParts } from "@/lib/parts/derive";
import { buildStoreLinks } from "@/lib/parts/stores";

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
        Search links, not guaranteed part numbers — each store confirms fitment
        for your car. Confirm the cause first (see the test under each cause
        above); replacing parts to see if they fix it is how repair bills
        balloon.
      </p>

      <div className="mt-5 space-y-5">
        {causes.map((cause) => (
          <div
            key={cause.causeTitle}
            className="border-t border-line pt-5 first:border-0 first:pt-0"
          >
            <h3 className="text-sm font-semibold text-fg">{cause.causeTitle}</h3>
            <ul className="mt-3 space-y-3">
              {cause.parts.map((part) => (
                <li key={part.label} className="text-sm leading-relaxed">
                  <p className="text-fg">
                    {part.label}
                    {part.difficulty ? (
                      <span className="ml-2 text-xs text-fg-muted">
                        {part.difficulty === "shop_recommended"
                          ? "shop-level job"
                          : part.difficulty === "diy_moderate"
                            ? "some experience needed"
                            : "beginner-friendly"}
                      </span>
                    ) : null}
                  </p>
                  {part.note ? (
                    <p className="mt-0.5 text-fg-muted">{part.note}</p>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    {buildStoreLinks(vehicle, part).map((link) => (
                      <a
                        key={link.store}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-fg-secondary underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
                      >
                        {link.name}
                        <span className="ml-1.5 text-xs text-fg-muted no-underline">
                          {link.fulfillment}
                        </span>
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
