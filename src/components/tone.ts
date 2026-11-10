export type Tone = "neutral" | "ok" | "caution" | "warn" | "danger";

export const TONE_CLASSES: Record<Tone, string> = {
  neutral: "border-line bg-surface-raised text-fg-secondary",
  ok: "border-ok-line bg-ok-bg text-ok-fg",
  caution: "border-caution-line bg-caution-bg text-caution-fg",
  warn: "border-warn-line bg-warn-bg text-warn-fg",
  danger: "border-danger-line bg-danger-bg text-danger-fg",
};
