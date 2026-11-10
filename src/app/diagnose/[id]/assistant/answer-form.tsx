"use client";

import {
  submitAnswersAction,
  type AssistantActionState,
} from "@/app/diagnose/assistant-actions";
import type {
  AssistantAnswer,
  AssistantQuestion,
} from "@/lib/diagnosis/assistant-types";
import { useActionState, useState } from "react";

const inputClassName =
  "mt-2 w-full rounded-lg border border-line-strong bg-canvas px-3 py-2.5 text-fg transition placeholder:text-fg-muted focus-visible:border-accent disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-fg-muted";

export function AnswerForm({
  sessionId,
  revision,
  round,
  questions,
  mode,
  initialAnswers = [],
  initialNote = null,
  latestRound = round,
}: {
  sessionId: string;
  revision: number;
  round: number;
  questions: AssistantQuestion[];
  mode: "answer" | "edit" | "retry";
  initialAnswers?: AssistantAnswer[];
  initialNote?: string | null;
  latestRound?: number;
}) {
  const defaults = Object.fromEntries(
    initialAnswers.map((answer) => [
      `answer-${answer.questionId}`,
      answer.choice ?? answer.text ?? "",
    ]),
  );
  const initialState: AssistantActionState = {
    error: null,
    values: { ...defaults, note: initialNote ?? "" },
  };
  const [state, formAction, pending] = useActionState(
    submitAnswersAction,
    initialState,
  );
  const [editing, setEditing] = useState(mode !== "edit");

  if (mode === "edit" && !editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-3 text-xs font-medium text-fg-secondary underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent-hover"
      >
        Change my answers
      </button>
    );
  }

  const values = state.values ?? initialState.values ?? {};
  const fieldKey = [
    ...questions.map((question) => values[`answer-${question.id}`] ?? ""),
    values.note ?? "",
    state.error ?? "",
  ].join(":");
  const replacedRounds = Array.from(
    { length: Math.max(0, latestRound - round) },
    (_, index) => round + index + 1,
  );
  const warning = replacedRounds.length === 1
    ? `This replaces round ${replacedRounds[0]}.`
    : replacedRounds.length > 1
      ? `This replaces rounds ${replacedRounds[0]}–${replacedRounds.at(-1)}.`
      : null;

  return (
    <form action={formAction} className={mode === "retry" ? "" : "mt-5"}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="expectedRevision" value={revision} />
      <input type="hidden" name="round" value={round} />
      <input type="hidden" name="mode" value={mode} />

      {mode !== "retry" ? (
        <fieldset disabled={pending} className="space-y-6">
          {mode === "edit" && warning ? (
            <p className="rounded-lg border border-caution-line bg-caution-bg px-3 py-2 text-xs text-caution-fg">
              {warning}
            </p>
          ) : null}

          {questions.map((question, index) => (
            <div key={question.id}>
              <p className="text-sm font-medium leading-relaxed text-fg">
                {index + 1}. {question.prompt}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                {question.why}
              </p>
              {question.kind === "single_choice" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {question.options.map((option) => (
                    <label key={option} className="cursor-pointer">
                      <input
                        key={`${fieldKey}:${question.id}:${option}`}
                        type="radio"
                        name={`answer-${question.id}`}
                        value={option}
                        defaultChecked={values[`answer-${question.id}`] === option}
                        className="peer sr-only"
                      />
                      <span className="inline-flex rounded-full border border-line-strong bg-canvas px-3 py-1.5 text-xs text-fg-secondary transition hover:border-fg-muted peer-checked:border-accent peer-checked:bg-surface-raised peer-checked:text-fg peer-checked:before:mr-1 peer-checked:before:content-['✓'] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent peer-focus-visible:outline-offset-2 peer-disabled:cursor-not-allowed peer-disabled:border-line peer-disabled:text-fg-muted">
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  key={`${fieldKey}:${question.id}`}
                  type="text"
                  name={`answer-${question.id}`}
                  maxLength={200}
                  defaultValue={values[`answer-${question.id}`] ?? ""}
                  className={inputClassName}
                />
              )}
            </div>
          ))}

          <label className="block text-sm font-medium text-fg-secondary">
            Anything else I should know, or a question for me?{" "}
            <span className="font-normal text-fg-muted">(optional)</span>
            <textarea
              key={`${fieldKey}:note`}
              name="note"
              rows={3}
              maxLength={500}
              defaultValue={values.note ?? ""}
              className={`${inputClassName} resize-y`}
            />
          </label>
        </fieldset>
      ) : null}

      {state.error ? (
        <p
          role="alert"
          className={`${mode === "retry" ? "mb-3" : "mt-4"} rounded-lg border border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger-fg`}
        >
          {state.error}
        </p>
      ) : null}

      <div className={`${mode === "retry" ? "" : "mt-5"} flex flex-wrap gap-3`}>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-wait disabled:border-line disabled:bg-surface disabled:text-fg-muted"
        >
          {pending
            ? "Reworking the diagnosis… up to 30 seconds"
            : mode === "retry"
              ? "Try again"
              : "Update my diagnosis"}
        </button>
        {mode === "edit" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setEditing(false)}
            className="rounded-lg border border-line-strong px-4 py-2.5 text-sm text-fg-secondary transition-colors hover:border-fg-muted hover:text-fg disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-fg-muted"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
