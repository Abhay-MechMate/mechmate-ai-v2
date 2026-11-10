import {
  countRecentAssistantTurns,
  listTurns,
} from "@/app/diagnose/assistant-data";
import { getSession } from "@/app/diagnose/data";
import {
  assistantUnavailableReason,
  CONFIDENCE_DISPLAY,
  DRIVABILITY_DISPLAY,
  fallbackReasonLabel,
  formatSessionDate,
  vehicleDetail,
  vehicleLabel,
} from "@/app/diagnose/display";
import { FirstChecks, type EntryState } from "@/app/diagnose/[id]/first-checks";
import { DiffChips } from "@/app/diagnose/[id]/assistant/turn-views";
import { SiteHeader } from "@/components/site-header";
import {
  MAX_TURNS_PER_SESSION,
  assistantDailyLimit,
} from "@/lib/diagnosis/assistant-types";
import { deriveConversation } from "@/lib/diagnosis/conversation";
import { diffResults } from "@/lib/diagnosis/diff";
import { isAiConfigured } from "@/lib/diagnosis/openrouter";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type DiagnosisReportPageProps = {
  params: Promise<{ id: string }>;
};

export const maxDuration = 60;

// No page-level <Suspense> (see diagnose/page.tsx note).
export default async function DiagnosisReportPage({
  params,
}: DiagnosisReportPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin");

  const { id } = await params;
  const session = await getSession(supabase, id);
  if (!session) notFound();

  const [turns, recent] = await Promise.all([
    listTurns(supabase, id),
    countRecentAssistantTurns(supabase, user.id),
  ]);

  const conversation = turns ? deriveConversation(turns, session) : null;
  const configured = isAiConfigured();
  const dailyLimited = recent.count >= assistantDailyLimit();
  const resetAt = recent.oldestAt
    ? new Date(new Date(recent.oldestAt).getTime() + 86_400_000).toISOString()
    : undefined;
  let entry: EntryState;
  if (!conversation) {
    entry = { kind: "unavailable", reason: "We couldn't load this conversation." };
  } else if (conversation.next.kind === "answer") {
    entry = {
      kind: "resume",
      href: `/diagnose/${id}/assistant#round-${conversation.next.round}`,
    };
  } else if (
    conversation.next.kind === "retry" ||
    conversation.next.kind === "stopped"
  ) {
    entry = { kind: "view", href: `/diagnose/${id}/assistant` };
  } else if ((turns?.length ?? 0) >= MAX_TURNS_PER_SESSION) {
    entry = {
      kind: "unavailable",
      reason: assistantUnavailableReason("session_limit"),
    };
  } else if (!configured || dailyLimited) {
    entry = {
      kind: "unavailable",
      reason: assistantUnavailableReason(
        configured ? "daily_limit" : "not_configured",
        resetAt,
      ),
    };
  } else {
    entry = { kind: conversation.next.kind };
  }

  const { result, vehicleSnapshot } = session;
  const drivability = DRIVABILITY_DISPLAY[result.drivability.level];
  const reportDiff = diffResults(session.initialResult, result);
  const latestUpdate = conversation?.rounds
    .filter((item) => item.rediagnosis?.result)
    .at(-1)?.rediagnosis;
  const startAgainHref = session.vehicleId
    ? `/diagnose/new?vehicle=${session.vehicleId}`
    : "/diagnose/new";

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
        <div className="mx-auto max-w-3xl">
        <Link
          href="/diagnose"
          className="text-sm font-medium text-zinc-400 transition-colors hover:text-emerald-400"
        >
          ← All diagnoses
        </Link>

        <header className="mt-6">
          <h1 className="text-3xl font-bold tracking-tight">
            {vehicleLabel(vehicleSnapshot)}
          </h1>
          <p className="mt-2 text-zinc-400">{vehicleDetail(vehicleSnapshot)}</p>
          <p className="mt-1 text-sm text-zinc-500">
            {formatSessionDate(session.createdAt)}
          </p>
        </header>

        <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Your input
          </h2>
          {session.dtcCodes.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {session.dtcCodes.map((code) => (
                <span
                  key={code}
                  className="rounded-md bg-zinc-950 px-2.5 py-1 font-mono text-sm text-emerald-300"
                >
                  {code}
                </span>
              ))}
            </div>
          ) : null}
          {session.symptoms ? (
            <blockquote className="mt-4 border-l-2 border-zinc-700 pl-4 text-sm leading-relaxed whitespace-pre-wrap text-zinc-300">
              {session.symptoms}
            </blockquote>
          ) : null}
        </section>

        {session.resultSource === "ai" ? (
          <div className="mt-4">
            <span
              title={session.model ?? undefined}
              className="inline-flex rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300"
            >
              AI analysis
            </span>
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-amber-900/70 bg-amber-950/40 px-4 py-3 text-sm leading-relaxed text-amber-200">
            {session.fallbackReason === "daily_limit"
              ? "You've reached today's AI analysis limit, so this report uses MechMate's built-in guide."
              : "AI analysis was unavailable, so this report uses MechMate's built-in guide. It's more general than an AI analysis."}
            {result.round > 0 ? (
              <span className="mt-2 block text-amber-300">
                Since refined by AI from your answers.
              </span>
            ) : null}
          </p>
        )}

        {result.round > 0 ? (
          <Link
            id="assistant-update"
            href={`/diagnose/${id}/assistant`}
            className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-emerald-300 transition-colors hover:text-emerald-200"
          >
            <span>Refined with the assistant</span>
            <span className="text-zinc-600">·</span>
            <span>round {result.round} of 3</span>
            <span>· View the conversation →</span>
          </Link>
        ) : null}

        <section
          className={`mt-6 rounded-lg border px-4 py-3 ${drivability.className}`}
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-sm font-semibold">{drivability.label}</h2>
            <p className="text-sm">{result.drivability.headline}</p>
          </div>
          {result.drivability.stopDrivingIf.length > 0 ? (
            <div className="mt-3 border-t border-current/20 pt-3">
              <h3 className="text-xs font-semibold">
                Stop driving and get help if:
              </h3>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs">
                {result.drivability.stopDrivingIf.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold">What this points to</h2>
          <p className="mt-3 leading-relaxed text-zinc-300">{result.summary}</p>
        </section>

        <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold">Likely causes</h2>
          {result.likelyCauses.length === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Not enough information to rank causes. Try adding a trouble code
              or more detail about when it happens.
            </p>
          ) : (
            <ol className="mt-5 space-y-5">
              {result.likelyCauses.map((cause, index) => {
                const confidence = CONFIDENCE_DISPLAY[cause.confidence];
                const system = cause.system.replaceAll("_", " ");
                const systemLabel =
                  system.charAt(0).toUpperCase() + system.slice(1);

                return (
                  <li
                    key={`${cause.title}:${index}`}
                    className="border-t border-zinc-800 pt-5 first:border-0 first:pt-0"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-emerald-950">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-white">{cause.title}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs ${confidence.className}`}
                          >
                            {confidence.label}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {systemLabel}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                          {cause.explanation}
                        </p>
                        {cause.detail ? (
                          <p className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm leading-relaxed text-zinc-400">
                            {cause.detail}
                          </p>
                        ) : null}
                        {cause.relatedCodes.length > 0 ? (
                          <p className="mt-2 font-mono text-xs text-zinc-500">
                            {cause.relatedCodes.join(", ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {result.ruledOut.length > 0 ? (
          <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold">Ruled out</h2>
            <ul className="mt-4 space-y-4">
              {result.ruledOut.map((cause) => (
                <li
                  key={cause.title}
                  className="border-t border-zinc-800 pt-4 first:border-0 first:pt-0"
                >
                  <h3 className="text-sm font-medium text-zinc-400 line-through">
                    {cause.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                    {cause.reason}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section
          id="first-checks"
          className="mt-6 scroll-mt-24 rounded-xl border border-zinc-800 bg-zinc-900 p-6"
        >
          <h2 className="text-xl font-semibold">First checks</h2>
          <FirstChecks
            sessionId={id}
            revision={session.revision}
            steps={result.inspectionSteps}
            entry={entry}
          />
        </section>

        {result.toolsNeeded.length > 0 ? (
          <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold">Tools needed</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-300">
              {result.toolsNeeded.map((tool) => (
                <li key={tool}>{tool}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {result.codeNotes.length > 0 ? (
          <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold">Code meanings</h2>
            <dl className="mt-4 space-y-4">
              {result.codeNotes.map((note) => (
                <div key={note.code}>
                  <dt className="font-mono text-sm font-semibold text-emerald-300">
                    {note.code}
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-zinc-400">
                    {note.meaning}
                    {note.manufacturerSpecific
                      ? " (varies by manufacturer)"
                      : ""}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {result.round > 0 ? (
          <details className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <summary className="cursor-pointer text-base font-semibold text-zinc-200">
              What changed since the first pass
            </summary>
            <div className="mt-4">
              <DiffChips diff={reportDiff} />
            </div>
          </details>
        ) : null}

        <footer className="mt-8 border-t border-zinc-800 pt-6">
          {result.seeMechanic.recommended && result.seeMechanic.reason ? (
            <p className="text-xs leading-relaxed text-zinc-500">
              Some of this repair is best done by a shop:{" "}
              {result.seeMechanic.reason}
            </p>
          ) : null}
          <p className="mt-3 text-xs text-zinc-500">
            Source:{" "}
            {session.resultSource === "ai"
              ? `AI${session.model ? ` · ${session.model}` : ""}`
              : `MechMate built-in rules · ${fallbackReasonLabel(session.fallbackReason)}`}
          </p>
          {result.round > 0 ? (
            <p className="mt-1 text-xs text-zinc-500">
              Updated by the assistant: AI
              {latestUpdate?.model ? ` · ${latestUpdate.model}` : ""} · round{" "}
              {result.round}
            </p>
          ) : null}
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">
            MechMate&apos;s guidance is informational and may be wrong. Confirm
            the cause before buying parts, and see a qualified mechanic for
            anything involving brakes, steering, airbags, fuel leaks, or
            overheating.
          </p>
          <Link
            href={startAgainHref}
            className="mt-6 inline-flex rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-emerald-950 transition-colors hover:bg-emerald-400"
          >
            Start another diagnosis
          </Link>
        </footer>
        </div>
      </main>
    </>
  );
}
