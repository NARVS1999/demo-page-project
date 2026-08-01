// (main) route group layout — the app-shell segment (UI-SPEC Layout Structure).
// Every page under this group (landing /, dashboard, posts) gets the site
// header/main/footer; URLs are unchanged by the route group.
import { AppShell } from "@/components/layout/app-shell";

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
