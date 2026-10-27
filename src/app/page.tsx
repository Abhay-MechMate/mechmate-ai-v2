import Link from "next/link";

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

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">
              Mech<span className="text-emerald-400">Mate</span>
            </span>
            <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
              in progress
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/signin"
              className="text-zinc-400 transition-colors hover:text-zinc-100"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-emerald-500 px-3 py-1.5 font-medium text-emerald-950 transition-colors hover:bg-emerald-400"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-5xl px-6">
        <section className="py-24 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Figure out what&apos;s wrong with your car.
            <span className="text-emerald-400"> Then fix it.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
            Enter your check-engine code or describe the problem in plain
            words. MechMate walks you through the diagnosis, answers your
            questions along the way, and tells you exactly which parts to buy.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-lg bg-emerald-500 px-6 py-3 font-medium text-emerald-950 transition-colors hover:bg-emerald-400"
            >
              Start a diagnosis
            </Link>
            <Link
              href="#how"
              className="rounded-lg border border-zinc-700 px-6 py-3 font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
            >
              See how it works
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="grid gap-6 pb-24 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-6"
            >
              <h2 className="mb-2 font-semibold text-emerald-400">
                {f.title}
              </h2>
              <p className="text-sm leading-relaxed text-zinc-400">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800">
        <div className="mx-auto max-w-5xl px-6 py-6 text-sm text-zinc-500">
          MechMate AI — under active development, not yet released. Guidance is
          informational, not a substitute for a qualified mechanic.
        </div>
      </footer>
    </div>
  );
}
