import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link href="/" aria-label="MechMate home">
          <span className="text-xl font-bold tracking-tight text-fg">
            Mech
          </span>
          <span className="text-xl font-bold tracking-tight text-accent">
            Mate
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/signin"
            className="text-sm font-medium text-fg-secondary hover:text-fg"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
