import { AddVehicleForm } from "@/app/garage/add/add-vehicle-form";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { signInPath } from "@/lib/auth/routing";
import { getAuthContext } from "@/lib/supabase/auth-context";
import { redirect } from "next/navigation";

type AddVehiclePageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

export default async function AddVehiclePage({
  searchParams,
}: AddVehiclePageProps) {
  const { user } = await getAuthContext();
  if (!user) redirect(signInPath("/garage/add"));

  const errorParam = (await searchParams).error;
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Breadcrumbs
        items={[
          { label: "Garage", href: "/garage" },
          { label: "Add a vehicle" },
        ]}
      />
      <AddVehicleForm error={error} />
    </div>
  );
}
