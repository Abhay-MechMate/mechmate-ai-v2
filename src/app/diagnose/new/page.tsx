import {
  DiagnosisForm,
  type DiagnosisVehicleOption,
} from "@/app/diagnose/new/diagnosis-form";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const maxDuration = 60;

type NewDiagnosisPageProps = {
  searchParams: Promise<{ vehicle?: string | string[] }>;
};

type VehicleRow = {
  id: string;
  nickname: string | null;
  model_year: number | null;
  make: string;
  model: string;
};

// No page-level <Suspense> (see diagnose/page.tsx note).
export default async function NewDiagnosisPage({
  searchParams,
}: NewDiagnosisPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin");

  const [{ data, error }, query] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, nickname, model_year, make, model")
      .order("created_at", { ascending: false }),
    searchParams,
  ]);
  const rows = (data ?? []) as VehicleRow[];
  const vehicles: DiagnosisVehicleOption[] = rows.map((row) => ({
    id: row.id,
    nickname: row.nickname,
    modelYear: row.model_year,
    make: row.make,
    model: row.model,
  }));
  const requestedVehicle = Array.isArray(query.vehicle)
    ? query.vehicle[0]
    : query.vehicle;
  const defaultVehicleId =
    vehicles.find((vehicle) => vehicle.id === requestedVehicle)?.id ??
    vehicles[0]?.id ??
    "";

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-100">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/garage"
          className="text-sm font-medium text-zinc-400 transition-colors hover:text-emerald-400"
        >
          ← Back to Garage
        </Link>

        <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">New diagnosis</h1>
          <p className="mt-2 leading-relaxed text-zinc-400">
            Enter the trouble codes from your scanner, describe what the car is
            doing, or both.
          </p>

          {error ? (
            <p
              role="alert"
              className="mt-6 rounded-lg border border-red-900/70 bg-red-950/50 px-3 py-2 text-sm text-red-300"
            >
              We couldn&apos;t load your garage. Please try again.
            </p>
          ) : vehicles.length === 0 ? (
            <div className="mt-7 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-6 text-center">
              <h2 className="text-lg font-semibold">Add a vehicle first</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Diagnoses are tailored to your car, so we need to know what you
                drive.
              </p>
              <Link
                href="/garage/add"
                className="mt-5 inline-flex rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-emerald-950 transition-colors hover:bg-emerald-400"
              >
                Add a vehicle
              </Link>
            </div>
          ) : (
            <DiagnosisForm
              vehicles={vehicles}
              defaultVehicleId={defaultVehicleId}
            />
          )}
        </section>
      </div>
    </main>
  );
}
