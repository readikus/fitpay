"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AttendanceFormProps {
  enrollmentId: string;
  existingDates: string[];
}

export function AttendanceForm({ enrollmentId, existingDates }: AttendanceFormProps) {
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [attended, setAttended] = useState(true);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionDate: date,
          attended,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Failed to log attendance");
        return;
      }

      const isUpdate = existingDates.some((d) => d.split("T")[0] === date);
      setSuccess(isUpdate ? "Attendance updated" : "Attendance logged");
      setNotes("");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-text focus:border-violet focus:outline-none focus:ring-1 focus:ring-violet"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="attended"
              checked={attended}
              onChange={() => setAttended(true)}
              className="accent-green"
            />
            <span className="text-sm text-text">Present</span>
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="attended"
              checked={!attended}
              onChange={() => setAttended(false)}
              className="accent-red-500"
            />
            <span className="text-sm text-text">Absent</span>
          </label>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="flex-1 rounded-[10px] border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-muted focus:border-violet focus:outline-none focus:ring-1 focus:ring-violet"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-[10px] bg-violet px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-dark disabled:opacity-50"
        >
          {isLoading ? "Saving..." : "Log"}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {success && <p className="text-xs text-green">{success}</p>}
    </form>
  );
}
