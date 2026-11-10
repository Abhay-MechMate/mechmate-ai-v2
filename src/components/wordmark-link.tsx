"use client";

import { activeNav } from "@/components/app-nav";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function WordmarkLink() {
  const onDashboard = activeNav(usePathname()) === "dashboard";
  return <Link href="/dashboard" aria-label="MechMate dashboard" aria-current={onDashboard ? "page" : undefined} className="text-xl font-bold tracking-tight">
    <span className="text-fg">Mech</span><span className="text-accent">Mate</span>
  </Link>;
}
