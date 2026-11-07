"use client";

import {
  startRoundAction,
  type AssistantActionState,
} from "@/app/diagnose/assistant-actions";
import { DIFFICULTY_LABEL } from "@/app/diagnose/display";
import type { InspectionStep } from "@/lib/diagnosis/types";
import Link from "next/link";
import { useActionState, useState } from "react";

export type EntryState =
  | { kind: "start" | "ask_more" }
  | { kind: "resume" | "view"; href: string }
  | { kind: "unavailable"; reason: string };

const inputClassName =
  "mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60";

export function FirstChecks({
  sessionId,
  revision,
  steps,
  entry,
  compact = false,
}: {
  sessionId: string;
  revision: number;
  steps: InspectionStep[];
  entry: EntryState;
  compact?: boolean;
}) {
  const [done, setDone] = useState(() => steps.map(() => false));
  const initialState: AssistantActionState = { error: null };
  const [state, formAction, pending] = useActionState(
    startRoundAction,
    initialState,
  );
  const canReportChecks = entry.kind === "start" || entry.kind === "ask_more";

  return (
    <form action={formAction} className={compact ? "mt-4" : undefined}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="expectedRevision" value={revision} />

      {compact ? (
        <h3 className="text-base font-semibold text-white">
          Done any of these since?
        </h3>
      ) : null}

      <ol className={`${compact ? "mt-4" : "mt-5"} space-y-4`}>
        {steps.map((step, index) => (
          <li
            key={`${step.instruction}:${index}`}
            className="border-t border-zinc-800 pt-4 first:border-0 first:pt-0"
          >
            <div className="flex gap-3">
              <span className="text-sm font-semibold text-emerald-400">
                {index + 1}.
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed text-zinc-300">
                  {step.instruction}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
                    {DIFFICULTY_LABEL[step.difficulty]}
                  </span>
                  {canReportChecks ? (
                    <label
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition ${
                        done[index]
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                          : "border-zinc-700 text-zinc-400"
                      } ${pending ? "cursor-wait opacity-60" : ""}`}
                    >
                      <input
                        type="checkbox"
                        name={`check-${index}-done`}
                        checked={done[index]}
                        disabled={pending}
                        onChange={(event) => {
                          setDone((current) =>
                            current.map((value, itemIndex) =>
                              itemIndex === index ? event.target.checked : value,
                            ),
                          );
                        }}
                        className="size-3.5 accent-emerald-500"
                      />
                      Done
                    </label>
                  ) : null}
                </div>
                {canReportChecks && done[index] ? (
                  <label className="mt-3 block text-xs font-medium text-zinc-400">
                    What did you find? <span className="font-normal">(optional)</span>
                    <input
                      type="text"
                      name={`check-${index}-finding`}
                      maxLength={200}
                      disabled={pending}
                      className={inputClassName}
                    />
                  </label>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-5 border-t border-zinc-800 pt-5">
        {entry.kind === "start" || entry.kind === "ask_more" ? (
          <>
            {!compact ? (
              <p className="mb-4 text-sm leading-relaxed text-zinc-400">
                Done some of these? Tell me what you found and I&apos;ll ask the
                2–4 questions that split the remaining causes.
              </p>
            ) : null}
            {state.error ? (
              <p
                role="alert"
                className="mb-4 rounded-lg border border-red-900/70 bg-red-950/50 px-3 py-2 text-sm text-red-300"
              >
                {state.error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-medium text-emerald-950 transition-colors hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
            >
              {pending
                ? "Reading your checks… up to 30 seconds"
                : entry.kind === "ask_more" || compact
                  ? "Ask the next questions"
                  : "Continue with the assistant →"}
            </button>
          </>
        ) : entry.kind === "resume" ? (
          <Link
            href={entry.href}
            className="inline-flex w-full justify-center rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-emerald-950 transition-colors hover:bg-emerald-400 sm:w-auto"
          >
            Resume the conversation → (questions waiting)
          </Link>
        ) : entry.kind === "view" ? (
          <Link
            href={entry.href}
            className="inline-flex rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-700"
          >
            View the conversation
          </Link>
        ) : (
          <>
            <button
              type="button"
              disabled
              className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-medium text-emerald-950 opacity-50 sm:w-auto"
            >
              Continue with the assistant →
            </button>
            <p className="mt-2 text-xs text-zinc-500">
              {"reason" in entry ? entry.reason : "The assistant is unavailable."}
            </p>
          </>
        )}
      </div>
    </form>
  );
}
