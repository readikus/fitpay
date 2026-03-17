"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Check, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createCoachSchema, type CreateCoachInput } from "@/schemas/coach";
import { SessionUser } from "@/types/auth";

interface SettingsFormProps {
  user: SessionUser;
}

export function SettingsForm({ user }: SettingsFormProps) {
  const router = useRouter();
  const hasCoachProfile = !!user.coachId;
  const hasStripeAccount = !!user.stripeAccountId;
  const stripeComplete = user.stripeOnboardingComplete;

  return (
    <div className="space-y-6">
      <StepCard
        step={1}
        title="Coach Profile"
        description="Your business details"
        complete={hasCoachProfile}
      >
        {hasCoachProfile ? (
          <ProfileComplete businessName={user.businessName} />
        ) : (
          <ProfileForm onComplete={() => router.refresh()} />
        )}
      </StepCard>

      <StepCard
        step={2}
        title="Payment Account"
        description="Connect Stripe to receive payments"
        complete={stripeComplete}
        disabled={!hasCoachProfile}
      >
        {!hasCoachProfile ? (
          <p className="text-sm text-muted">Complete step 1 first.</p>
        ) : stripeComplete ? (
          <StripeComplete />
        ) : (
          <StripeConnect hasAccount={hasStripeAccount} />
        )}
      </StepCard>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
  complete,
  disabled,
  children,
}: {
  step: number;
  title: string;
  description: string;
  complete: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={disabled ? "opacity-60" : undefined}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              complete
                ? "bg-green text-white"
                : "bg-violet-light text-violet-dark"
            }`}
          >
            {complete ? <Check className="h-4 w-4" /> : step}
          </span>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ProfileComplete({ businessName }: { businessName: string | null }) {
  return (
    <div className="flex items-center gap-2 text-sm text-green">
      <Check className="h-4 w-4" />
      <span>{businessName || "Profile created"}</span>
    </div>
  );
}

function ProfileForm({ onComplete }: { onComplete: () => void }) {
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateCoachInput>({
    resolver: zodResolver(createCoachSchema),
  });

  const onSubmit = async (data: CreateCoachInput) => {
    setError(null);
    const res = await fetch("/api/coaches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Something went wrong");
      return;
    }

    onComplete();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="businessName">Business name</Label>
        <Input
          id="businessName"
          placeholder="e.g. Elite Coaching"
          {...register("businessName")}
        />
        {errors.businessName && (
          <p className="text-xs text-red-500">{errors.businessName.message}</p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create profile
      </Button>
    </form>
  );
}

function StripeComplete() {
  return (
    <div className="flex items-center gap-2 text-sm text-green">
      <Check className="h-4 w-4" />
      <span>Stripe account connected</span>
    </div>
  );
}

function StripeConnect({ hasAccount }: { hasAccount: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/stripe/connect", { method: "POST" });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Something went wrong");
      setLoading(false);
      return;
    }

    const { url } = await res.json();
    window.location.href = url;
  };

  return (
    <div className="space-y-3">
      {hasAccount && (
        <p className="text-sm text-mid">
          Stripe setup is incomplete. Click below to continue.
        </p>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button onClick={handleConnect} disabled={loading} variant={hasAccount ? "outline" : "default"}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ExternalLink className="mr-2 h-4 w-4" />
        )}
        {hasAccount ? "Continue Stripe setup" : "Connect with Stripe"}
      </Button>
    </div>
  );
}
