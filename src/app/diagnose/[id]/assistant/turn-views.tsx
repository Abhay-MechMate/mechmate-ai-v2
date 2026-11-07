import {
  ASSISTANT_STATE_LABEL,
  DRIVABILITY_DISPLAY,
  fallbackReasonLabel,
  formatResetTime,
} from "@/app/diagnose/display";
import type {
  AssistantAnswer,
  AssistantQuestion,
  CheckReport,
  RediagnosisTurnPayload,
  ResultDiff,
} from "@/lib/diagnosis/assistant-types";
import type {
  DiagnosisResult,
  FallbackReason,
} from "@/lib/diagnosis/types";
import type { ReactNode } from "react";

const upClass =
  "border-emerald-800 bg-emerald-950/50 text-emerald-300";
const downClass = "border-zinc-700 bg-zinc-800 text-zinc-300";
const confidenceRank = { high: 0, medium: 1, low: 2 } as const;

function confidenceLabel(value: "high" | "medium" | "low" | null): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "new";
}

export function DiffChips({ diff }: { diff: ResultDiff }) {
  return (
    <div className="flex flex-wrap gap-2">
      {diff.causes.map((move) => {
        const rankImproved =
          move.toRank !== null &&
          (move.fromRank === null || move.toRank < move.fromRank);
        const confidenceImproved =
          move.toConfidence !== null &&
          (move.fromConfidence === null ||
            confidenceRank[move.toConfidence] < confidenceRank[move.fromConfidence]);
        const rankWorsened =
          move.fromRank !== null &&
          (move.toRank === null || move.toRank > move.fromRank);
        const confidenceWorsened =
          move.fromConfidence !== null &&
          (move.toConfidence === null ||
            confidenceRank[move.toConfidence] > confidenceRank[move.fromConfidence]);
        const className = rankWorsened || confidenceWorsened
          ? downClass
          : rankImproved || confidenceImproved
            ? upClass
            : downClass;

        return (
          <span
            key={`cause:${move.title}`}
            className={`rounded-full border px-2.5 py-1 text-xs ${className}`}
          >
            {move.fromRank === null
              ? `New #${move.toRank}`
              : move.toRank === null
                ? `#${move.fromRank} → out`
                : move.fromRank !== move.toRank
                  ? `#${move.fromRank} → #${move.toRank}`
                  : null}{" "}
            {move.title}
            {move.fromConfidence !== move.toConfidence ? (
              <>{" "}{confidenceLabel(move.fromConfidence)} → {confidenceLabel(move.toConfidence)}</>
            ) : null}
          </span>
        );
      })}
      {diff.newlyRuledOut.map((title) => (
        <span
          key={`ruled-out:${title}`}
          className={`rounded-full border px-2.5 py-1 text-xs ${downClass}`}
        >
          Ruled out: <span className="line-through">{title}</span>
        </span>
      ))}
      {diff.verdict ? (
        <span
          className={`rounded-full border px-2.5 py-1 text-xs ${DRIVABILITY_DISPLAY[diff.verdict.to].className}`}
        >
          Verdict {DRIVABILITY_DISPLAY[diff.verdict.from].label} →{" "}
          {DRIVABILITY_DISPLAY[diff.verdict.to].label}
        </span>
      ) : null}
      {diff.firstStepChanged ? (
        <span className={`rounded-full border px-2.5 py-1 text-xs ${downClass}`}>
          First check updated
        </span>
      ) : null}
    </div>
  );
}

