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
  "mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60";

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
        className="mt-3 text-xs font-medium text-zinc-400 underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-emerald-300"
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
        <fieldset disabled={pending} className="space-y-6 disabled:opacity-70">
          {mode === "edit" && warning ? (
            <p className="rounded-lg border border-amber-900/70 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
              {warning}
            </p>
          ) : null}

          {questions.map((question, index) => (
            <div key={question.id}>
              <p className="text-sm font-medium leading-relaxed text-zinc-100">
                {index + 1}. {question.prompt}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
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
                      <span className="inline-flex rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-600 peer-checked:border-emerald-500 peer-checked:text-emerald-300 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/40 peer-disabled:cursor-not-allowed">
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

          <label className="block text-sm font-medium text-zinc-200">
            Anything else I should know, or a question for me?{" "}
            <span className="font-normal text-zinc-500">(optional)</span>
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
          className={`${mode === "retry" ? "mb-3" : "mt-4"} rounded-lg border border-red-900/70 bg-red-950/50 px-3 py-2 text-sm text-red-300`}
        >
          {state.error}
        </p>
      ) : null}

      <div className={`${mode === "retry" ? "" : "mt-5"} flex flex-wrap gap-3`}>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-emerald-950 transition-colors hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-wait disabled:opacity-70"
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
            className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white disabled:opacity-60"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
