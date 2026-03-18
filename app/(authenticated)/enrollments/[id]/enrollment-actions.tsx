"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface EnrollmentActionsProps {
  enrollmentId: string;
  currentStatus: string;
  bonusPotId: string | null;
  bonusPotStatus: string | null;
  allMilestonesApproved: boolean;
}

export function EnrollmentActions({
  enrollmentId,
  currentStatus,
  bonusPotId,
  bonusPotStatus,
  allMilestonesApproved,
}: EnrollmentActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  async function handleStatusChange(status: string) {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Failed to update");
        return;
      }

      setConfirmAction(null);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReleaseBonusPot() {
    if (!bonusPotId) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/bonus-pots/${bonusPotId}/release`, {
        method: "POST",
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Failed to release bonus pot");
        return;
      }

      setConfirmAction(null);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefundBonusPot() {
    if (!bonusPotId) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/bonus-pots/${bonusPotId}/refund`, {
        method: "POST",
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Failed to refund bonus pot");
        return;
      }

      setConfirmAction(null);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  // Confirmation dialogs
  if (confirmAction) {
    const actions: Record<string, { title: string; desc: string; buttonLabel: string; buttonClass: string; onConfirm: () => void }> = {
      complete: {
        title: "Complete enrollment",
        desc: "Mark this enrollment as completed. This cannot be undone.",
        buttonLabel: "Complete",
        buttonClass: "bg-violet text-white hover:bg-violet-dark",
        onConfirm: () => handleStatusChange("COMPLETED"),
      },
      cancel: {
        title: "Cancel enrollment",
        desc: "Cancel this enrollment. The client will no longer be active in this programme.",
        buttonLabel: "Cancel enrollment",
        buttonClass: "bg-red-500 text-white hover:bg-red-600",
        onConfirm: () => handleStatusChange("CANCELLED"),
      },
      release: {
        title: "Release bonus pot",
        desc: "Transfer the bonus pot funds to your Stripe account. All milestones must be approved.",
        buttonLabel: "Release funds",
        buttonClass: "bg-green text-white hover:opacity-90",
        onConfirm: handleReleaseBonusPot,
      },
      refund: {
        title: "Refund bonus pot",
        desc: "Refund the bonus pot back to the client. This cannot be undone.",
        buttonLabel: "Refund",
        buttonClass: "bg-red-500 text-white hover:bg-red-600",
        onConfirm: handleRefundBonusPot,
      },
    };

    const action = actions[confirmAction];
    if (!action) return null;

    return (
      <div className="rounded-[12px] border border-border bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
        <p className="text-sm font-semibold text-text">{action.title}</p>
        <p className="mt-1 text-xs text-muted">{action.desc}</p>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button
            onClick={action.onConfirm}
            disabled={isLoading}
            className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${action.buttonClass}`}
          >
            {isLoading ? "Processing..." : action.buttonLabel}
          </button>
          <button
            onClick={() => { setConfirmAction(null); setError(null); }}
            className="rounded-[8px] bg-warm px-3 py-1.5 text-xs font-semibold text-mid transition-colors hover:bg-border"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {/* Bonus pot actions */}
      {bonusPotId && bonusPotStatus === "HELD" && (
        <>
          <button
            onClick={() => setConfirmAction("release")}
            disabled={!allMilestonesApproved}
            title={allMilestonesApproved ? "Release bonus pot" : "All milestones must be approved first"}
            className="rounded-[10px] bg-green px-3 py-2 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Release pot
          </button>
          <button
            onClick={() => setConfirmAction("refund")}
            className="rounded-[10px] border border-border bg-white px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50"
          >
            Refund pot
          </button>
        </>
      )}

      {/* Enrollment status actions */}
      {currentStatus === "ACTIVE" && (
        <>
          <button
            onClick={() => setConfirmAction("complete")}
            className="rounded-[10px] border border-border bg-white px-3 py-2 text-xs font-semibold text-violet transition-colors hover:bg-violet-light"
          >
            Complete
          </button>
          <button
            onClick={() => setConfirmAction("cancel")}
            className="rounded-[10px] border border-border bg-white px-3 py-2 text-xs font-semibold text-muted transition-colors hover:bg-warm"
          >
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
