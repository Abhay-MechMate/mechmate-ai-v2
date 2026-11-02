"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type VpicResult = {
  ModelYear?: unknown;
  Make?: unknown;
  Model?: unknown;
  Trim?: unknown;
  EngineManufacturer?: unknown;
  DisplacementL?: unknown;
};

function readText(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function usableDecodedValue(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  const normalized = String(value).trim();
  return normalized && normalized.toLowerCase() !== "null" ? normalized : "";
}

function optionalInteger(value: string) {
  if (!value) return null;

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function friendlyVehicleError(error: { code?: string; message?: string }) {
  if (
    error.code === "23505" ||
    error.message?.toLowerCase().includes("vehicles_vin_key")
  ) {
    return "That VIN is already saved";
  }

  return "We couldn't save that vehicle. Please try again.";
}

function redirectWithAddError(message: string): never {
  redirect(`/garage/add?error=${encodeURIComponent(message)}`);
}

export async function addVehicleAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const vin = readText(formData, "vin").toUpperCase();
  const nickname = readText(formData, "nickname");
  const manualYear = readText(formData, "year");
  const manualMake = readText(formData, "make");
  const manualModel = readText(formData, "model");
  const manualTrim = readText(formData, "trim");
  const manualEngine = readText(formData, "engine");
  const mileageValue = readText(formData, "mileage");

  let decoded: VpicResult = {};

  if (vin.length >= 10) {
    try {
      const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`,
        {
          cache: "no-store",
          signal: AbortSignal.timeout(10_000),
        },
      );

      if (response.ok) {
        const payload = (await response.json()) as { Results?: VpicResult[] };
        decoded = payload.Results?.[0] ?? {};
      }
    } catch {
      // Manual values below remain available if vPIC is unavailable or times out.
    }
  }

  const yearValue = usableDecodedValue(decoded.ModelYear) || manualYear;
  const make = usableDecodedValue(decoded.Make) || manualMake;
  const model = usableDecodedValue(decoded.Model) || manualModel;
  const trimName = usableDecodedValue(decoded.Trim) || manualTrim;
  const decodedEngineManufacturer = usableDecodedValue(
    decoded.EngineManufacturer,
  );
  const decodedDisplacement = usableDecodedValue(decoded.DisplacementL);
  const engine =
    decodedEngineManufacturer ||
    (decodedDisplacement ? `${decodedDisplacement}L` : "") ||
    manualEngine;

  if (!make || !model) {
    redirectWithAddError(
      vin.length >= 10
        ? "We couldn't decode that VIN. Add the make and model manually."
        : "Make and model are required.",
    );
  }

  const modelYear = optionalInteger(yearValue);
  const mileage = optionalInteger(mileageValue);

  if (yearValue && modelYear === null) {
    redirectWithAddError("Enter a valid model year.");
  }

  if (mileageValue && (mileage === null || mileage < 0)) {
    redirectWithAddError("Enter a valid mileage.");
  }

  const { error } = await supabase.from("vehicles").insert({
    user_id: user.id,
    nickname: nickname || null,
    vin: vin || null,
    model_year: modelYear,
    make,
    model,
    trim_name: trimName || null,
    engine: engine || null,
    mileage,
  });

  if (error) {
    redirectWithAddError(friendlyVehicleError(error));
  }

  redirect("/garage");
}

export async function deleteVehicleAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const id = readText(formData, "id");

  if (!id) {
    redirect(
      `/garage?error=${encodeURIComponent("We couldn't find that vehicle.")}`,
    );
  }

  const { error } = await supabase
    .from("vehicles")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(
      `/garage?error=${encodeURIComponent("We couldn't delete that vehicle. Please try again.")}`,
    );
  }

  redirect("/garage");
}
