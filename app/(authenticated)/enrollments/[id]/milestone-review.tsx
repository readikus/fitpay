"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MilestoneReviewProps {
  submissionId: string;
  milestoneName: string;
  submittedAt: string;
}

export function MilestoneReview({ submissionId, milestoneName, submittedAt }: MilestoneReviewProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReview(status: "APPROVED" | "REJECTED") {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/milestones/submissions/${submissionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNotes: reviewNotes || undefined }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Failed to review");
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-2 rounded-[8px] border border-amber bg-amber-light p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-amber">Submitted for review</p>
          <p className="text-[10px] text-mid">
            {new Date(submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        {!showNotes && (
          <div className="flex gap-1.5">
            <button
              onClick={() => handleReview("APPROVED")}
              disabled={isLoading}
              className="rounded-[8px] bg-green px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => setShowNotes(true)}
              disabled={isLoading}
              className="rounded-[8px] bg-white px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {showNotes && (
        <div className="mt-2 space-y-2">
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Reason for rejection (optional)"
            className="w-full rounded-[8px] border border-border bg-white px-3 py-2 text-xs text-text placeholder:text-muted focus:border-violet focus:outline-none focus:ring-1 focus:ring-violet"
            rows={2}
          />
          <div className="flex gap-1.5">
            <button
              onClick={() => handleReview("REJECTED")}
              disabled={isLoading}
              className="rounded-[8px] bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            >
              {isLoading ? "Rejecting..." : "Confirm rejection"}
            </button>
            <button
              onClick={() => { setShowNotes(false); setReviewNotes(""); }}
              className="rounded-[8px] bg-white px-3 py-1.5 text-xs font-semibold text-mid transition-colors hover:bg-warm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
