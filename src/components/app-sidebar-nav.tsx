"use client";

import { activeNav, NAV_ITEMS, SIDEBAR_COOKIE, type SidebarMode } from "@/components/app-nav";
import { NavIcon } from "@/components/nav-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const regularItem = "relative flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-fg-secondary transition-colors hover:bg-surface-raised hover:text-fg";
const railLabel = "whitespace-nowrap sr-only group-hover/sidebar:not-sr-only group-focus-within/sidebar:not-sr-only group-data-[mode=full]/sidebar:lg:not-sr-only";

export function AppSidebarNav({ initialMode }: { initialMode: SidebarMode }) {
  const pathname = usePathname();
  const active = activeNav(pathname);
  const [mode, setMode] = useState(initialMode);

  function toggle() {
    const next = mode === "full" ? "rail" : "full";
    document.cookie = `${SIDEBAR_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    setMode(next);
  }

  return <aside aria-label="App" data-mode={mode} className="group/sidebar sticky top-14 h-[calc(100vh-3.5rem)] w-16 shrink-0 data-[mode=full]:lg:w-60">
    <div className="absolute inset-y-0 left-0 z-30 flex w-16 flex-col overflow-hidden border-r border-line bg-surface transition-[width] motion-reduce:transition-none group-hover/sidebar:w-60 group-focus-within/sidebar:w-60 group-data-[mode=full]/sidebar:lg:w-60">
      <nav aria-label="Main" className="flex flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const selected = active === item.key;
          const primary = item.key === "new";
          return <Link
            key={item.key}
            href={item.href}
            aria-current={selected ? "page" : undefined}
            className={primary
              ? `flex h-10 w-full items-center gap-3 rounded-lg bg-accent px-3 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover ${selected ? "ring-2 ring-accent-hover ring-offset-2 ring-offset-surface" : ""}`
              : `${regularItem} ${selected ? "bg-surface-raised text-fg before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-accent" : ""}`}
          >
            <NavIcon name={item.key === "garage" ? "garage" : item.key === "new" ? "plus" : "list"} className={`size-5 shrink-0 ${!primary && selected ? "text-accent" : !primary ? "text-fg-muted" : ""}`} />
            <span className={railLabel}>{item.label}</span>
          </Link>;
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-line p-3">
        <button type="button" onClick={toggle} aria-pressed={mode === "full"} className={`${regularItem} hidden lg:flex`}>
          <NavIcon name="collapse" className={`size-5 shrink-0 text-fg-muted transition-transform ${mode === "rail" ? "rotate-180" : ""}`} />
          <span className={railLabel}>{mode === "full" ? "Collapse sidebar" : "Pin sidebar open"}</span>
        </button>
        <form method="post" action="/auth/signout">
          <button type="submit" className={regularItem}>
            <NavIcon name="signout" className="size-5 shrink-0 text-fg-muted" />
            <span className={railLabel}>Sign out</span>
          </button>
        </form>
      </div>
    </div>
  </aside>;
}
