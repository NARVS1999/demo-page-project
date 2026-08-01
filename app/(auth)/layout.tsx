// (auth) route group layout — full-bleed centered (no site header/footer),
// theme-toggle absolute top-right, authenticated users bounce to /dashboard.
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="relative grid min-h-dvh place-items-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
