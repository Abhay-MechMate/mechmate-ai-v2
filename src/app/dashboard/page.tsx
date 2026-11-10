import { listOpenConversations } from "@/app/diagnose/assistant-data";
import { listSessions } from "@/app/diagnose/data";
import { formatRelative } from "@/app/diagnose/display";
import { SessionCard } from "@/app/diagnose/session-card";
import { listVehicles, type GarageVehicle } from "@/app/garage/data";
import { ASSISTANT_MAX_ROUNDS, dashboardCars, onboardingSteps, OPEN_CONVERSATION_LABEL } from "@/app/dashboard/model";
import { Alert, Badge } from "@/components/badge";
import { signInPath } from "@/lib/auth/routing";
import { getAuthContext } from "@/lib/supabase/auth-context";
import Link from "next/link";
import { redirect } from "next/navigation";

function carLabel(vehicle: GarageVehicle): string {
  return vehicle.nickname || [vehicle.modelYear, vehicle.make, vehicle.model].filter(Boolean).join(" ");
}

function GetStarted({ vehicleCount, sessionCount, anyRefined }: { vehicleCount: number; sessionCount: number; anyRefined: boolean }) {
  const steps = onboardingSteps({ vehicleCount, sessionCount, anyRefined });
  const content = {
    car: { title: "Add your car", body: "Diagnoses are tailored to the exact year, engine, and trim." },
    diagnose: { title: "Run a diagnosis", body: "Enter a trouble code or describe the symptom; get ranked causes and the test that confirms each." },
    assistant: { title: "Answer the assistant's questions", body: "It narrows the causes before you buy parts." },
  } as const;
  return <section className="mt-8 rounded-xl border border-line bg-surface p-6">
    <h2 className="text-xl font-semibold text-fg">Get started</h2>
    <ol className="mt-5 space-y-5">{steps.map((step, index) => <li key={step.key} className="flex gap-4 border-t border-line pt-5 first:border-0 first:pt-0">
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-full border font-semibold ${step.done ? "border-accent text-accent" : "border-line-strong text-fg-secondary"}`}>{step.done ? <><span aria-hidden="true">✓</span><span className="sr-only">Done</span></> : index + 1}</span>
      <div>
        <h3 className="font-semibold text-fg">{content[step.key].title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-fg-secondary">{content[step.key].body}</p>
        {step.key === "car" && !step.done ? <Link href="/garage/add" className="mt-3 inline-flex rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover">Add a vehicle</Link> : null}
        {step.key === "diagnose" && !step.done ? vehicleCount > 0 ? <Link href="/diagnose/new" className="mt-3 inline-flex rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover">New diagnosis</Link> : <span className="mt-3 block text-sm font-medium text-fg-muted">Add a car first</span> : null}
      </div>
    </li>)}</ol>
  </section>;
}

export default async function DashboardPage() {
  const { supabase, user } = await getAuthContext();
  if (!user) redirect(signInPath("/dashboard"));

  const [vehicles, sessions, open] = await Promise.all([
    listVehicles(supabase),
    listSessions(supabase, 5),
    listOpenConversations(supabase, 3),
  ]);
  const onboarding = vehicles !== null && sessions !== null && (vehicles.length === 0 || sessions.length === 0);
  const anyRefined = sessions?.some((session) => session.refinedRound > 0) ?? false;
  const loadedVehicles = vehicles ?? [];
  const cars = dashboardCars(loadedVehicles);

  return <div className="mx-auto max-w-6xl">
    <header><h1 className="text-3xl font-bold tracking-tight text-fg">Dashboard</h1><p className="mt-2 text-fg-secondary">Your cars, recent diagnoses, and anything waiting on you.</p></header>

    {onboarding ? <GetStarted vehicleCount={loadedVehicles.length} sessionCount={sessions?.length ?? 0} anyRefined={anyRefined} /> : null}

    {!onboarding && open === null ? <section className="mt-10"><h2 className="text-xl font-semibold text-fg">Pick up where you left off</h2><Alert className="mt-4">We couldn&apos;t load your assistant conversations. Please try again.</Alert></section> : !onboarding && open && open.length > 0 ? <section className="mt-10">
      <h2 className="text-xl font-semibold text-fg">Pick up where you left off</h2>
      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">{open.map((conversation) => {
        const label = OPEN_CONVERSATION_LABEL[conversation.next];
        return <li key={conversation.sessionId}><Link href={conversation.href} className="flex min-w-0 flex-wrap items-center justify-between gap-4 p-5 hover:bg-surface-raised">
          <div className="min-w-0 flex-1"><div className="flex min-w-0 flex-wrap items-center gap-2"><h3 className="truncate font-semibold text-fg">{conversation.vehicleLabel}</h3><Badge tone={label.tone}>{label.badge}</Badge>{conversation.vehicleRemoved ? <Badge>Removed from garage</Badge> : null}</div><p className="mt-1 truncate text-sm text-fg-secondary">{conversation.inputSummary}</p><p className="mt-2 truncate text-xs text-fg-muted">{conversation.topCause ? `#1 ${conversation.topCause} · ` : ""}{conversation.next === "ask_more" ? `Round ${conversation.round} of ${ASSISTANT_MAX_ROUNDS} done` : `Round ${conversation.round} of ${ASSISTANT_MAX_ROUNDS}`} · {formatRelative(conversation.updatedAt)}</p></div>
          <span className="text-sm font-semibold text-accent">{conversation.next === "ask_more" ? "Open" : "Continue"} →</span>
        </Link></li>;
      })}</ul>
    </section> : null}

    <section className="mt-10"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold text-fg">Your cars</h2><Link href="/garage" className="text-sm font-medium text-accent hover:text-accent-hover">Manage garage →</Link></div>
      {vehicles === null ? <Alert className="mt-4">We couldn&apos;t load your cars. Please try again.</Alert> : <><div className="mt-4 grid gap-4 lg:grid-cols-3 xl:grid-cols-4">{cars.shown.map((vehicle) => <article key={vehicle.id} className="flex min-h-52 flex-col rounded-xl border border-line bg-surface p-5"><h3 className="line-clamp-2 break-words font-semibold text-fg">{carLabel(vehicle)}</h3>{vehicle.trimName || vehicle.engine ? <p className="mt-2 text-sm text-fg-secondary">{[vehicle.trimName, vehicle.engine].filter(Boolean).join(" · ")}</p> : null}{vehicle.mileage !== null ? <p className="mt-2 text-sm text-fg-muted">{vehicle.mileage.toLocaleString()} mi</p> : null}<Link href={`/diagnose/new?vehicle=${vehicle.id}`} className="mt-auto w-fit rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover">Diagnose</Link></article>)}<Link href="/garage/add" className="flex min-h-52 items-center justify-center rounded-xl border border-dashed border-line-strong bg-surface p-5 text-center font-semibold text-accent hover:bg-surface-raised">+ Add a vehicle</Link></div>{cars.hidden > 0 ? <Link href="/garage" className="mt-4 inline-block text-sm font-medium text-accent hover:text-accent-hover">+{cars.hidden} more in your garage →</Link> : null}</>}
    </section>

    {sessions === null ? <section className="mt-10"><h2 className="text-xl font-semibold text-fg">Recent diagnoses</h2><Alert className="mt-4">We couldn&apos;t load your recent diagnoses. Please try again.</Alert></section> : !onboarding || loadedVehicles.length > 0 ? <section className="mt-10"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold text-fg">Recent diagnoses</h2>{sessions.length > 0 ? <Link href="/diagnose" className="text-sm font-medium text-accent hover:text-accent-hover">View all →</Link> : null}</div>{sessions.length > 0 ? <div className="mt-4 space-y-4">{sessions.map((session) => <SessionCard key={session.id} session={session} compact />)}</div> : loadedVehicles[0] ? <div className="mt-4 rounded-xl border border-line bg-surface p-5"><p className="text-fg-secondary">No diagnoses yet.</p><Link href={`/diagnose/new?vehicle=${loadedVehicles[0].id}`} className="mt-4 inline-flex rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover">Diagnose your {carLabel(loadedVehicles[0])}</Link></div> : null}</section> : null}
  </div>;
}
