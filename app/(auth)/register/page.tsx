"use client";

// Register page (UI-SPEC Page 3): name/email/password with Zod inline errors,
// 409 duplicate-email Alert, auto-login on success → /dashboard.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/auth/auth-card";
import { registerSchema, type RegisterInput } from "@/lib/validate";

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [networkError, setNetworkError] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(data: RegisterInput) {
    setServerError(null);
    setNetworkError(false);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      if (res.status === 409) {
        setServerError("That email is already registered.");
        return;
      }
      setNetworkError(true);
    } catch {
      setNetworkError(true);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      description="Start your demo in seconds"
      footer={
        <span>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
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
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Ada Lovelace"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
            {...register("name")}
          />
          {errors.name && (
            <p id="name-error" className="text-sm text-destructive">
              {errors.name.message}
            </p>
          )}
        </div>

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
            autoComplete="new-password"
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
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
