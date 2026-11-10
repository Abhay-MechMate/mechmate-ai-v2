import { TONE_CLASSES, type Tone } from "@/components/tone";

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[tone]}`}>{children}</span>;
}

export function Alert({ children, tone = "danger", className = "" }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return <div role={tone === "danger" ? "alert" : "status"} className={`rounded-lg border px-3 py-2 text-sm ${TONE_CLASSES[tone]} ${className}`}>{children}</div>;
}
