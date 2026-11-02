import type {
  Confidence,
  DrivabilityLevel,
  FallbackReason,
  StepDifficulty,
  VehicleSnapshot,
} from "@/lib/diagnosis/types";

export function vehicleLabel(snapshot: VehicleSnapshot): string {
  return (
    snapshot.nickname ||
    [snapshot.modelYear, snapshot.make, snapshot.model]
      .filter(Boolean)
      .join(" ")
  );
}

export function vehicleDetail(snapshot: VehicleSnapshot): string {
  return [
    [snapshot.modelYear, snapshot.make, snapshot.model]
      .filter(Boolean)
      .join(" "),
    snapshot.trimName,
    snapshot.engine,
    snapshot.mileage !== null
      ? `${snapshot.mileage.toLocaleString()} mi`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export const DRIVABILITY_DISPLAY: Record<
  DrivabilityLevel,
  { label: string; className: string }
> = {
  ok_to_drive: {
    label: "OK to drive",
    className: "border-emerald-800 bg-emerald-950/50 text-emerald-300",
  },
  drive_with_caution: {
    label: "Drive with caution",
    className: "border-amber-800 bg-amber-950/50 text-amber-300",
  },
  drive_to_shop_only: {
    label: "Drive to a shop only",
    className: "border-orange-800 bg-orange-950/50 text-orange-300",
  },
  do_not_drive: {
    label: "Do not drive",
    className: "border-red-800 bg-red-950/50 text-red-300",
  },
};

export const CONFIDENCE_DISPLAY: Record<
  Confidence,
  { label: string; className: string }
> = {
  high: {
    label: "High confidence",
    className: "border-emerald-800 bg-emerald-950/50 text-emerald-300",
  },
  medium: {
    label: "Medium confidence",
    className: "border-amber-800 bg-amber-950/50 text-amber-300",
  },
  low: {
    label: "Low confidence",
    className: "border-zinc-700 bg-zinc-800 text-zinc-300",
  },
};

export const DIFFICULTY_LABEL: Record<StepDifficulty, string> = {
  diy_easy: "Easy DIY",
  diy_moderate: "Moderate DIY",
  shop_recommended: "Shop recommended",
};

export function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const FALLBACK_REASON_LABEL: Record<FallbackReason, string> = {
  not_configured: "AI is not configured",
  daily_limit: "daily AI limit reached",
  credits_exhausted: "AI credits exhausted",
  auth_error: "AI authentication error",
  rate_limited: "AI rate limit reached",
  http_error: "AI service error",
  timeout: "AI request timed out",
  network_error: "AI network error",
  invalid_output: "AI returned an invalid response",
};

export function fallbackReasonLabel(reason: FallbackReason | null): string {
  return reason ? FALLBACK_REASON_LABEL[reason] : "AI unavailable";
}
