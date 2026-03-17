"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail } from "lucide-react";
import { createBrowserClient } from "@/providers/supabase/browser-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const AuthSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type AuthInput = z.infer<typeof AuthSchema>;

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4050";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthInput>({
    resolver: zodResolver(AuthSchema),
  });

  const handleAuth = async (data: AuthInput) => {
    setError(null);
    const supabase = createBrowserClient();

    // Try sign in first — no rate limit issues
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (!signInError) {
      router.push(returnTo);
      router.refresh();
      return;
    }

    // Sign in failed — try sign up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(returnTo)}`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // Empty identities = user already exists, so the sign-in failure was a wrong password
    if (signUpData.user?.identities?.length === 0) {
      setError("Incorrect password. Please try again.");
      return;
    }

    // New user created — show check-email prompt
    setConfirmEmail(data.email);
  };

  if (confirmEmail) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-light">
            <Mail className="h-6 w-6 text-violet" />
          </div>
          <CardTitle className="font-serif text-2xl font-bold">Check your email</CardTitle>
          <CardDescription className="mt-2">
            We&apos;ve sent a confirmation link to{" "}
            <span className="font-medium text-text">{confirmEmail}</span>.
            Click the link to verify your account and get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setConfirmEmail(null)}
          >
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="font-serif text-2xl font-bold">
          <span className="text-violet">Fit</span>Pay
        </CardTitle>
        <CardDescription>Enter your email to get started or sign in</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleAuth)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="At least 6 characters" {...register("password")} />
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>

          {error && (
            <div className="rounded-[10px] bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "One moment..." : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <Suspense>
        <AuthForm />
      </Suspense>
    </div>
  );
}
