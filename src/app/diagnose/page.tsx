import {
  DRIVABILITY_DISPLAY,
  formatSessionDate,
  vehicleLabel,
} from "@/app/diagnose/display";
import { listSessions } from "@/app/diagnose/data";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default function DiagnosisHistoryPage() {
  return (
    <Suspense fallback={<DiagnosisHistoryLoading />}>
      <DiagnosisHistoryContent />
    </Suspense>
  );
}

async function DiagnosisHistoryContent() {
  // Always render per request: this page needs a logged-in user, and the
  // prerendered streaming shell never resolves in the browser (Next 16 PPR quirk).
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin");

  const sessions = await listSessions(supabase);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <Link
              href="/garage"
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-emerald-400"
            >
              My Garage
            </Link>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Diagnoses</h1>
            <p className="mt-2 text-zinc-400">
              Every diagnosis you&apos;ve run, newest first.
            </p>
          </div>
          <Link
            href="/diagnose/new"
            className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-emerald-950 transition-colors hover:bg-emerald-400"
          >
            New diagnosis
          </Link>
        </header>

        {sessions === null ? (
          <p
            role="alert"
            className="mt-8 rounded-lg border border-red-900/70 bg-red-950/50 px-3 py-2 text-sm text-red-300"
          >
            We couldn&apos;t load your diagnoses. Please try again.
          </p>
        ) : sessions.length === 0 ? (
          <Link
            href="/diagnose/new"
            className="group mt-10 flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-6 text-center transition-colors hover:border-emerald-500 hover:bg-zinc-900"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-emerald-500 text-2xl text-emerald-950 transition-transform group-hover:scale-105">
              +
            </span>
            <span className="mt-4 font-semibold">Run your first diagnosis</span>
            <span className="mt-1 text-sm text-zinc-500">
              Enter a trouble code or describe what your car is doing.
            </span>
          </Link>
        ) : (
          <section className="mt-10 space-y-4">
            {sessions.map((session) => {
              const drivability = session.drivabilityLevel
                ? DRIVABILITY_DISPLAY[session.drivabilityLevel]
                : null;
              const symptoms = session.symptoms
                ? session.symptoms.length > 80
                  ? `${session.symptoms.slice(0, 80)}…`
                  : session.symptoms
                : null;

              return (
                <Link
                  key={session.id}
                  href={`/diagnose/${session.id}`}
                  className="block rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700 hover:bg-zinc-900/80"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-white">
                        {vehicleLabel(session.vehicleSnapshot)}
                      </h2>
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatSessionDate(session.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {drivability ? (
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${drivability.className}`}
                        >
                          {drivability.label}
                        </span>
                      ) : null}
                      {session.resultSource === "rules" ? (
                        <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
                          Built-in guide
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {session.dtcCodes.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {session.dtcCodes.map((code) => (
                        <span
                          key={code}
                          className="rounded-md bg-zinc-950 px-2 py-1 font-mono text-xs text-emerald-300"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {symptoms ? (
                    <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                      “{symptoms}”
                    </p>
                  ) : null}
                  {session.topCause ? (
                    <p className="mt-3 text-sm text-zinc-300">
                      <span className="text-zinc-500">Most likely:</span>{" "}
                      {session.topCause}
                    </p>
                  ) : null}
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function DiagnosisHistoryLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
      Loading diagnoses…
    </main>
  );
}
