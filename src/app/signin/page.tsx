"use client";

import { signInAction } from "@/app/auth/actions";
import { safeNextPath } from "@/lib/auth/routing";
import Link from "next/link";
import { Suspense, use } from "react";

type SignInPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    next?: string | string[];
  }>;
};

export default function SignInPage({ searchParams }: SignInPageProps) {
  return (
    <Suspense fallback={<SignInPageFallback />}>
      <SignInForm searchParams={searchParams} />
    </Suspense>
  );
}

function SignInForm({ searchParams }: SignInPageProps) {
  const query = use(searchParams);
  const errorParam = query.error;
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam;
  const nextParam = Array.isArray(query.next) ? query.next[0] : query.next;
  const next = nextParam ? safeNextPath(nextParam) : "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12 text-fg">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mx-auto block w-fit text-2xl font-bold tracking-tight"
        >
          <span className="text-fg">Mech</span>
          <span className="text-accent">Mate</span>
        </Link>

        <section className="mt-8 rounded-xl border border-line bg-surface p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-fg-secondary">
            Sign in to continue to MechMate.
          </p>

          {error ? (
            <p
              role="alert"
              className="mt-5 rounded-lg border border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger-fg"
            >
              {error}
            </p>
          ) : null}

          <form action={signInAction} className="mt-6 space-y-5">
            <input type="hidden" name="next" value={next} />
            <label className="block text-sm font-medium text-fg-secondary">
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                className="mt-2 w-full rounded-lg border border-line-strong bg-canvas px-3 py-2.5 text-fg transition placeholder:text-fg-muted focus-visible:border-accent"
                placeholder="you@example.com"
              />
            </label>

            <label className="block text-sm font-medium text-fg-secondary">
              Password
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                className="mt-2 w-full rounded-lg border border-line-strong bg-canvas px-3 py-2.5 text-fg transition placeholder:text-fg-muted focus-visible:border-accent"
                placeholder="Your password"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-on-accent transition-colors hover:bg-accent-hover"
            >
              Sign in
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-fg-secondary">
            New to MechMate?{" "}
            <Link
              href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
              className="font-medium text-accent hover:text-accent-hover"
            >
              Create an account
            </Link>
          </p>
        </section>

        <Link
          href="/"
          className="mx-auto mt-5 block w-fit text-sm text-fg-muted transition-colors hover:text-fg-secondary"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}

function SignInPageFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12 text-fg">
      <span className="text-2xl font-bold tracking-tight text-fg">
        Mech<span className="text-accent">Mate</span>
      </span>
    </main>
  );
}
