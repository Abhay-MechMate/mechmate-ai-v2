import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { getAuthContext } from "@/lib/supabase/auth-context";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = await getAuthContext();
  return <div className="flex min-h-screen flex-col bg-canvas text-fg">
    <a href="#main" className="sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:not-sr-only focus:rounded-lg focus:bg-surface-raised focus:px-3 focus:py-2 focus:text-fg">Skip to content</a>
    <AppTopbar email={user?.email ?? null} />
    <div className="flex flex-1">
      <AppSidebar />
      <main id="main" className="min-w-0 flex-1 px-6 py-8 lg:px-8">{children}</main>
    </div>
  </div>;
}
