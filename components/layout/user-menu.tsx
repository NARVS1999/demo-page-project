"use client";

// User dropdown (client): avatar + name → Dashboard · Posts · Admin · Log out.
// Logout POSTs to /api/auth/logout (whitelisted in proxy.ts) then returns home.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ user }: { user: { name: string; email: string } }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Open user menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-sm">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/dashboard")}>
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/posts")}>
          Posts
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/admin")}>
          Admin
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={(event) => {
            event.preventDefault();
            void handleLogout();
          }}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
