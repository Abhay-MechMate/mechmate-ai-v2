import { deleteVehicleAction } from "@/app/garage/actions";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

type GaragePageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

type Vehicle = {
  id: string;
  nickname: string | null;
  vin: string | null;
  model_year: number | null;
  make: string;
  model: string;
  trim_name: string | null;
  engine: string | null;
  mileage: number | null;
};

export default function GaragePage({ searchParams }: GaragePageProps) {
  return (
    <Suspense fallback={<GarageLoading />}>
      <GarageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function GarageContent({ searchParams }: GaragePageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const [{ data, error: vehiclesError }, query] = await Promise.all([
    supabase
      .from("vehicles")
      .select(
        "id, nickname, vin, model_year, make, model, trim_name, engine, mileage",
      )
      .order("created_at", { ascending: false }),
    searchParams,
  ]);
  const errorParam = query.error;
  const actionError = Array.isArray(errorParam) ? errorParam[0] : errorParam;
  const vehicles = (data ?? []) as Vehicle[];

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-zinc-100">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-sm font-medium text-emerald-400">
              MechMate
            </Link>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              My Garage
            </h1>
            <p className="mt-2 text-zinc-400">
              Keep your vehicles ready for faster, more accurate diagnoses.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/diagnose"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-white"
            >
              Diagnoses
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-white"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        {actionError || vehiclesError ? (
          <p
            role="alert"
            className="mt-8 rounded-lg border border-red-900/70 bg-red-950/50 px-3 py-2 text-sm text-red-300"
          >
            {actionError ?? "We couldn't load your vehicles. Please try again."}
          </p>
        ) : null}

        <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/garage/add"
            className="group flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-6 text-center transition-colors hover:border-emerald-500 hover:bg-zinc-900"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-emerald-500 text-2xl text-emerald-950 transition-transform group-hover:scale-105">
              +
            </span>
            <span className="mt-4 font-semibold text-zinc-100">
              Add a vehicle
            </span>
            <span className="mt-1 text-sm text-zinc-500">
              Enter a VIN or add the details manually.
            </span>
          </Link>

          {vehicles.map((vehicle) => {
            const fallbackName = [
              vehicle.model_year,
              vehicle.make,
              vehicle.model,
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <article
                key={vehicle.id}
                className="flex min-h-56 flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-6"
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                    {vehicle.nickname ? fallbackName : "Vehicle"}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
                    {vehicle.nickname || fallbackName}
                  </h2>
                  {vehicle.trim_name || vehicle.engine ? (
                    <p className="mt-2 text-sm text-zinc-400">
                      {[vehicle.trim_name, vehicle.engine]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                </div>

                <dl className="mt-5 space-y-2 text-sm">
                  {vehicle.vin ? (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-zinc-500">VIN</dt>
                      <dd className="truncate font-mono text-xs text-zinc-300">
                        {vehicle.vin}
                      </dd>
                    </div>
                  ) : null}
                  {vehicle.mileage !== null ? (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-zinc-500">Mileage</dt>
                      <dd className="text-zinc-300">
                        {vehicle.mileage.toLocaleString()} mi
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-auto flex items-center justify-between pt-6">
                  <Link
                    href={`/diagnose/new?vehicle=${vehicle.id}`}
                    className="text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
                  >
                    Diagnose
                  </Link>
                  <form action={deleteVehicleAction}>
                    <input type="hidden" name="id" value={vehicle.id} />
                    <button
                      type="submit"
                      className="text-sm font-medium text-zinc-500 transition-colors hover:text-red-400"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function GarageLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
      Loading your garage…
    </main>
  );
}
