const APP_PREFIXES = ["/dashboard", "/garage", "/diagnose"] as const;
const SIGNED_OUT_ONLY = ["/", "/signin", "/signup"] as const;

export const SIGNED_IN_HOME = "/dashboard";

export function isAppPath(pathname: string): boolean {
  return APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function safeNextPath(raw: unknown): string {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return SIGNED_IN_HOME;
  }
  const pathname = raw.split(/[?#]/)[0];
  return isAppPath(pathname) ? raw : SIGNED_IN_HOME;
}

export function signInPath(next: string): string {
  return `/signin?next=${encodeURIComponent(safeNextPath(next))}`;
}

/** null means the request may continue. */
export function routeDecision(pathname: string, search: string, signedIn: boolean): string | null {
  if (signedIn && (SIGNED_OUT_ONLY as readonly string[]).includes(pathname)) return SIGNED_IN_HOME;
  if (!signedIn && isAppPath(pathname)) return signInPath(pathname + search);
  return null;
}
