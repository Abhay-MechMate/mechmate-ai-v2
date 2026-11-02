"use server";

import {
  AI_DAILY_LIMIT_PER_USER,
  countRecentAiSessions,
  createSession,
  getOwnedVehicleSnapshot,
} from "@/app/diagnose/data";
import { runDiagnosis } from "@/lib/diagnosis/engine";
import { buildDiagnosisInput } from "@/lib/diagnosis/input";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type DiagnosisFormState = {
  error: string | null;
  values: { vehicleId: string; codes: string; symptoms: string };
};

function readText(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

export async function startDiagnosisAction(
  _prev: DiagnosisFormState,
  formData: FormData,
): Promise<DiagnosisFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin");

  const vehicleId = readText(formData, "vehicleId");
  const codes = readText(formData, "codes");
  const symptoms = readText(formData, "symptoms");
  const values = { vehicleId, codes, symptoms };

  if (!vehicleId) {
    return { error: "Choose a vehicle from your garage.", values };
  }

  const parsed = buildDiagnosisInput(codes, symptoms);
  if ("error" in parsed) return { error: parsed.error, values };

  const vehicle = await getOwnedVehicleSnapshot(supabase, vehicleId);
  if (!vehicle) {
    return {
      error: "We couldn't find that vehicle in your garage.",
      values,
    };
  }

  const recentAiSessions = await countRecentAiSessions(supabase, user.id);
  const outcome = await runDiagnosis(parsed.input, vehicle.snapshot, {
    aiAllowed: recentAiSessions < AI_DAILY_LIMIT_PER_USER,
  });
  const session = await createSession(supabase, {
    userId: user.id,
    vehicleId: vehicle.id,
    snapshot: vehicle.snapshot,
    input: parsed.input,
    outcome,
  });

  if (!session) {
    return {
      error: "Your diagnosis ran but couldn't be saved. Please try again.",
      values,
    };
  }

  redirect(`/diagnose/${session.id}`);
}