export function CheckReportsBubble({ reports }: { reports: CheckReport[] }) {
  if (reports.length === 0) return null;
  return (
    <div className="border-l-2 border-zinc-700 pl-4 text-sm text-zinc-300">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        You · first checks
      </p>
      <ul className="mt-2 space-y-2">
        {reports.map((report, index) => (
          <li key={`${report.step}:${index}`}>
            <span className="text-emerald-400">✓</span> {report.step}
            {report.finding ? (
              <span className="text-zinc-400"> — “{report.finding}”</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function QuestionsBubble({
  intro,
  questions,
  answers,
  note,
  startingFromRules = false,
  children,
}: {
  intro: string;
  questions: AssistantQuestion[];
  answers?: AssistantAnswer[];
  note?: string | null;
  startingFromRules?: boolean;
  children?: ReactNode;
}) {
  const answerById = new Map(
    (answers ?? []).map((answer) => [
      answer.questionId,
      answer.choice ?? answer.text,
    ]),
  );

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        <span className="size-2 rounded-full bg-emerald-500" />
        MechMate
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        {startingFromRules ? (
          <p className="mb-3 text-xs leading-relaxed text-zinc-500">
            Starting from MechMate&apos;s built-in guide. AI wasn&apos;t available
            for the first pass.
          </p>
        ) : null}
        <p className="text-sm leading-relaxed text-zinc-300">{intro}</p>

        {answers ? (
          <ol className="mt-5 space-y-5">
            {questions.map((question, index) => (
              <li key={question.id}>
                <p className="text-sm font-medium leading-relaxed text-zinc-100">
                  {index + 1}. {question.prompt}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  {question.why}
                </p>
                <p className="mt-2 text-sm text-emerald-300">
                  You: {answerById.get(question.id) || "No answer"}
                </p>
              </li>
            ))}
          </ol>
        ) : null}
        {answers && note ? (
          <blockquote className="mt-5 border-l-2 border-emerald-800 pl-3 text-sm text-zinc-300">
            You added: “{note}”
          </blockquote>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export function UpdateCard({
  round,
  model,
  payload,
  result,
  children,
}: {
  round: number;
  model: string | null;
  payload: RediagnosisTurnPayload;
  result: DiagnosisResult;
  children?: ReactNode;
}) {
  return (
    <section
      id={`update-${round}`}
      className="scroll-mt-24 rounded-xl border border-emerald-900/60 bg-zinc-900 p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-wider text-zinc-500">
        <span>Updated diagnosis</span>
        <span>{model ? `AI · ${model}` : "AI"}</span>
      </div>
      {payload.assistantState ? (
        <p className="mt-3 text-xs font-medium text-emerald-300">
          {ASSISTANT_STATE_LABEL[payload.assistantState]}
        </p>
      ) : null}
      {payload.changes ? (
        <>
          <p className="mt-3 leading-relaxed text-zinc-200">
            {payload.changes.headline}
          </p>
          {payload.diff ? (
            <div className="mt-4">
              <DiffChips diff={payload.diff} />
            </div>
          ) : null}
          {payload.changes.reasons.length > 0 ? (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-400">
              {payload.changes.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
      {payload.noteReply ? (
        <blockquote className="mt-4 border-l-2 border-emerald-700 pl-3 text-sm leading-relaxed text-zinc-300">
          {payload.note ? <>You asked: “{payload.note}” — </> : null}
          {payload.noteReply}
        </blockquote>
      ) : null}
      {payload.floor?.rulesRaised ? (
        <p className="mt-4 rounded-lg border border-amber-900/70 bg-amber-950/40 px-3 py-2 text-xs leading-relaxed text-amber-200">
          MechMate&apos;s safety rules raised the verdict to{" "}
          {DRIVABILITY_DISPLAY[result.drivability.level].label} because of what
          you described ({result.drivability.headline}).
        </p>
      ) : null}
      {payload.floor?.previousKept ? (
        <p className="mt-4 text-xs leading-relaxed text-zinc-500">
          The assistant thought this might be less urgent, but answers in a
          conversation can&apos;t lower the verdict. It stays at{" "}
          {DRIVABILITY_DISPLAY[result.drivability.level].label} until a test or
          a shop confirms otherwise.
        </p>
      ) : null}
      {payload.floor?.stepsReplaced ? (
        <p className="mt-3 text-xs leading-relaxed text-amber-300">
          Checks limited to safe observation because this now involves a
          safety-critical system.
        </p>
      ) : null}
      {result.inspectionSteps[0] ? (
        <p className="mt-5 border-t border-zinc-800 pt-4 text-sm leading-relaxed text-zinc-300">
          <span className="font-semibold text-zinc-100">Next:</span>{" "}
          {result.inspectionSteps[0].instruction}
        </p>
      ) : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}

export function FailedUpdateCard({
  round,
  reason,
  resetAt,
  children,
}: {
  round: number;
  reason: FallbackReason;
  resetAt?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={`update-${round}`}
      className="scroll-mt-24 rounded-xl border border-amber-900/70 bg-amber-950/30 p-5"
    >
      <p className="text-sm leading-relaxed text-amber-200">
        I couldn&apos;t update your diagnosis ({fallbackReasonLabel(reason)}). Your
        answers are saved and the report is unchanged.
      </p>
      {reason === "daily_limit" && resetAt ? (
        <p className="mt-2 text-xs text-amber-300">
          Try again after {formatResetTime(resetAt)}.
        </p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}
