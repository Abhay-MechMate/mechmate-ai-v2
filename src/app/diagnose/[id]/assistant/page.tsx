import {
  finishAssistantAction,
  reopenAssistantAction,
} from "@/app/diagnose/assistant-actions";
import {
  countRecentAssistantTurns,
  listTurns,
} from "@/app/diagnose/assistant-data";
import { getSession } from "@/app/diagnose/data";
import {
  assistantUnavailableReason,
  diagnosisTrail,
  DRIVABILITY_DISPLAY,
  vehicleDetail,
  vehicleLabel,
} from "@/app/diagnose/display";
import { FirstChecks, type EntryState } from "@/app/diagnose/[id]/first-checks";
import { AnswerForm } from "@/app/diagnose/[id]/assistant/answer-form";
import {
  CheckReportsBubble,
  FailedUpdateCard,
  QuestionsBubble,
  UpdateCard,
} from "@/app/diagnose/[id]/assistant/turn-views";
import { Badge } from "@/components/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { signInPath } from "@/lib/auth/routing";
import {
  ASSISTANT_MAX_ROUNDS,
  MAX_TURNS_PER_SESSION,
  assistantDailyLimit,
} from "@/lib/diagnosis/assistant-types";
import { deriveConversation } from "@/lib/diagnosis/conversation";
import { isAiConfigured } from "@/lib/diagnosis/openrouter";
import { getAuthContext } from "@/lib/supabase/auth-context";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const maxDuration = 60;

type AssistantPageProps = {
  params: Promise<{ id: string }>;
};

function resetAt(oldestAt: string | null): string | undefined {
  return oldestAt
    ? new Date(new Date(oldestAt).getTime() + 86_400_000).toISOString()
    : undefined;
}

