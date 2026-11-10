import { AppSidebarNav } from "@/components/app-sidebar-nav";
import { parseSidebarMode, SIDEBAR_COOKIE } from "@/components/app-nav";
import { cookies } from "next/headers";

/** Reads the persisted mode on the server so the first paint has the right width. */
export async function AppSidebar() {
  const jar = await cookies();
  const initialMode = parseSidebarMode(jar.get(SIDEBAR_COOKIE)?.value);
  return <AppSidebarNav initialMode={initialMode} />;
}
