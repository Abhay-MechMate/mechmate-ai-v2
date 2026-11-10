import { Breadcrumbs } from "@/components/breadcrumbs";
import Link from "next/link";

export default function DiagnosisNotFound() {
  return <div className="mx-auto max-w-2xl">
    <Breadcrumbs items={[{ label: "Diagnoses", href: "/diagnose" }, { label: "Not found" }]} />
    <section className="rounded-xl border border-line bg-surface p-6">
      <h1 className="text-2xl font-semibold text-fg">Diagnosis not found</h1>
      <p className="mt-2 text-fg-secondary">We couldn&apos;t find that diagnosis. It may have been removed, or the link is wrong.</p>
      <Link href="/diagnose" className="mt-5 inline-flex rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent hover:bg-accent-hover">View all diagnoses</Link>
    </section>
  </div>;
}
