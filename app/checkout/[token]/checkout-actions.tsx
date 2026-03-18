"use client";

import { useState } from "react";

interface CheckoutActionsProps {
  enrollmentId: string;
  paymentId: string;
  amount: number;
  type: string;
}

export function CheckoutActions({ enrollmentId, paymentId, amount, type }: CheckoutActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, enrollmentId }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Failed to start checkout");
        return;
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const label = type === "BONUS_POT" ? "bonus pot" : "instalment";

  return (
    <div className="mt-6">
      <button
        onClick={handlePay}
        disabled={isLoading}
        className="w-full rounded-[12px] bg-violet px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(124,58,237,0.3)] transition-all hover:-translate-y-0.5 hover:bg-violet-dark disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {isLoading ? "Redirecting to checkout..." : `Pay £${(amount / 100).toFixed(2)} — ${label}`}
      </button>

      {error && (
        <div className="mt-3 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
