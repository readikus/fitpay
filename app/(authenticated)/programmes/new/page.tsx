"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProgrammeSchema, type CreateProgrammeInput } from "@/schemas/programme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";

export default function NewProgrammePage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateProgrammeInput>({
    resolver: zodResolver(createProgrammeSchema),
    defaultValues: {
      currency: "gbp",
      bonusPotAmount: 0,
      milestones: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "milestones",
  });

  async function onSubmit(data: CreateProgrammeInput) {
    setServerError(null);
    setIsSubmitting(true);

    // Convert pounds to pence for storage
    const payload = {
      ...data,
      baseFeeAmount: Math.round(data.baseFeeAmount * 100),
      bonusPotAmount: data.bonusPotAmount ? Math.round(data.bonusPotAmount * 100) : 0,
    };

    try {
      const res = await fetch("/api/programmes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json();
        setServerError(body.error || "Something went wrong");
        return;
      }

      const { programme } = await res.json();
      router.push(`/programmes/${programme.id}`);
      router.refresh();
    } catch {
      setServerError("Failed to create programme. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/programmes"
          className="text-sm font-semibold text-violet hover:text-violet-dark"
        >
          &lsaquo; Back to programmes
        </Link>
      </div>

      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-2xl font-bold text-text">Create programme</h1>
        <p className="mt-1 text-mid">Set up a coaching programme with fees and milestones.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
          {/* Programme details */}
          <Card>
            <CardHeader>
              <CardTitle>Programme details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Programme name</Label>
                <Input id="name" placeholder="e.g. 12-Week Body Transformation" {...register("name")} />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <textarea
                  id="description"
                  className="flex min-h-[80px] w-full rounded-[12px] border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-muted focus:border-violet focus:outline-none focus:ring-1 focus:ring-violet"
                  placeholder="Describe what this programme includes..."
                  {...register("description")}
                />
                {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="durationWeeks">Duration (weeks)</Label>
                  <Input
                    id="durationWeeks"
                    type="number"
                    min={1}
                    max={52}
                    placeholder="12"
                    {...register("durationWeeks", { valueAsNumber: true })}
                  />
                  {errors.durationWeeks && (
                    <p className="mt-1 text-xs text-red-500">{errors.durationWeeks.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="maxClients">Max clients (optional)</Label>
                  <Input
                    id="maxClients"
                    type="number"
                    min={1}
                    {...register("maxClients", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
                  />
                  {errors.maxClients && (
                    <p className="mt-1 text-xs text-red-500">{errors.maxClients.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted">
                The base fee is split into 3 instalments. The bonus pot is held until milestones are completed.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="baseFeeAmount">Base fee (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">£</span>
                    <Input
                      id="baseFeeAmount"
                      type="number"
                      min={1}
                      step="0.01"
                      placeholder="300.00"
                      className="pl-7"
                      {...register("baseFeeAmount", { valueAsNumber: true })}
                    />
                  </div>
                  {errors.baseFeeAmount && (
                    <p className="mt-1 text-xs text-red-500">{errors.baseFeeAmount.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="bonusPotAmount">Bonus pot (£, optional)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">£</span>
                    <Input
                      id="bonusPotAmount"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      className="pl-7"
                      {...register("bonusPotAmount", { setValueAs: (v) => (v === "" || v === undefined ? 0 : Number(v)) })}
                    />
                  </div>
                  {errors.bonusPotAmount && (
                    <p className="mt-1 text-xs text-red-500">{errors.bonusPotAmount.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Milestones */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Milestones</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ name: "", weekNumber: 1, requiredEvidence: ["CHECK_IN"], description: "" })
                  }
                >
                  <Plus className="mr-1 h-3 w-3" /> Add milestone
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted">
                Milestones are checkpoints where clients prove their progress. When all milestones are approved, the bonus pot is released to you.
              </p>
              {fields.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">
                  No milestones yet. Add milestones to track client progress.
                </p>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="rounded-[10px] border border-border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                              <Label>Name</Label>
                              <Input
                                placeholder="e.g. Week 4 check-in"
                                {...register(`milestones.${index}.name`)}
                              />
                              <p className="mt-1 text-xs text-muted">A short label for this checkpoint</p>
                              {errors.milestones?.[index]?.name && (
                                <p className="mt-1 text-xs text-red-500">
                                  {errors.milestones[index].name?.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label>Week</Label>
                              <Input
                                type="number"
                                min={1}
                                {...register(`milestones.${index}.weekNumber`, { valueAsNumber: true })}
                              />
                              <p className="mt-1 text-xs text-muted">When it&apos;s due</p>
                            </div>
                          </div>
                          <div>
                            <Label>Description (optional)</Label>
                            <Input
                              placeholder="e.g. Submit a progress photo and check in with your coach"
                              {...register(`milestones.${index}.description`)}
                            />
                            <p className="mt-1 text-xs text-muted">Instructions shown to the client</p>
                          </div>
                          <div>
                            <Label className="mb-2 block">Required evidence</Label>
                            <p className="mb-2 text-xs text-muted">What the client needs to submit to complete this milestone</p>
                            <div className="flex gap-3">
                              {(["PHOTO", "CHECK_IN", "ATTENDANCE"] as const).map((type) => (
                                <label key={type} className="flex items-center gap-1.5 text-sm text-mid">
                                  <input
                                    type="checkbox"
                                    value={type}
                                    className="rounded accent-violet"
                                    {...register(`milestones.${index}.requiredEvidence`)}
                                  />
                                  {type === "CHECK_IN" ? "Check-in" : type === "PHOTO" ? "Photo" : "Attendance"}
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="mt-5 text-muted hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {serverError && (
            <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {serverError}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create programme"}
            </Button>
            <Link href="/programmes">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
