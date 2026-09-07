"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";

interface DurationOption {
  mins: number;
  price: number;
}

interface TreatmentOption {
  id: string;
  name: string;
  description: string;
  durations: DurationOption[];
}

const MEDICAL_CONDITIONS_FALLBACK = [
  "Heart conditions",
  "High or low blood pressure",
  "Diabetes",
  "Epilepsy",
  "Asthma",
  "Cancer (current or past)",
  "Blood disorders",
  "Skin conditions",
  "Varicose veins",
  "Pregnancy or postnatal",
  "Neurological conditions",
  "Other",
  "None of the above",
];

function getMinDate() {
  return new Date().toISOString().split("T")[0];
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")}${period}`;
}

const STEPS = ["Treatment", "Date & Time", "Your Details", "Emergency Contact", "Medical History", "Injury History", "Confirm & Pay"];

const inputStyle = { color: "#1f2937 !important" } as React.CSSProperties;

function BookingInner() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [treatments, setTreatments] = useState<TreatmentOption[]>([]);
  const [treatmentsLoading, setTreatmentsLoading] = useState(true);

  const [treatmentId, setTreatmentId] = useState(searchParams.get("treatment") ?? "");
  const [duration, setDuration] = useState<number | null>(null);

  const [bookingWindowDays, setBookingWindowDays] = useState(30);
  const [workingDates, setWorkingDates] = useState<Set<string>>(new Set());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientDob, setClientDob] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientPostcode, setClientPostcode] = useState("");

  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  const [medicalConditions, setMedicalConditions] = useState<string[]>([]);
  const [medicalNotes, setMedicalNotes] = useState("");

  const [injuryRecent, setInjuryRecent] = useState<boolean | null>(null);
  const [injuryRecentNotes, setInjuryRecentNotes] = useState("");
  const [injuryPrevious, setInjuryPrevious] = useState<boolean | null>(null);
  const [injuryPreviousNotes, setInjuryPreviousNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [bookingRef, setBookingRef] = useState("");

  // Load treatments, settings, and working dates on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load treatments
        const treatmentsRes = await fetch("/api/treatments");
        if (treatmentsRes.ok) {
          const treatmentsData = await treatmentsRes.json();
          setTreatments(treatmentsData);
        }

        // Load booking window settings
        const settingsRes = await fetch("/api/admin/settings");
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setBookingWindowDays(settingsData.booking_window_days || 30);
        }

        // Load working dates
        const datesRes = await fetch("/api/working-dates");
        if (datesRes.ok) {
          const datesData = await datesRes.json();
          setWorkingDates(new Set(datesData.dates || []));
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setTreatmentsLoading(false);
      }
    };
    loadData();
  }, []);

  const selectedTreatment = treatments.find((t) => t.id === treatmentId);
  const selectedPrice = selectedTreatment?.durations.find((d) => d.mins === duration)?.price || 0;

  useEffect(() => {
    if (selectedTreatment && selectedTreatment.durations.length === 1) {
      setDuration(selectedTreatment.durations[0].mins);
    } else {
      setDuration(null);
    }
  }, [selectedTreatment]);

  const loadSlots = useCallback(async () => {
    if (!date || !duration) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    try {
      const res = await fetch(`/api/availability?date=${date}&duration=${duration}`);
      const data = await res.json();
      setSlots(data.slots ?? []);
      setStartTime("");
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [date, duration]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const toggleCondition = (cond: string) => {
    setMedicalConditions((prev) => {
      if (cond === "None of the above") {
        return prev.includes(cond) ? [] : ["None of the above"];
      }
      const filtered = prev.filter((c) => c !== "None of the above");
      return filtered.includes(cond) ? filtered.filter((c) => c !== cond) : [...filtered, cond];
    });
  };

  const hasNonNoneConditions = medicalConditions.some((c) => c !== "None of the above");

  const handlePayment = async () => {
    if (!selectedTreatment || !duration) return;
    setSubmitting(true);
    setError("");
    try {
      // Create booking first
      const bookingPayload = {
        treatment_id: treatmentId,
        treatment_name: selectedTreatment.name,
        duration_mins: duration,
        date,
        start_time: startTime,
        client_name: clientName,
        client_dob: clientDob,
        client_phone: clientPhone,
        client_address: clientAddress,
        client_postcode: clientPostcode,
        emergency_name: emergencyName,
        emergency_relationship: emergencyRelationship,
        emergency_phone: emergencyPhone,
        medical_conditions: medicalConditions,
        medical_notes: medicalNotes,
        injury_recent: injuryRecent ?? false,
        injury_recent_notes: injuryRecentNotes,
        injury_previous: injuryPrevious ?? false,
        injury_previous_notes: injuryPreviousNotes,
      };

      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload),
      });

      const bookingData = await bookingRes.json();
      if (!bookingRes.ok) {
        setError(bookingData.error ?? "Unable to create booking. Please try again.");
        setSubmitting(false);
        return;
      }

      setBookingRef(bookingData.id ?? "confirmed");

      // Now redirect to Stripe checkout
      const checkoutRes = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: selectedPrice,
          treatment_name: selectedTreatment.name,
          duration_mins: duration,
          date,
          start_time: startTime,
          booking_id: bookingData.id,
        }),
      });

      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) {
        setError(checkoutData.error ?? "Failed to initiate payment. Please try again.");
        setSubmitting(false);
        return;
      }

      // Redirect to Stripe
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      if (stripe && checkoutData.sessionId) {
        await stripe.redirectToCheckout({ sessionId: checkoutData.sessionId });
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError("Unable to process payment. Please try again.");
      setSubmitting(false);
    }
  };

  // Calendar helper functions
  const getDaysInMonth = (d: Date) => {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (d: Date) => {
    return new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  };

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const isDateInBookingWindow = (dateStr: string) => {
    const minDate = new Date(getMinDate());
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + bookingWindowDays);
    const checkDate = new Date(dateStr + "T00:00:00Z");
    return checkDate >= minDate && checkDate <= maxDate;
  };

  const isDateSelectable = (dateStr: string) => {
    return workingDates.has(dateStr) && isDateInBookingWindow(dateStr);
  };

  const handleDateSelect = (dateStr: string) => {
    if (isDateSelectable(dateStr)) {
      setDate(dateStr);
    }
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(year, month, day);
      const selectable = isDateSelectable(dateStr);
      const selected = date === dateStr;

      days.push(
        <button
          key={day}
          onClick={() => handleDateSelect(dateStr)}
          disabled={!selectable}
          className={`p-3 text-center rounded-lg font-medium text-sm transition-colors ${
            selected
              ? "bg-brand-gold text-brand-blue border-2 border-brand-gold"
              : selectable
                ? "bg-white border-2 border-gray-200 text-brand-blue hover:border-brand-gold cursor-pointer"
                : "bg-gray-100 text-gray-400 border-2 border-gray-100 cursor-not-allowed"
          }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const monthName = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-brand-blue py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-extrabold text-white">Book Now</h1>
          <p className="mt-2 text-brand-gold">Book a tailored sports massage session</p>
          <p className="mt-1 text-white/70 text-sm">Choose your treatment, find a suitable time slot and be booked in minutes.</p>
        </div>
      </div>

      <div className="bg-brand-blue/5 border-b border-brand-blue/10 px-4 py-4">
        <div className="mx-auto max-w-3xl flex flex-wrap items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i + 1 < step ? "bg-green-500 text-white" : i + 1 === step ? "bg-brand-blue text-white" : "bg-gray-200 text-gray-500"}`}>
                {i + 1 < step ? "✓" : i + 1}
              </div>
              <span className={`text-xs ${i + 1 === step ? "text-brand-blue font-semibold" : "text-gray-400"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="h-px w-2 bg-gray-200" />}
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {error && <div className="mb-6 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>}

        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-brand-blue mb-6">Select Treatment</h2>
            {treatmentsLoading && <p className="text-gray-500">Loading treatments...</p>}
            {!treatmentsLoading && treatments.length === 0 && <p className="text-gray-500">No treatments available.</p>}
            {!treatmentsLoading && treatments.length > 0 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {treatments.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTreatmentId(t.id)}
                      className={`text-left rounded-2xl border-2 p-5 transition-all ${treatmentId === t.id ? "border-brand-gold bg-brand-gold/5" : "border-gray-200 hover:border-brand-blue/30"}`}
                    >
                      <h3 className="font-bold text-brand-blue">{t.name}</h3>
                      <p className="mt-1 text-sm text-gray-600">{t.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {t.durations.map((d) => (
                          <span key={d.mins} className="text-xs bg-brand-blue/5 text-brand-blue rounded-full px-2 py-1">{d.mins}m · £{d.price}</span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
                {selectedTreatment && selectedTreatment.durations.length > 1 && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-brand-blue mb-3">Select Duration</h3>
                    <div className="flex flex-wrap gap-3">
                      {selectedTreatment.durations.map((d) => (
                        <button
                          key={d.mins}
                          onClick={() => setDuration(d.mins)}
                          className={`px-5 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${duration === d.mins ? "border-brand-gold bg-brand-gold text-brand-blue" : "border-gray-200 text-gray-600 hover:border-brand-blue"}`}
                        >
                          {d.mins} mins · £{d.price}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    disabled={!selectedTreatment || !duration}
                    className="flex items-center gap-2 bg-brand-blue text-white font-bold px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-brand-blue mb-6">Select Date & Time</h2>
            
            {/* Calendar */}
            <div className="mb-6 bg-white border-2 border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  ← Previous
                </button>
                <h3 className="text-lg font-bold text-brand-blue">{monthName}</h3>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Next →
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="p-2 text-center text-xs font-bold text-gray-500">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-2">{renderCalendar()}</div>
            </div>

            {date && (
              <div>
                {loadingSlots && <p className="text-sm text-gray-500">Loading available slots…</p>}
                {!loadingSlots && slots.length === 0 && <p className="text-sm text-gray-500">No available slots for this date.</p>}
                {!loadingSlots && slots.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-brand-blue mb-3">Available slots for {date}</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {slots.map((s) => (
                        <button
                          key={s}
                          onClick={() => setStartTime(s)}
                          className={`py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${startTime === s ? "bg-brand-gold border-brand-gold text-brand-blue" : "border-gray-200 text-gray-600 hover:border-brand-blue"}`}
                        >
                          {formatTime(s)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 flex justify-between">
              <button onClick={() => setStep(1)} className="flex items-center gap-2 text-gray-600 hover:text-brand-blue font-medium">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!date || !startTime}
                className="flex items-center gap-2 bg-brand-blue text-white font-bold px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-brand-blue mb-2">Your Details</h2>
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
              Remember, the massage visit is at your home/selected location, please make sure all details are correct.
            </p>
            <div className="space-y-4">
              {[
                { label: "Full Name", value: clientName, setter: setClientName, type: "text", placeholder: "Your full name" },
                { label: "Date of Birth", value: clientDob, setter: setClientDob, type: "date", placeholder: "" },
                { label: "Phone Number", value: clientPhone, setter: setClientPhone, type: "tel", placeholder: "07..." },
                { label: "Home Address", value: clientAddress, setter: setClientAddress, type: "text", placeholder: "Street address" },
                { label: "Postcode", value: clientPostcode, setter: setClientPostcode, type: "text", placeholder: "BS1 1AA" },
              ].map(({ label, value, setter, type, placeholder }) => (
                <div key={label}>
                  <label className="block text-sm font-semibold text-brand-blue mb-1">{label}</label>
                  <input
                    type={type}
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder={placeholder}
                    style={inputStyle}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-brand-blue focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="mt-8 flex justify-between">
              <button onClick={() => setStep(2)} className="flex items-center gap-2 text-gray-600 hover:text-brand-blue font-medium">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!clientName || !clientDob || !clientPhone || !clientAddress || !clientPostcode}
                className="flex items-center gap-2 bg-brand-blue text-white font-bold px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-brand-blue mb-6">Emergency Contact</h2>
            <div className="space-y-4">
              {[
                { label: "Contact Name", value: emergencyName, setter: setEmergencyName, placeholder: "Full name" },
                { label: "Contact Relationship", value: emergencyRelationship, setter: setEmergencyRelationship, placeholder: "e.g. Partner, Parent" },
                { label: "Contact Phone Number", value: emergencyPhone, setter: setEmergencyPhone, placeholder: "07..." },
              ].map(({ label, value, setter, placeholder }) => (
                <div key={label}>
                  <label className="block text-sm font-semibold text-brand-blue mb-1">{label}</label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder={placeholder}
                    style={inputStyle}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-brand-blue focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="mt-8 flex justify-between">
              <button onClick={() => setStep(3)} className="flex items-center gap-2 text-gray-600 hover:text-brand-blue font-medium">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => setStep(5)}
                disabled={!emergencyName || !emergencyPhone}
                className="flex items-center gap-2 bg-brand-blue text-white font-bold px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 className="text-2xl font-bold text-brand-blue mb-2">Medical History</h2>
            <p className="text-sm text-gray-600 mb-6">Please tick if you have any of the following:</p>
            <div className="space-y-3">
              {MEDICAL_CONDITIONS_FALLBACK.map((cond) => (
                <label key={cond} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={medicalConditions.includes(cond)}
                    onChange={() => toggleCondition(cond)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-gold accent-brand-gold"
                  />
                  <span className="text-sm text-gray-700">{cond}</span>
                </label>
              ))}
            </div>
            {hasNonNoneConditions && (
              <div className="mt-6">
                <label className="block text-sm font-semibold text-brand-blue mb-2">Please provide details of your condition(s)</label>
                <textarea
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  rows={4}
                  placeholder="Describe your conditions..."
                  style={inputStyle}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-brand-blue focus:outline-none"
                />
              </div>
            )}
            <div className="mt-8 flex justify-between">
              <button onClick={() => setStep(4)} className="flex items-center gap-2 text-gray-600 hover:text-brand-blue font-medium">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => setStep(6)}
                disabled={medicalConditions.length === 0}
                className="flex items-center gap-2 bg-brand-blue text-white font-bold px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <h2 className="text-2xl font-bold text-brand-blue mb-6">Injury History</h2>
            <div className="space-y-8">
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-3">Have you had a recent injury or surgery within the last 12 months?</p>
                <div className="flex gap-4">
                  {["Yes", "No"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setInjuryRecent(opt === "Yes")}
                      className={`px-6 py-2.5 rounded-lg border-2 font-semibold text-sm transition-all ${injuryRecent === (opt === "Yes") && injuryRecent !== null ? "border-brand-gold bg-brand-gold text-brand-blue" : "border-gray-200 text-gray-600 hover:border-brand-blue"}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {injuryRecent === true && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Please describe the area, date of occurrence and current symptoms</label>
                    <textarea
                      value={injuryRecentNotes}
                      onChange={(e) => setInjuryRecentNotes(e.target.value)}
                      rows={3}
                      placeholder="Describe injury/surgery..."
                      style={inputStyle}
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-brand-blue focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-800 mb-3">Are there any previous injuries that still affect you now?</p>
                <div className="flex gap-4">
                  {["Yes", "No"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setInjuryPrevious(opt === "Yes")}
                      className={`px-6 py-2.5 rounded-lg border-2 font-semibold text-sm transition-all ${injuryPrevious === (opt === "Yes") && injuryPrevious !== null ? "border-brand-gold bg-brand-gold text-brand-blue" : "border-gray-200 text-gray-600 hover:border-brand-blue"}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {injuryPrevious === true && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Please describe</label>
                    <textarea
                      value={injuryPreviousNotes}
                      onChange={(e) => setInjuryPreviousNotes(e.target.value)}
                      rows={3}
                      placeholder="Describe previous injuries..."
                      style={inputStyle}
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-brand-blue focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button onClick={() => setStep(5)} className="flex items-center gap-2 text-gray-600 hover:text-brand-blue font-medium">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => setStep(7)}
                disabled={injuryRecent === null || injuryPrevious === null}
                className="flex items-center gap-2 bg-brand-blue text-white font-bold px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 7 && selectedTreatment && duration && (
          <div>
            <h2 className="text-2xl font-bold text-brand-blue mb-6">Confirm & Pay</h2>
            <div className="bg-brand-blue/5 border border-brand-blue/15 rounded-2xl p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Treatment</span>
                <span className="font-semibold text-brand-blue">{selectedTreatment.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Duration</span>
                <span className="font-semibold text-brand-blue">{duration} mins</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Price</span>
                <span className="font-bold text-brand-gold text-base">£{selectedPrice}</span>
              </div>
              <hr className="border-brand-blue/10" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Date</span>
                <span className="font-semibold text-brand-blue">{date}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Time</span>
                <span className="font-semibold text-brand-blue">{formatTime(startTime)}</span>
              </div>
              <hr className="border-brand-blue/10" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Name</span>
                <span className="font-semibold text-brand-blue">{clientName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Address</span>
                <span className="font-semibold text-brand-blue text-right">{clientAddress}, {clientPostcode}</span>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={submitting}
              className="mt-6 w-full bg-brand-gold text-brand-blue font-extrabold text-lg py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? "Processing Payment…" : `Pay £${selectedPrice} & Confirm Booking`}
            </button>

            <div className="mt-6 flex justify-start">
              <button onClick={() => setStep(6)} className="flex items-center gap-2 text-gray-600 hover:text-brand-blue font-medium">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-brand-blue">Loading...</div>}>
      <BookingInner />
    </Suspense>
  );
}
