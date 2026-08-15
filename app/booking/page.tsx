"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Treatment } from "@/lib/types";
import { formatCurrency, getTreatmentPrice } from "@/lib/utils";

interface BookingPayload {
  treatmentId: string;
  date: string;
  startTime: string;
  durationMins: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes: string;
}

const steps = ["Treatment", "Time", "Details", "Confirm"];

function getMinDate() {
  return new Date().toISOString().split("T")[0];
}

export default function BookingPage() {
  const [step, setStep] = useState(1);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [treatmentId, setTreatmentId] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadTreatments = async () => {
      const response = await fetch("/api/treatments");
      const data = (await response.json()) as Treatment[];
      setTreatments(data.filter((item) => item.active));
    };

    loadTreatments().catch(() => setError("Unable to load treatments right now."));
  }, []);

  useEffect(() => {
    if (!date || !duration) {
      setSlots([]);
      setStartTime("");
      return;
    }

    const loadSlots = async () => {
      setLoadingSlots(true);
      setError("");
      try {
        const response = await fetch(`/api/availability?date=${date}&duration=${duration}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to fetch slots.");
        }
        setSlots(data.slots);
        setStartTime("");
      } catch (slotError) {
        setSlots([]);
        setError(slotError instanceof Error ? slotError.message : "Unable to fetch slots.");
      } finally {
        setLoadingSlots(false);
      }
    };
    void loadSlots();
  }, [date, duration]);

  const selectedTreatment = useMemo(
    () => treatments.find((treatment) => treatment.id === treatmentId),
    [treatmentId, treatments]
  );
  const totalPrice = selectedTreatment && duration ? getTreatmentPrice(selectedTreatment, duration) : 0;

  const canContinueToStep2 = Boolean(selectedTreatment);
  const canContinueToStep3 = Boolean(selectedTreatment && duration && date && startTime);
  const canContinueToStep4 = Boolean(clientName && clientEmail && clientPhone);

  const submitBooking = async () => {
    if (!selectedTreatment || !duration || !startTime) return;

    setSubmitting(true);
    setError("");

    const payload: BookingPayload = {
      treatmentId,
      date,
      startTime,
      durationMins: duration,
      clientName,
      clientEmail,
      clientPhone,
      notes,
    };

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to submit booking.");
      }
      setSuccess(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit booking.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-400">Book Now</p>
        <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">Book a tailored sports massage session.</h1>
        <p className="mt-6 text-lg text-gray-400">Choose your treatment, find a suitable slot and send your booking request in minutes.</p>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        {steps.map((label, index) => (
          <div key={label} className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ${step >= index + 1 ? "border-green-500 bg-green-500 text-white" : "border-gray-700 bg-gray-900 text-gray-400"}`}>
              {index + 1}
            </div>
            <span className="text-sm text-gray-300">{label}</span>
          </div>
        ))}
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="mt-8 space-y-8">
        <Card className={step === 1 ? "border-green-500/30" : ""}>
          <CardHeader>
            <CardTitle>Step 1: Select your treatment</CardTitle>
            <CardDescription>Pick the session that best matches your recovery or performance needs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {treatments.map((treatment) => (
                <button
                  key={treatment.id}
                  type="button"
                  onClick={() => {
                    setTreatmentId(treatment.id);
                    setDuration(null);
                    setDate("");
                    setStartTime("");
                    setStep(1);
                  }}
                  className={`rounded-2xl border p-5 text-left transition ${treatmentId === treatment.id ? "border-green-500 bg-green-500/10" : "border-gray-800 bg-gray-950/60 hover:border-gray-700"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-white">{treatment.name}</h2>
                      <p className="mt-2 text-sm leading-6 text-gray-400">{treatment.description}</p>
                    </div>
                    {treatmentId === treatment.id ? <CheckCircle2 className="h-5 w-5 text-green-400" /> : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-300">
                    {treatment.durations.map((itemDuration) => (
                      <Badge key={itemDuration} variant="secondary">
                        {itemDuration} mins · {formatCurrency(getTreatmentPrice(treatment, itemDuration))}
                      </Badge>
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <Button onClick={() => setStep(2)} disabled={!canContinueToStep2}>Continue</Button>
          </CardContent>
        </Card>

        <Card className={step === 2 ? "border-green-500/30" : ""}>
          <CardHeader>
            <CardTitle>Step 2: Choose duration, date and time</CardTitle>
            <CardDescription>Availability updates live based on working hours and existing bookings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedTreatment ? (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="duration">Duration</Label>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {selectedTreatment.durations.map((itemDuration) => (
                      <button
                        key={itemDuration}
                        type="button"
                        onClick={() => setDuration(itemDuration)}
                        className={`rounded-full border px-4 py-2 text-sm transition ${duration === itemDuration ? "border-green-500 bg-green-500 text-white" : "border-gray-700 bg-gray-950 text-gray-300 hover:border-gray-500"}`}
                      >
                        {itemDuration} mins · {formatCurrency(getTreatmentPrice(selectedTreatment, itemDuration))}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label htmlFor="date">Preferred date</Label>
                    <Input id="date" type="date" min={getMinDate()} value={date} onChange={(event) => setDate(event.target.value)} className="mt-3" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">Available slots</p>
                    <div className="mt-3 rounded-2xl border border-gray-800 bg-gray-950/50 p-4">
                      {loadingSlots ? (
                        <p className="text-sm text-gray-400">Loading slots...</p>
                      ) : !date || !duration ? (
                        <p className="text-sm text-gray-400">Select a duration and date to see available times.</p>
                      ) : slots.length === 0 ? (
                        <p className="text-sm text-gray-400">No available slots for this date.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {slots.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setStartTime(slot)}
                              className={`rounded-full border px-4 py-2 text-sm transition ${startTime === slot ? "border-green-500 bg-green-500 text-white" : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"}`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={() => setStep(3)} disabled={!canContinueToStep3}>Continue</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Choose a treatment in step 1 to continue.</p>
            )}
          </CardContent>
        </Card>

        <Card className={step === 3 ? "border-green-500/30" : ""}>
          <CardHeader>
            <CardTitle>Step 3: Your details</CardTitle>
            <CardDescription>Tell Josh how to reach you and any useful context for the session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={clientName} onChange={(event) => setClientName(event.target.value)} className="mt-2" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} className="mt-2" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} className="mt-2" />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2 min-h-[80px]" placeholder="Any injuries, training load, target event or areas to focus on?" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => setStep(4)} disabled={!canContinueToStep4}>Continue</Button>
            </div>
          </CardContent>
        </Card>

        <Card className={step === 4 ? "border-green-500/30" : ""}>
          <CardHeader>
            <CardTitle>Step 4: Confirm your booking</CardTitle>
            <CardDescription>Review your details before sending the booking request.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedTreatment && duration ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-gray-800 bg-gray-950/60 p-5">
                  <p className="text-sm text-gray-400">Treatment</p>
                  <p className="mt-2 text-lg font-semibold text-white">{selectedTreatment.name}</p>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-gray-950/60 p-5">
                  <p className="text-sm text-gray-400">Session time</p>
                  <p className="mt-2 text-lg font-semibold text-white">{date} at {startTime}</p>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-gray-950/60 p-5">
                  <p className="text-sm text-gray-400">Duration</p>
                  <p className="mt-2 text-lg font-semibold text-white">{duration} minutes</p>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-gray-950/60 p-5">
                  <p className="text-sm text-gray-400">Price</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(totalPrice)}</p>
                </div>
              </div>
            ) : null}

            {success ? (
              <div className="rounded-2xl border border-green-500/40 bg-green-500/10 p-5 text-green-100">
                <p className="font-semibold">Booking request submitted.</p>
                <p className="mt-2 text-sm text-green-100/80">Josh can now review the request and confirm the session.</p>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="secondary" onClick={() => setStep(3)} disabled={submitting || success}>Back</Button>
              <Button onClick={submitBooking} disabled={submitting || success}>
                {submitting ? "Submitting..." : "Submit booking request"}
              </Button>
              <Button variant="outline" disabled>
                Proceed to Payment (coming soon)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
