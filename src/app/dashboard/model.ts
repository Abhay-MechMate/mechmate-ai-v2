import { vehicleLabel } from "@/app/diagnose/display";
import type { Tone } from "@/components/tone";
import { ASSISTANT_MAX_ROUNDS, type AssistantTurn } from "@/lib/diagnosis/assistant-types";
import { deriveConversation } from "@/lib/diagnosis/conversation";
import type { AssistantStatus, VehicleSnapshot } from "@/lib/diagnosis/types";
import { normalizeResult } from "@/lib/diagnosis/upgrade";

export type OpenSessionRow = {
  id: string;
  vehicle_id: string | null;
  vehicle_snapshot: VehicleSnapshot;
  symptoms: string | null;
  dtc_codes: string[];
  initial_result: unknown;
  assistant_status: AssistantStatus;
  updated_at: string;
  top_cause: string | null;
};

export type OpenConversation = {
  sessionId: string;
  vehicleLabel: string;
  vehicleRemoved: boolean;
  inputSummary: string;
  topCause: string | null;
  next: "answer" | "retry" | "ask_more";
  round: number;
  updatedAt: string;
  href: string;
};

export const OPEN_CONVERSATION_LABEL: Record<OpenConversation["next"], { badge: string; tone: Tone }> = {
  answer: { badge: "Waiting for your answers", tone: "caution" },
  retry: { badge: "Update failed — answers saved", tone: "danger" },
  ask_more: { badge: "Ready for more questions", tone: "neutral" },
};

function inputSummary(row: OpenSessionRow): string {
  if (row.dtc_codes.length > 0) return row.dtc_codes.slice(0, 3).join(", ");
  const symptoms = row.symptoms?.trim();
  if (!symptoms) return "Diagnosis";
  return symptoms.length > 60 ? `${symptoms.slice(0, 60)}…` : symptoms;
}

export function selectOpenConversations(items: { row: OpenSessionRow; turns: AssistantTurn[] | null }[], limit: number): OpenConversation[] {
  const priority = { answer: 0, retry: 1, ask_more: 2 } as const;
  return items.flatMap(({ row, turns }) => {
    if (turns === null) return [];
    const conversation = deriveConversation(turns, {
      initialResult: normalizeResult(row.initial_result),
      assistantStatus: row.assistant_status,
    });
    const next = conversation.next;
    if (next.kind !== "answer" && next.kind !== "retry" && next.kind !== "ask_more") return [];
    const round = next.kind === "ask_more" ? Math.max(1, next.round - 1) : next.round;
    return [{
      sessionId: row.id,
      vehicleLabel: vehicleLabel(row.vehicle_snapshot),
      vehicleRemoved: row.vehicle_id === null,
      inputSummary: inputSummary(row),
      topCause: row.top_cause,
      next: next.kind,
      round,
      updatedAt: row.updated_at,
      href: next.kind === "ask_more" ? `/diagnose/${row.id}/assistant` : `/diagnose/${row.id}/assistant#round-${next.round}`,
    }];
  }).sort((a, b) => priority[a.next] - priority[b.next] || Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, limit);
}

export type OnboardingStep = { key: "car" | "diagnose" | "assistant"; done: boolean };

export function onboardingSteps(input: { vehicleCount: number; sessionCount: number; anyRefined: boolean }): OnboardingStep[] {
  return [
    { key: "car", done: input.vehicleCount > 0 },
    { key: "diagnose", done: input.sessionCount > 0 },
    { key: "assistant", done: input.anyRefined },
  ];
}

export function dashboardCars<T>(vehicles: T[], max = 6): { shown: T[]; hidden: number } {
  return { shown: vehicles.slice(0, max), hidden: Math.max(0, vehicles.length - max) };
}

export { ASSISTANT_MAX_ROUNDS };
