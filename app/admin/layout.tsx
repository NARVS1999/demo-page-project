// Admin layout — belt-and-braces auth guard (proxy is the convenience gate).
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AdminShell } from "@/components/layout/admin-shell";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");

  return (
    <AdminShell pageTitle="Admin" user={{ name: user.name, email: user.email }}>
      {children}
    </AdminShell>
  );
}
