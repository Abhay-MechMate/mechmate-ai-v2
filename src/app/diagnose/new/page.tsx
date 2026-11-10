import {
  DiagnosisForm,
  type DiagnosisVehicleOption,
} from "@/app/diagnose/new/diagnosis-form";
import { Alert } from "@/components/badge";
import { signInPath } from "@/lib/auth/routing";
import { getAuthContext } from "@/lib/supabase/auth-context";
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
  const { supabase, user } = await getAuthContext();

  if (!user) redirect(signInPath("/diagnose/new"));

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
  const requestedVehicleExists = requestedVehicle
    ? vehicles.some((vehicle) => vehicle.id === requestedVehicle)
    : true;
  const defaultVehicleId =
    vehicles.find((vehicle) => vehicle.id === requestedVehicle)?.id ??
    vehicles[0]?.id ??
    "";

  return (
        <div className="mx-auto w-full max-w-2xl">
        <section className="rounded-xl border border-line bg-surface p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">New diagnosis</h1>
          <p className="mt-2 leading-relaxed text-fg-secondary">
            Enter the trouble codes from your scanner, describe what the car is
            doing, or both.
          </p>

          {error ? (
            <Alert className="mt-6">
              We couldn&apos;t load your garage. Please try again.
            </Alert>
          ) : vehicles.length === 0 ? (
            <div className="mt-7 rounded-xl border border-dashed border-line-strong bg-canvas p-6 text-center">
              <h2 className="text-lg font-semibold">Add a vehicle first</h2>
              <p className="mt-2 text-sm leading-relaxed text-fg-secondary">
                Diagnoses are tailored to your car, so we need to know what you
                drive.
              </p>
              <Link
                href="/garage/add"
                className="mt-5 inline-flex rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
              >
                Add a vehicle
              </Link>
            </div>
          ) : (
            <>
              {!requestedVehicleExists ? (
                <Alert tone="caution" className="mt-6">
                  That car isn&apos;t in your garage anymore. Pick one below.
                </Alert>
              ) : null}
              <DiagnosisForm
                vehicles={vehicles}
                defaultVehicleId={defaultVehicleId}
              />
            </>
          )}
        </section>
        </div>
  );
}
