import type { ResultDiff } from "./assistant-types";
import type { DiagnosisResult } from "./types";

export function diffResults(before: DiagnosisResult, after: DiagnosisResult): ResultDiff {
  const beforeMap = new Map(
    before.likelyCauses.map((cause, index) => [cause.title.toLowerCase(), { cause, rank: index + 1 }]),
  );
  const afterMap = new Map(
    after.likelyCauses.map((cause, index) => [cause.title.toLowerCase(), { cause, rank: index + 1 }]),
  );
  const causes: ResultDiff["causes"] = [];
  for (const [key, current] of afterMap) {
    const prior = beforeMap.get(key);
    if (!prior || prior.rank !== current.rank || prior.cause.confidence !== current.cause.confidence) {
      causes.push({
        title: current.cause.title,
        fromRank: prior?.rank ?? null,
        toRank: current.rank,
        fromConfidence: prior?.cause.confidence ?? null,
        toConfidence: current.cause.confidence,
      });
    }
  }
  for (const [key, prior] of beforeMap) {
    if (!afterMap.has(key)) {
      causes.push({
        title: prior.cause.title,
        fromRank: prior.rank,
        toRank: null,
        fromConfidence: prior.cause.confidence,
        toConfidence: null,
      });
    }
  }
  const beforeRuledOut = new Set(before.ruledOut.map((item) => item.title.toLowerCase()));
  return {
    verdict:
      before.drivability.level === after.drivability.level
        ? null
        : { from: before.drivability.level, to: after.drivability.level },
    causes,
    newlyRuledOut: after.ruledOut
      .filter((item) => !beforeRuledOut.has(item.title.toLowerCase()))
      .map((item) => item.title),
    firstStepChanged:
      before.inspectionSteps[0]?.instruction !== after.inspectionSteps[0]?.instruction,
  };
}
