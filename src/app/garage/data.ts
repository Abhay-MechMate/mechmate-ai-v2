import "server-only";

import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type GarageVehicle = {
  id: string;
  nickname: string | null;
  vin: string | null;
  modelYear: number | null;
  make: string;
  model: string;
  trimName: string | null;
  engine: string | null;
  mileage: number | null;
};

type VehicleRow = {
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

export async function listVehicles(supabase: SupabaseClient): Promise<GarageVehicle[] | null> {
  const { data, error } = await supabase.from("vehicles")
    .select("id, nickname, vin, model_year, make, model, trim_name, engine, mileage")
    .order("created_at", { ascending: false });
  if (error || !data) return null;
  return (data as VehicleRow[]).map((row) => ({
    id: row.id,
    nickname: row.nickname,
    vin: row.vin,
    modelYear: row.model_year,
    make: row.make,
    model: row.model,
    trimName: row.trim_name,
    engine: row.engine,
    mileage: row.mileage,
  }));
}
