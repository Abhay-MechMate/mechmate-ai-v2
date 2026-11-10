import { listSessions } from "@/app/diagnose/data";
import { SessionCard } from "@/app/diagnose/session-card";
import { Alert } from "@/components/badge";
import { signInPath } from "@/lib/auth/routing";
import { getAuthContext } from "@/lib/supabase/auth-context";
import Link from "next/link";
import { redirect } from "next/navigation";

// Deliberately no page-level <Suspense>: a streamed boundary is revealed by
// React's inline script on requestAnimationFrame, which browsers never fire in
// hidden/background tabs, leaving the fallback up indefinitely. Rendering the
// whole page in the initial HTML avoids that and lets redirect() send a real 307.
export default async function DiagnosisHistoryPage() {
  const { supabase, user } = await getAuthContext();

  if (!user) redirect(signInPath("/diagnose"));

  const sessions = await listSessions(supabase);

  return (
        <div className="mx-auto max-w-4xl">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">Diagnoses</h1>
            <p className="mt-2 text-fg-secondary">
              Every diagnosis you&apos;ve run, newest first.
            </p>
          </header>

        {sessions === null ? (
          <Alert className="mt-8">
            We couldn&apos;t load your diagnoses. Please try again.
          </Alert>
        ) : sessions.length === 0 ? (
          <Link
            href="/diagnose/new"
            className="group mt-10 flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-surface p-6 text-center transition-colors hover:border-fg-muted hover:bg-surface-raised"
          >
            <span className="flex size-11 items-center justify-center rounded-full border border-line-strong text-2xl text-accent transition-transform group-hover:scale-105">
              +
            </span>
            <span className="mt-4 font-semibold">Run your first diagnosis</span>
            <span className="mt-1 text-sm text-fg-muted">
              Enter a trouble code or describe what your car is doing.
            </span>
          </Link>
        ) : (
          <section className="mt-10 space-y-4">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </section>
        )}
        </div>
  );
}
