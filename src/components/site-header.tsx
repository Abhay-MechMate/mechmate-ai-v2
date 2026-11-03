import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export async function SiteHeader() {
  let user: { email?: string } | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user: authenticatedUser },
    } = await supabase.auth.getUser();

    user = authenticatedUser;
  } catch {
    user = null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link href="/" aria-label="MechMate home">
          <span className="text-white text-xl font-bold tracking-tight">
            Mech
          </span>
          <span className="text-emerald-400 text-xl font-bold tracking-tight">
            Mate
          </span>
        </Link>

        {user ? (
          <nav aria-label="Main navigation" className="flex flex-wrap items-center">
            <Link
              href="/garage"
              className="text-sm font-medium text-zinc-300 hover:text-white rounded-md px-3 py-2 hover:bg-zinc-900"
            >
              Garage
            </Link>
            <Link
              href="/diagnose/new"
              className="text-sm font-medium text-zinc-300 hover:text-white rounded-md px-3 py-2 hover:bg-zinc-900"
            >
              New diagnosis
            </Link>
            <Link
              href="/diagnose"
              className="text-sm font-medium text-zinc-300 hover:text-white rounded-md px-3 py-2 hover:bg-zinc-900"
            >
              Diagnoses
            </Link>
          </nav>
        ) : null}

        {user ? (
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-sm text-zinc-500 max-w-[16rem] truncate">
              {user.email}
            </span>
            <form method="post" action="/auth/signout">
              <button
                type="submit"
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/signin"
              className="text-sm font-medium text-zinc-300 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-400"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
