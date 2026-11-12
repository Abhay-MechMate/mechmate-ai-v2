// Phase 4: derive the "Parts you may need" list from a diagnosis result.
// Pure function, deterministic, no database and no AI call (docs/PARTS_DESIGN.md §4).
// Store links are NOT built here — derivation is store-agnostic; the UI builds
// links from (vehicle, part) via stores.ts.

import type { DiagnosisResult } from "@/lib/diagnosis/types";
import { CAUSE_PARTS, NON_FIXABLE_CAUSES, SYSTEM_PARTS, type PartLine } from "./map";

export type CauseParts = {
  causeTitle: string;
  causeSystem: string;
  /** How the part lines were found — surfaced only in tests, not in the UI. */
  matchedBy: "cause" | "system" | "generic";
  parts: PartLine[];
};

const MAX_CAUSES = 3;
const MAX_LINES_PER_CAUSE = 3;

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function linesForCause(causeTitle: string, causeSystem: string): {
  matchedBy: CauseParts["matchedBy"];
  parts: PartLine[];
} {
  const curated = CAUSE_PARTS[normalizeTitle(causeTitle)];
  if (curated?.length) return { matchedBy: "cause", parts: curated.slice(0, MAX_LINES_PER_CAUSE) };

  const system = SYSTEM_PARTS[causeSystem];
  if (system?.length) return { matchedBy: "system", parts: system.slice(0, MAX_LINES_PER_CAUSE) };

  // Generic fallback: the cause title itself is a decent store search term.
  return {
    matchedBy: "generic",
    parts: [
      {
        label: causeTitle,
        searchTerms: causeTitle,
        note: "Search by this name — part names vary between stores.",
      },
    ],
  };
}

export function deriveParts(result: DiagnosisResult): CauseParts[] {
  const seenLabels = new Set<string>();
  const sections: CauseParts[] = [];

  for (const cause of result.likelyCauses.slice(0, MAX_CAUSES)) {
    if (NON_FIXABLE_CAUSES.has(normalizeTitle(cause.title))) continue;

    const { matchedBy, parts } = linesForCause(cause.title, cause.system);
    const fresh = parts.filter((part) => {
      const key = part.label.trim().toLowerCase();
      if (seenLabels.has(key)) return false;
      seenLabels.add(key);
      return true;
    });
    if (fresh.length === 0) continue;

    sections.push({
      causeTitle: cause.title,
      causeSystem: cause.system,
      matchedBy,
      parts: fresh,
    });
  }

  return sections;
}
