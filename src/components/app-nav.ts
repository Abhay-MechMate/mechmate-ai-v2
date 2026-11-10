export type NavKey = "garage" | "new" | "history";
export type ActiveNav = NavKey | "dashboard" | null;

export const NAV_ITEMS: readonly { key: NavKey; href: string; label: string }[] = [
  { key: "garage", href: "/garage", label: "Garage" },
  { key: "new", href: "/diagnose/new", label: "New diagnosis" },
  { key: "history", href: "/diagnose", label: "Diagnoses" },
];

export const SIDEBAR_COOKIE = "mm_sidebar";
export type SidebarMode = "full" | "rail";

export function parseSidebarMode(value: string | undefined): SidebarMode {
  return value === "rail" ? "rail" : "full";
}

export function activeNav(pathname: string): ActiveNav {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (path === "/dashboard") return "dashboard";
  if (path === "/garage" || path.startsWith("/garage/")) return "garage";
  if (path === "/diagnose/new") return "new";
  if (path === "/diagnose" || path.startsWith("/diagnose/")) return "history";
  return null;
}
