import { AddVehicleForm } from "@/app/garage/add/add-vehicle-form";
import { SiteHeader } from "@/components/site-header";

type AddVehiclePageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

export default async function AddVehiclePage({
  searchParams,
}: AddVehiclePageProps) {
  const errorParam = (await searchParams).error;
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam;

  return (
    <>
      <SiteHeader />
      <AddVehicleForm error={error} />
    </>
  );
}
