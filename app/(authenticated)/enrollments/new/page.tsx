"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface Programme {
  id: string;
  name: string;
  duration_weeks: number;
  base_fee_amount: number;
  bonus_pot_amount: number;
  status: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function NewEnrollmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProgrammeId = searchParams.get("programmeId") || "";
  const preselectedClientId = searchParams.get("clientId") || "";

  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [programmeId, setProgrammeId] = useState(preselectedProgrammeId);
  const [clientId, setClientId] = useState(preselectedClientId);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [progRes, clientRes] = await Promise.all([
          fetch("/api/programmes"),
          fetch("/api/clients"),
        ]);
        if (progRes.ok) {
          const { programmes } = await progRes.json();
          setProgrammes(programmes.filter((p: Programme) => p.status !== "ARCHIVED"));
        }
        if (clientRes.ok) {
          const body = await clientRes.json();
          setClients(body.clients || []);
        }
      } catch {
        setServerError("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const [showNewClient, setShowNewClient] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  const selectedProgramme = programmes.find((p) => p.id === programmeId);

  async function handleCreateClient() {
    if (!newFirstName || !newLastName || !newEmail) return;
    setCreatingClient(true);
    setServerError(null);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: newFirstName,
          lastName: newLastName,
          email: newEmail,
          phone: newPhone || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setServerError(body.error || "Failed to create client");
        return;
      }

      const { client } = await res.json();
      setClients((prev) => [...prev, client]);
      setClientId(client.id);
      setShowNewClient(false);
      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
      setNewPhone("");
    } catch {
      setServerError("Failed to create client");
    } finally {
      setCreatingClient(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    if (!programmeId || !clientId || !startDate) {
      setServerError("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programmeId, clientId, startDate }),
      });

      if (!res.ok) {
        const body = await res.json();
        setServerError(body.error || "Something went wrong");
        return;
      }

      const { enrollment } = await res.json();
      router.push(`/clients/${clientId}`);
      router.refresh();
      // The checkout link will be visible on the client detail page
      void enrollment;
    } catch {
      setServerError("Failed to create enrollment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={preselectedClientId ? `/clients/${preselectedClientId}` : preselectedProgrammeId ? `/programmes/${preselectedProgrammeId}` : "/dashboard"}
          className="text-sm font-semibold text-violet hover:text-violet-dark"
        >
          &lsaquo; Back
        </Link>
      </div>

      <div className="mx-auto max-w-lg">
        <h1 className="font-serif text-2xl font-bold text-text">Enrol client</h1>
        <p className="mt-1 text-mid">Enrol a client in a programme and generate their payment link.</p>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Enrollment details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="programmeId">Programme</Label>
                <select
                  id="programmeId"
                  value={programmeId}
                  onChange={(e) => setProgrammeId(e.target.value)}
                  className="flex w-full rounded-[12px] border border-border bg-white px-3 py-2 text-sm text-text focus:border-violet focus:outline-none focus:ring-1 focus:ring-violet"
                >
                  <option value="">Select a programme</option>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — £{(p.base_fee_amount / 100).toFixed(2)} + £{(p.bonus_pot_amount / 100).toFixed(2)} bonus
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="clientId">Client</Label>
                  <button
                    type="button"
                    onClick={() => setShowNewClient(!showNewClient)}
                    className="text-xs font-semibold text-violet hover:text-violet-dark"
                  >
                    {showNewClient ? "Cancel" : "+ Add new client"}
                  </button>
                </div>
                {showNewClient ? (
                  <div className="mt-2 space-y-3 rounded-[12px] border border-border bg-warm p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="newFirstName">First name</Label>
                        <Input id="newFirstName" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} placeholder="John" />
                      </div>
                      <div>
                        <Label htmlFor="newLastName">Last name</Label>
                        <Input id="newLastName" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} placeholder="Smith" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="newEmail">Email</Label>
                      <Input id="newEmail" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="john@example.com" />
                    </div>
                    <div>
                      <Label htmlFor="newPhone">Phone (optional)</Label>
                      <Input id="newPhone" type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="07..." />
                    </div>
                    <Button type="button" onClick={handleCreateClient} disabled={creatingClient || !newFirstName || !newLastName || !newEmail}>
                      {creatingClient ? "Creating..." : "Create client"}
                    </Button>
                  </div>
                ) : (
                  <select
                    id="clientId"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="mt-2 flex w-full rounded-[12px] border border-border bg-white px-3 py-2 text-sm text-text focus:border-violet focus:outline-none focus:ring-1 focus:ring-violet"
                  >
                    <option value="">Select a client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} ({c.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <Label htmlFor="startDate">Start date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              {selectedProgramme && (
                <div className="rounded-[10px] bg-warm p-4">
                  <h3 className="text-sm font-semibold text-text">Payment summary</h3>
                  <div className="mt-2 space-y-1 text-sm text-mid">
                    <div className="flex justify-between">
                      <span>Base fee (3 instalments)</span>
                      <span className="font-medium text-text">£{(selectedProgramme.base_fee_amount / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Each instalment</span>
                      <span>£{(Math.floor(selectedProgramme.base_fee_amount / 3) / 100).toFixed(2)}</span>
                    </div>
                    {selectedProgramme.bonus_pot_amount > 0 && (
                      <div className="flex justify-between">
                        <span>Bonus pot</span>
                        <span className="font-medium text-text">£{(selectedProgramme.bonus_pot_amount / 100).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold text-text">
                      <span>Total</span>
                      <span>£{((selectedProgramme.base_fee_amount + selectedProgramme.bonus_pot_amount) / 100).toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-muted">Duration: {selectedProgramme.duration_weeks} weeks</div>
                  </div>
                </div>
              )}

              {serverError && (
                <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {serverError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create enrollment"}
                </Button>
                <Link href={preselectedClientId ? `/clients/${preselectedClientId}` : "/dashboard"}>
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
