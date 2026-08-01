"use client";

// Login page (UI-SPEC Page 2): react-hook-form + zodResolver(loginSchema),
// inline field errors, demo-credentials Alert, pending spinner, ?next= support.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/auth/auth-card";
import { safeNextUrl } from "@/lib/utils";
import { loginSchema, type LoginInput } from "@/lib/validate";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [networkError, setNetworkError] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginInput) {
    setServerError(null);
    setNetworkError(false);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        // ?next= is attacker-controlled — only same-origin absolute paths
        // (WR-01: open redirect via https://evil.com or //evil.com).
        router.push(safeNextUrl(next));
        router.refresh();
        return;
      }
      // 401 (bad credentials) and 400 (client-side validation bypassed / schema
      // drift) both get the same generic details copy; anything else really is
      // a server/network failure (IN-05 — a 400 used to show the misleading
      // "Couldn't reach the server" message).
      if (res.status === 401 || res.status === 400) {
        setServerError("Check your details and try again.");
        return;
      }
      setNetworkError(true);
    } catch {
      setNetworkError(true);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your account"
      footer={
        <span>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </span>
      }
    >
      <Alert variant="default" className="mb-4">
        <AlertDescription>
          Demo account — email: demo@example.com · password: demo1234
        </AlertDescription>
      </Alert>

      {next && (
        <Alert variant="default" className="mb-4">
          <AlertDescription>Please sign in to continue.</AlertDescription>
        </Alert>
      )}

      {serverError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}
      {networkError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>Couldn&apos;t reach the server. Try again.</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p id="email-error" className="text-sm text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          {errors.password && (
            <p id="password-error" className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>
    </AuthCard>
  );
}
