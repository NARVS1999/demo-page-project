"use client";

// Admin shell (client — needs usePathname for active nav + Radix Sidebar):
// SidebarProvider + collapsible Sidebar (off-canvas drawer < md) + header row
// (page title + theme-toggle + user menu) + max-w-6xl content.
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Blocks,
  CalendarCheck,
  FolderOpen,
  Hash,
  Inbox,
  LayoutDashboard,
  MessageSquare,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";

const adminNav = [
  {
    group: "Platform",
    items: [
      {
        label: "Overview",
        href: "/admin",
        icon: <LayoutDashboard className="h-4 w-4" aria-hidden="true" />,
        exact: true,
      },
      {
        label: "Posts",
        href: "/posts",
        icon: <Inbox className="h-4 w-4" aria-hidden="true" />,
      },
      {
        label: "Email outbox",
        href: "/admin/emails",
        icon: <Blocks className="h-4 w-4" aria-hidden="true" />,
      },
      {
        label: "SMS log",
        href: "/admin/sms",
        icon: <MessageSquare className="h-4 w-4" aria-hidden="true" />,
      },
    ],
  },
  {
    group: "Content",
    items: [
      {
        label: "Categories",
        href: "/admin/categories",
        icon: <FolderOpen className="h-4 w-4" aria-hidden="true" />,
      },
      {
        label: "Tags",
        href: "/admin/tags",
        icon: <Hash className="h-4 w-4" aria-hidden="true" />,
      },
    ],
  },
  {
    group: "Bookings",
    items: [
      {
        label: "Bookings",
        href: "/admin/bookings",
        icon: <CalendarCheck className="h-4 w-4" aria-hidden="true" />,
      },
    ],
  },
];

function isActive(href: string, pathname: string, exact?: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export function AdminShell({
  children,
  pageTitle,
  user,
}: {
  children: React.ReactNode;
  pageTitle: string;
  user: { name: string; email: string } | null;
}) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader>
          <Link href="/admin" className="flex items-center gap-2 px-2 py-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary">
              <Blocks className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold tracking-tight">Admin</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          {adminNav.map((group) => (
            <SidebarGroup key={group.group}>
              <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href, pathname, item.exact)}
                      >
                        <Link href={item.href}>
                          {item.icon}
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-base font-semibold tracking-tight">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user && <UserMenu user={user} />}
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
