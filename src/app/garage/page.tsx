import { deleteVehicleAction } from "@/app/garage/actions";
import { listVehicles } from "@/app/garage/data";
import { Alert } from "@/components/badge";
import { signInPath } from "@/lib/auth/routing";
import { getAuthContext } from "@/lib/supabase/auth-context";
import Link from "next/link";
import { redirect } from "next/navigation";

type GaragePageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

// No page-level <Suspense> (see diagnose/page.tsx note).
export default async function GaragePage({ searchParams }: GaragePageProps) {
  const { supabase, user } = await getAuthContext();

  if (!user) {
    redirect(signInPath("/garage"));
  }

  const [vehicles, query] = await Promise.all([
    listVehicles(supabase),
    searchParams,
  ]);
  const errorParam = query.error;
  const actionError = Array.isArray(errorParam) ? errorParam[0] : errorParam;

  return (
        <div className="mx-auto max-w-5xl">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">My Garage</h1>
            <p className="mt-2 text-fg-secondary">
              Keep your vehicles ready for faster, more accurate diagnoses.
            </p>
          </header>

        {actionError || vehicles === null ? (
          <Alert className="mt-8">
            {actionError ?? "We couldn't load your vehicles. Please try again."}
          </Alert>
        ) : null}

        <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/garage/add"
            className="group flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-surface p-6 text-center transition-colors hover:border-fg-muted hover:bg-surface-raised"
          >
            <span className="flex size-11 items-center justify-center rounded-full border border-line-strong text-2xl text-accent transition-transform group-hover:scale-105">
              +
            </span>
            <span className="mt-4 font-semibold text-fg">
              Add a vehicle
            </span>
            <span className="mt-1 text-sm text-fg-muted">
              Enter a VIN or add the details manually.
            </span>
          </Link>

          {(vehicles ?? []).map((vehicle) => {
            const fallbackName = [
              vehicle.modelYear,
              vehicle.make,
              vehicle.model,
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <article
                key={vehicle.id}
                className="flex min-h-56 flex-col rounded-xl border border-line bg-surface p-6"
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-fg-muted">
                    {vehicle.nickname ? fallbackName : "Vehicle"}
                  </p>
                  <h2 className="mt-2 line-clamp-2 break-words text-xl font-semibold tracking-tight text-fg">
                    {vehicle.nickname || fallbackName}
                  </h2>
                  {vehicle.trimName || vehicle.engine ? (
                    <p className="mt-2 text-sm text-fg-secondary">
                      {[vehicle.trimName, vehicle.engine]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                </div>

                <dl className="mt-5 space-y-2 text-sm">
                  {vehicle.vin ? (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-fg-muted">VIN</dt>
                      <dd className="truncate font-mono text-xs text-fg-secondary">
                        {vehicle.vin}
                      </dd>
                    </div>
                  ) : null}
                  {vehicle.mileage !== null ? (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-fg-muted">Mileage</dt>
                      <dd className="text-fg-secondary">
                        {vehicle.mileage.toLocaleString()} mi
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-auto flex items-center justify-between pt-6">
                  <Link
                    href={`/diagnose/new?vehicle=${vehicle.id}`}
                    className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
                  >
                    Diagnose
                  </Link>
                  <form action={deleteVehicleAction}>
                    <input type="hidden" name="id" value={vehicle.id} />
                    <button
                      type="submit"
                      className="text-sm font-medium text-fg-muted transition-colors hover:text-danger-fg"
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
  );
}
