import { SiteHeader } from "@/components/site-header";
import { getAuthContext } from "@/lib/supabase/auth-context";
import Link from "next/link";
import { redirect } from "next/navigation";

const features = [
  {
    title: "Diagnose",
    body: "Enter a check-engine code or describe the symptom in your own words. Get ranked likely causes, confidence, and the first things to check.",
  },
  {
    title: "Guided assistant",
    body: "The assistant asks the right follow-up questions — cold or hot, any smell, when does it happen — and narrows the diagnosis with you.",
  },
  {
    title: "Parts you need",
    body: "End with the exact parts for your vehicle, with store options and prices, so you can fix it without the guesswork.",
  },
];

export default async function Home() {
  const { user } = await getAuthContext();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-canvas text-fg">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-6">
        <HeroView />

        {/* How it works */}
        <section id="how" className="grid gap-6 pb-24 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-line bg-surface p-6"
            >
              <h2 className="mb-2 font-semibold text-fg">
                {f.title}
              </h2>
              <p className="text-sm leading-relaxed text-fg-secondary">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto max-w-5xl px-6 py-6 text-sm text-fg-muted">
          MechMate AI — under active development, not yet released. Guidance is
          informational, not a substitute for a qualified mechanic.
        </div>
      </footer>
    </div>
  );
}

function HeroView() {
  return (
    <section className="py-24 text-center">
      <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
        Figure out what&apos;s wrong with your car.
        <span className="text-accent"> Then fix it.</span>
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-fg-secondary">
        Enter your check-engine code or describe the problem in plain words.
        MechMate walks you through the diagnosis, answers your questions along
        the way, and tells you exactly which parts to buy.
      </p>
      <div className="mt-10 flex items-center justify-center gap-4">
        <Link
          href="/signup"
          className="rounded-lg bg-accent px-6 py-3 font-medium text-on-accent transition-colors hover:bg-accent-hover"
        >
          Start a diagnosis
        </Link>
        <Link
          href="#how"
          className="rounded-lg border border-line-strong px-6 py-3 font-medium text-fg-secondary transition-colors hover:bg-surface-raised"
        >
          See how it works
        </Link>
      </div>
    </section>
  );
}
