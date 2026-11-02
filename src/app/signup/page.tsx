"use client";

import { signUpAction } from "@/app/auth/actions";
import Link from "next/link";
import { Suspense, use } from "react";

type SignUpPageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

export default function SignUpPage({ searchParams }: SignUpPageProps) {
  return (
    <Suspense fallback={<SignUpPageFallback />}>
      <SignUpForm searchParams={searchParams} />
    </Suspense>
  );
}

function SignUpForm({ searchParams }: SignUpPageProps) {
  const errorParam = use(searchParams).error;
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam;

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-12 text-zinc-100">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mx-auto block w-fit text-2xl font-bold tracking-tight"
        >
          <span className="text-white">Mech</span>
          <span className="text-emerald-400">Mate</span>
        </Link>

        <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Get started with your MechMate workspace.
          </p>

          {error ? (
            <p
              role="alert"
              className="mt-5 rounded-lg border border-red-900/70 bg-red-950/50 px-3 py-2 text-sm text-red-300"
            >
              {error}
            </p>
          ) : null}

          <form action={signUpAction} className="mt-6 space-y-5">
            <label className="block text-sm font-medium text-zinc-200">
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="you@example.com"
              />
            </label>

            <label className="block text-sm font-medium text-zinc-200">
              Password
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                minLength={6}
                required
                className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="At least 6 characters"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-medium text-emerald-950 transition-colors hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
            >
              Sign up
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="font-medium text-emerald-400 hover:text-emerald-300"
            >
              Sign in
            </Link>
          </p>
        </section>

        <Link
          href="/"
          className="mx-auto mt-5 block w-fit text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}

function SignUpPageFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-12 text-zinc-100">
      <span className="text-2xl font-bold tracking-tight text-white">
        Mech<span className="text-emerald-400">Mate</span>
      </span>
    </main>
  );
}