export default async function GuidedAssistantPage({ params }: AssistantPageProps) {
  const { id } = await params;
  const { supabase, user } = await getAuthContext();
  if (!user) redirect(signInPath(`/diagnose/${id}/assistant`));
  const session = await getSession(supabase, id);
  if (!session) notFound();

  const turns = await listTurns(supabase, id);
  if (turns === null) {
    return (
          <div className="mx-auto max-w-2xl">
            <Breadcrumbs
              items={diagnosisTrail(
                id,
                session.vehicleSnapshot,
                session.createdAt,
                "assistant",
              )}
            />
            <p
              role="alert"
              className="rounded-lg border border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger-fg"
            >
              We couldn&apos;t load this conversation.
            </p>
          </div>
    );
  }

  const conversation = deriveConversation(turns, session);
  if (conversation.next.kind === "start") {
    redirect(`/diagnose/${id}#first-checks`);
  }

  const recent = await countRecentAssistantTurns(supabase, user.id);
  const dailyResetAt = resetAt(recent.oldestAt);
  const atDailyLimit = recent.count >= assistantDailyLimit();
  const configured = isAiConfigured();
  const atSessionLimit = turns.length >= MAX_TURNS_PER_SESSION;
  const canUseAi = configured && !atDailyLimit && !atSessionLimit;
  const compactEntry: EntryState = canUseAi
    ? { kind: "ask_more" }
    : {
        kind: "unavailable",
        reason: assistantUnavailableReason(
          atSessionLimit
            ? "session_limit"
            : configured
              ? "daily_limit"
              : "not_configured",
          dailyResetAt,
        ),
      };
  const result = session.result;
  const drivability = DRIVABILITY_DISPLAY[result.drivability.level];
  const topCause = result.likelyCauses[0];
  const activeRound =
    conversation.next.kind === "answer" || conversation.next.kind === "retry"
      ? conversation.next.round
      : Math.max(1, Math.min(ASSISTANT_MAX_ROUNDS, result.round));
  const latestRound = conversation.rounds.at(-1)?.round ?? activeRound;
  const editedRound = Math.min(
    ...turns.filter((turn) => turn.superseded).map((turn) => turn.round),
  );

  return (
        <div className="mx-auto max-w-2xl">
          <Breadcrumbs
            items={diagnosisTrail(
              id,
              session.vehicleSnapshot,
              session.createdAt,
              "assistant",
            )}
          />

          <header>
            <h1 className="text-3xl font-bold tracking-tight">
              {vehicleLabel(session.vehicleSnapshot)}
            </h1>
            <p className="mt-2 text-fg-secondary">
              {vehicleDetail(session.vehicleSnapshot)}
            </p>
            <p className="mt-2 text-sm text-fg-secondary">
              Guided diagnosis · Round {activeRound} of {ASSISTANT_MAX_ROUNDS}
            </p>
          </header>

          <div className="sticky top-14 z-10 -mx-2 mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-canvas px-2 py-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge tone={drivability.tone}>{drivability.label}</Badge>
              {topCause ? (
                <span className="truncate text-xs text-fg-secondary">
                  #1 {topCause.title} · {topCause.confidence.charAt(0).toUpperCase() + topCause.confidence.slice(1)}
                </span>
              ) : null}
            </div>
            <Link
              href={`/diagnose/${id}`}
              className="text-xs font-medium text-accent hover:text-accent-hover"
            >
              Report →
            </Link>
          </div>

          <div className="mt-8 space-y-8">
            {conversation.rounds.map((item, index) => {
              const rediagnosis = item.rediagnosis;
              const isLatest = index === conversation.rounds.length - 1;
              const successful = rediagnosis?.result;

              return (
                <section
                  id={`round-${item.round}`}
                  key={item.questions.id}
                  className="scroll-mt-28 space-y-5"
                >
                  <CheckReportsBubble reports={item.questions.payload.checkReports} />

                  <QuestionsBubble
                    intro={item.questions.payload.intro}
                    questions={item.questions.payload.questions}
                    answers={rediagnosis?.payload.answers}
                    note={rediagnosis?.payload.note}
                    startingFromRules={item.round === 1 && session.resultSource === "rules"}
                  >
                    {!rediagnosis && item.questions.payload.canNarrowFurther ? (
                      <AnswerForm
                        sessionId={id}
                        revision={session.revision}
                        round={item.round}
                        questions={item.questions.payload.questions}
                        mode="answer"
                      />
                    ) : rediagnosis?.result ? (
                      <AnswerForm
                        sessionId={id}
                        revision={session.revision}
                        round={item.round}
                        questions={item.questions.payload.questions}
                        mode="edit"
                        initialAnswers={rediagnosis.payload.answers}
                        initialNote={rediagnosis.payload.note}
                        latestRound={latestRound}
                      />
                    ) : null}
                  </QuestionsBubble>

                  {!item.questions.payload.canNarrowFurther ? (
                    <div className="rounded-xl border border-line bg-surface p-5">
                      <p className="text-sm leading-relaxed text-fg-secondary">
                        {item.questions.payload.stopReason}
                      </p>
                      <p className="mt-2 text-sm text-fg-secondary">
                        That&apos;s as far as questions can take it. The next step
                        is the test above.
                      </p>
                      <Link
                        href={`/diagnose/${id}`}
                        className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-on-accent hover:bg-accent-hover"
                      >
                        Back to the report
                      </Link>
                    </div>
                  ) : rediagnosis && !successful ? (
                    <FailedUpdateCard
                      round={item.round}
                      reason={rediagnosis.fallbackReason ?? "http_error"}
                      resetAt={dailyResetAt}
                    >
                      <AnswerForm
                        sessionId={id}
                        revision={session.revision}
                        round={item.round}
                        questions={item.questions.payload.questions}
                        mode="retry"
                      />
                    </FailedUpdateCard>
                  ) : successful ? (
                    <UpdateCard
                      round={item.round}
                      model={rediagnosis.model}
                      payload={rediagnosis.payload}
                      result={successful}
                    >
                      {isLatest && conversation.next.kind === "ask_more" ? (
                        <div className="space-y-4">
                          <details className="rounded-lg border border-line bg-canvas p-4">
                            <summary className="cursor-pointer text-sm font-medium text-accent">
                              Ask me more
                            </summary>
                            <FirstChecks
                              sessionId={id}
                              revision={session.revision}
                              steps={result.inspectionSteps}
                              entry={compactEntry}
                              compact
                            />
                          </details>
                          <form action={finishAssistantAction}>
                            <input type="hidden" name="sessionId" value={id} />
                            <button
                              type="submit"
                              className="text-sm font-medium text-accent transition-colors hover:text-accent-hover"
                            >
                              I&apos;m done — see the updated report
                            </button>
                          </form>
                        </div>
                      ) : null}
                    </UpdateCard>
                  ) : null}
                </section>
              );
            })}

            {conversation.next.kind === "stopped" &&
            conversation.next.why === "max_rounds" ? (
              <section className="rounded-xl border border-line bg-surface p-5">
                <p className="font-medium text-fg">
                  That&apos;s the end of guided Q&amp;A for this diagnosis.
                </p>
                {result.inspectionSteps[0] ? (
                  <p className="mt-2 text-sm leading-relaxed text-fg-secondary">
                    Next: {result.inspectionSteps[0].instruction}
                  </p>
                ) : null}
                <Link
                  href={`/diagnose/${id}`}
                  className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-on-accent hover:bg-accent-hover"
                >
                  Back to the report
                </Link>
              </section>
            ) : null}

            {conversation.next.kind === "stopped" &&
            conversation.next.why === "finished" ? (
              <section className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface p-5">
                <Link
                  href={`/diagnose/${id}`}
                  className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-on-accent hover:bg-accent-hover"
                >
                  Back to the report
                </Link>
                {result.round < ASSISTANT_MAX_ROUNDS ? (
                  <form action={reopenAssistantAction}>
                    <input type="hidden" name="sessionId" value={id} />
                    <button
                      type="submit"
                      className="text-sm font-medium text-accent hover:text-accent-hover"
                    >
                      Ask me more
                    </button>
                  </form>
                ) : null}
              </section>
            ) : null}
          </div>

          {conversation.supersededCount > 0 ? (
            <p className="mt-8 border-t border-line pt-5 text-xs text-fg-muted">
              {conversation.supersededCount} earlier {conversation.supersededCount === 1 ? "answer was" : "answers were"} replaced when you edited round{" "}
              {Number.isFinite(editedRound) ? editedRound : 1}.
            </p>
          ) : null}
        </div>
  );
}
