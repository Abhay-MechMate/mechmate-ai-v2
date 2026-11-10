import { WordmarkLink } from "@/components/wordmark-link";

export function AppTopbar({ email }: { email: string | null }) {
  return <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-line bg-canvas px-4">
    <WordmarkLink />
    {email ? <p className="min-w-0 max-w-[18rem] truncate text-sm text-fg-muted"><span className="sr-only">Signed in as </span>{email}</p> : null}
  </header>;
}
