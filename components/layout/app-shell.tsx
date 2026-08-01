// App shell: site-header + main#main (max-w-5xl content) + site-footer.
// Used by the (main) route group layout — landing, dashboard, posts.
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main
        id="main"
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8"
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
