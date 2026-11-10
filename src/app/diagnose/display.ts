import type {
  Confidence,
  DrivabilityLevel,
  FallbackReason,
  StepDifficulty,
  VehicleSnapshot,
} from "@/lib/diagnosis/types";
import type { AssistantState } from "@/lib/diagnosis/assistant-types";
import type { Crumb } from "@/components/breadcrumbs";
import type { Tone } from "@/components/tone";
import type { DiagnosticSessionSummary } from "@/lib/diagnosis/types";

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
  { label: string; tone: Tone }
> = {
  ok_to_drive: {
    label: "OK to drive",
    tone: "ok",
  },
  drive_with_caution: {
    label: "Drive with caution",
    tone: "caution",
  },
  drive_to_shop_only: {
    label: "Drive to a shop only",
    tone: "warn",
  },
  do_not_drive: {
    label: "Do not drive",
    tone: "danger",
  },
};

export const CONFIDENCE_DISPLAY: Record<
  Confidence,
  { label: string; tone: Tone }
> = {
  high: {
    label: "High confidence",
    tone: "ok",
  },
  medium: {
    label: "Medium confidence",
    tone: "caution",
  },
  low: {
    label: "Low confidence",
    tone: "neutral",
  },
};

export const DIFFICULTY_LABEL: Record<StepDifficulty, string> = {
  diy_easy: "Easy DIY",
  diy_moderate: "Moderate DIY",
  shop_recommended: "Shop recommended",
};

export const ASSISTANT_STATE_LABEL: Record<AssistantState, string> = {
  narrowed: "Narrowed down",
  needs_shop: "Needs shop equipment",
  keep_going: "More to learn",
};

export function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatSessionDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });
}

export function formatRelative(iso: string, now = Date.now()): string {
  const elapsed = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return "yesterday";
  return formatSessionDay(iso);
}

export function diagnosisTrail(sessionId: string, snapshot: VehicleSnapshot, createdAt: string, leaf: "report" | "assistant"): Crumb[] {
  const report = `${vehicleLabel(snapshot)} — ${formatSessionDay(createdAt)}`;
  return leaf === "report"
    ? [{ label: "Diagnoses", href: "/diagnose" }, { label: report }]
    : [{ label: "Diagnoses", href: "/diagnose" }, { label: report, href: `/diagnose/${sessionId}` }, { label: "Assistant conversation" }];
}

export function sessionSourceLabel(summary: Pick<DiagnosticSessionSummary, "resultSource">): "AI analysis" | "Built-in guide" {
  return summary.resultSource === "ai" ? "AI analysis" : "Built-in guide";
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

export function formatResetTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function assistantUnavailableReason(
  reason: FallbackReason | "session_limit",
  resetAt?: string,
): string {
  if (reason === "not_configured") {
    return "The assistant needs AI, which isn't set up on this site.";
  }
  if (reason === "daily_limit") {
    return resetAt
      ? `You've used today's assistant limit. It resets around ${formatResetTime(resetAt)}.`
      : "You've used today's assistant limit. Try again later.";
  }
  if (reason === "credits_exhausted") {
    return "MechMate's AI budget for this month is used up. Your report still works; the assistant will be back next month.";
  }
  if (reason === "session_limit") {
    return "This conversation has reached its limit. Start a new diagnosis to keep going.";
  }
  return `I couldn't come up with questions right now (${fallbackReasonLabel(reason)}). Your report is unchanged. Try again in a minute.`;
}
