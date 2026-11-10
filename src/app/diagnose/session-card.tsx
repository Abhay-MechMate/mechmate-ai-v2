import { DRIVABILITY_DISPLAY, formatSessionDate, sessionSourceLabel, vehicleLabel } from "@/app/diagnose/display";
import { Badge } from "@/components/badge";
import type { DiagnosticSessionSummary } from "@/lib/diagnosis/types";
import Link from "next/link";

export function SessionCard({ session, compact = false }: { session: DiagnosticSessionSummary; compact?: boolean }) {
  const drivability = session.drivabilityLevel ? DRIVABILITY_DISPLAY[session.drivabilityLevel] : null;
  const symptoms = session.symptoms && session.symptoms.length > 80 ? `${session.symptoms.slice(0, 80)}…` : session.symptoms;
  return <Link href={`/diagnose/${session.id}`} className="block rounded-xl border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-surface-raised">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="truncate font-semibold text-fg">{vehicleLabel(session.vehicleSnapshot)}</h3>
        <p className="mt-1 text-xs text-fg-muted">{formatSessionDate(session.createdAt)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {drivability ? <Badge tone={drivability.tone}>{drivability.label}</Badge> : null}
        <Badge>{sessionSourceLabel(session)}</Badge>
        {session.refinedRound > 0 ? <Badge>Refined ×{session.refinedRound}</Badge> : null}
        {session.assistantStatus === "active" ? <Badge tone="caution">Assistant in progress</Badge> : null}
        {session.vehicleId === null ? <Badge>Removed from garage</Badge> : null}
      </div>
    </div>
    {!compact && session.dtcCodes.length > 0 ? <div className="mt-4 flex flex-wrap gap-2">{session.dtcCodes.map((code) => <span key={code} className="rounded-md bg-canvas px-2 py-1 font-mono text-xs text-fg">{code}</span>)}</div> : null}
    {!compact && symptoms ? <p className="mt-3 text-sm leading-relaxed text-fg-secondary">“{symptoms}”</p> : null}
    {session.topCause ? <p className="mt-3 truncate text-sm text-fg-secondary"><span className="text-fg-muted">Most likely:</span> {session.topCause}</p> : null}
  </Link>;
}
