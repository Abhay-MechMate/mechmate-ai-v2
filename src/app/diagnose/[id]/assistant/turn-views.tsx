import {
  ASSISTANT_STATE_LABEL,
  DRIVABILITY_DISPLAY,
  fallbackReasonLabel,
  formatResetTime,
} from "@/app/diagnose/display";
import { TONE_CLASSES } from "@/components/tone";
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

const upClass = TONE_CLASSES.ok;
const downClass = TONE_CLASSES.neutral;
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
          className={`rounded-full border px-2.5 py-1 text-xs ${TONE_CLASSES[DRIVABILITY_DISPLAY[diff.verdict.to].tone]}`}
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
    <div className="border-l-2 border-line pl-4 text-sm text-fg-secondary">
      <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
        You · first checks
      </p>
      <ul className="mt-2 space-y-2">
        {reports.map((report, index) => (
          <li key={`${report.step}:${index}`}>
            <span className="text-accent">✓</span> {report.step}
            {report.finding ? (
              <span className="text-fg-secondary"> — “{report.finding}”</span>
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
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-secondary">
        <span className="size-2 rounded-full bg-fg-muted" />
        MechMate
      </div>
      <div className="rounded-xl border border-line bg-surface p-5">
        {startingFromRules ? (
          <p className="mb-3 text-xs leading-relaxed text-fg-muted">
            Starting from MechMate&apos;s built-in guide. AI wasn&apos;t available
            for the first pass.
          </p>
        ) : null}
        <p className="text-sm leading-relaxed text-fg-secondary">{intro}</p>

        {answers ? (
          <ol className="mt-5 space-y-5">
            {questions.map((question, index) => (
              <li key={question.id}>
                <p className="text-sm font-medium leading-relaxed text-fg">
                  {index + 1}. {question.prompt}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                  {question.why}
                </p>
                <p className="mt-2 rounded-lg bg-surface-raised px-3 py-2 text-sm text-fg">
                  You: {answerById.get(question.id) || "No answer"}
                </p>
              </li>
            ))}
          </ol>
        ) : null}
        {answers && note ? (
          <blockquote className="mt-5 border-l-2 border-line bg-surface-raised px-3 py-2 text-sm text-fg-secondary">
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
      className="scroll-mt-28 rounded-xl border border-line bg-surface p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-wider text-fg-muted">
        <span>Updated diagnosis</span>
        <span>{model ? `AI · ${model}` : "AI"}</span>
      </div>
      {payload.assistantState ? (
        <p className="mt-3 text-xs font-medium text-fg-secondary">
          {ASSISTANT_STATE_LABEL[payload.assistantState]}
        </p>
      ) : null}
      {payload.changes ? (
        <>
          <p className="mt-3 leading-relaxed text-fg">
            {payload.changes.headline}
          </p>
          {payload.diff ? (
            <div className="mt-4">
              <DiffChips diff={payload.diff} />
            </div>
          ) : null}
          {payload.changes.reasons.length > 0 ? (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fg-secondary">
              {payload.changes.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
      {payload.noteReply ? (
        <blockquote className="mt-4 border-l-2 border-line bg-surface-raised px-3 py-2 text-sm leading-relaxed text-fg-secondary">
          {payload.note ? <>You asked: “{payload.note}” — </> : null}
          {payload.noteReply}
        </blockquote>
      ) : null}
      {payload.floor?.rulesRaised ? (
        <p className="mt-4 rounded-lg border border-caution-line bg-caution-bg px-3 py-2 text-xs leading-relaxed text-caution-fg">
          MechMate&apos;s safety rules raised the verdict to{" "}
          {DRIVABILITY_DISPLAY[result.drivability.level].label} because of what
          you described ({result.drivability.headline}).
        </p>
      ) : null}
      {payload.floor?.previousKept ? (
        <p className="mt-4 text-xs leading-relaxed text-fg-muted">
          The assistant thought this might be less urgent, but answers in a
          conversation can&apos;t lower the verdict. It stays at{" "}
          {DRIVABILITY_DISPLAY[result.drivability.level].label} until a test or
          a shop confirms otherwise.
        </p>
      ) : null}
      {payload.floor?.stepsReplaced ? (
        <p className="mt-3 text-xs leading-relaxed text-caution-fg">
          Checks limited to safe observation because this now involves a
          safety-critical system.
        </p>
      ) : null}
      {result.inspectionSteps[0] ? (
        <p className="mt-5 border-t border-line pt-4 text-sm leading-relaxed text-fg-secondary">
          <span className="font-semibold text-fg">Next:</span>{" "}
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
      className="scroll-mt-28 rounded-xl border border-danger-line bg-danger-bg p-5"
    >
      <p className="text-sm leading-relaxed text-danger-fg">
        I couldn&apos;t update your diagnosis ({fallbackReasonLabel(reason)}). Your
        answers are saved and the report is unchanged.
      </p>
      {reason === "daily_limit" && resetAt ? (
        <p className="mt-2 text-xs text-danger-fg">
          Try again after {formatResetTime(resetAt)}.
        </p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}
