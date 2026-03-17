import { getAuthenticatedUser } from "@/providers/supabase/auth-helpers";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

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
