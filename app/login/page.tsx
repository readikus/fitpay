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

function getAppUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4050";
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/dashboard";
  const urlError = searchParams.get("error");
  const [error, setError] = useState<string | null>(
    urlError === "callback_failed" ? "Sign in failed. Please try again." : null,
  );
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthInput>({
    resolver: zodResolver(AuthSchema),
  });

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    const supabase = createBrowserClient();

    // Store returnTo so the callback can redirect after OAuth completes.
    // Don't put query params in redirectTo — Supabase matches it against the allowlist exactly.
    sessionStorage.setItem("returnTo", returnTo);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getAppUrl()}/auth/callback`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
  };

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
        emailRedirectTo: `${getAppUrl()}/auth/callback`,
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
      <CardContent className="space-y-4">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || isSubmitting}
        >
          <GoogleIcon />
          {googleLoading ? "Redirecting..." : "Continue with Google"}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted">or</span>
          </div>
        </div>

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

          <Button type="submit" className="w-full" disabled={isSubmitting || googleLoading}>
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
