import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { redirect } from "next/navigation";
import { pool } from "@/providers/database/pool";
import Stripe from "stripe";
import { SettingsForm } from "./settings-form";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ stripe?: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  // When returning from Stripe onboarding, check actual account status and sync DB
  const { stripe: stripeParam } = await searchParams;
  if (stripeParam === "complete" && user.stripeAccountId && !user.stripeOnboardingComplete) {
    const account = await stripe.accounts.retrieve(user.stripeAccountId);
    const isComplete = account.charges_enabled && account.payouts_enabled;
    if (isComplete) {
      await pool.query(
        "UPDATE coaches SET stripe_onboarding_complete = true, updated_at = now() WHERE id = $1",
        [user.coachId],
      );
      user.stripeOnboardingComplete = true;
    }
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-text">Settings</h1>
      <p className="mt-1 text-mid">Set up your coach profile and payment account.</p>

      <div className="mt-8 max-w-xl">
        <SettingsForm user={user} />
      </div>
    </div>
  );
}
