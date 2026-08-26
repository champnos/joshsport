"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Booking, Treatment, TreatmentDuration } from "@/lib/types";

interface TreatmentFormState {
  id?: string;
  name: string;
  description: string;
  durations: TreatmentDuration[];
  active: boolean;
}

const emptyForm: TreatmentFormState = {
  name: "",
  description: "",
  durations: [{ mins: 30, price: 25 }],
  active: true,
};

function getStatusColor(status: string) {
  if (status === "confirmed") return "bg-green-100 text-green-800";
  if (status === "cancelled") return "bg-red-100 text-red-800";
  return "bg-yellow-100 text-yellow-800";
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<"bookings" | "treatments">("bookings");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingTreatment, setSavingTreatment] = useState(false);
  const [treatmentError, setTreatmentError] = useState("");
  const [editingTreatmentId, setEditingTreatmentId] = useState<string | null>(null);
  const [form, setForm] = useState<TreatmentFormState>(emptyForm);

  const headers = useMemo(
    () => ({ "x-admin-password": password, "Content-Type": "application/json" }),
    [password],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [bRes, tRes] = await Promise.all([
        fetch("/api/bookings", { headers }),
        fetch("/api/treatments"),
      ]);

      if (!bRes.ok) {
        const bookingError = await bRes.json().catch(() => null);
        throw new Error(bookingError?.error ?? "Failed to load bookings.");
      }

      if (!tRes.ok) {
        const treatmentError = await tRes.json().catch(() => null);
        throw new Error(treatmentError?.error ?? "Failed to load treatments.");
      }

      setBookings(await bRes.json());
      setTreatments(await tRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    if (isAuthed) {
      void loadData();
    }
  }, [isAuthed, loadData]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingTreatmentId(null);
    setTreatmentError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setIsAuthed(true);
      setAuthError("");
    } else {
      setAuthError("Incorrect password.");
    }
  };

  const updateBookingStatus = async (id: string, status: Booking["status"]) => {
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    }
  };

  const toggleTreatmentActive = async (treatment: Treatment) => {
    const res = await fetch(`/api/treatments/${treatment.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ active: !treatment.active }),
    });
    if (res.ok) {
      const updated = (await res.json()) as Treatment;
      setTreatments((prev) => prev.map((item) => (item.id === treatment.id ? updated : item)));
    }
  };

  const startEdit = (treatment: Treatment) => {
    setEditingTreatmentId(treatment.id);
    setTreatmentError("");
    setForm({
      id: treatment.id,
      name: treatment.name,
      description: treatment.description,
      durations: treatment.durations.length > 0 ? treatment.durations : [{ mins: 30, price: 25 }],
      active: treatment.active,
    });
    setActiveTab("treatments");
  };

  const updateDuration = (index: number, field: keyof TreatmentDuration, value: number) => {
    setForm((prev) => ({
      ...prev,
      durations: prev.durations.map((duration, durationIndex) => (
        durationIndex === index ? { ...duration, [field]: value } : duration
      )),
    }));
  };

  const addDuration = () => {
    setForm((prev) => ({
      ...prev,
      durations: [...prev.durations, { mins: 30, price: 25 }],
    }));
  };

  const removeDuration = (index: number) => {
    setForm((prev) => ({
      ...prev,
      durations: prev.durations.filter((_, durationIndex) => durationIndex !== index),
    }));
  };

  const saveTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    setTreatmentError("");

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      active: form.active,
      durations: form.durations.filter((duration) => duration.mins > 0 && duration.price > 0),
    };

    if (!payload.name || payload.durations.length === 0) {
      setTreatmentError("Add a name and at least one valid duration.");
      return;
    }

    setSavingTreatment(true);
    try {
      const res = await fetch(editingTreatmentId ? `/api/treatments/${editingTreatmentId}` : "/api/treatments", {
        method: editingTreatmentId ? "PUT" : "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setTreatmentError(data?.error ?? "Unable to save treatment.");
        return;
      }

      const savedTreatment = data as Treatment;
      setTreatments((prev) => (
        editingTreatmentId
          ? prev.map((item) => (item.id === savedTreatment.id ? savedTreatment : item))
          : [...prev, savedTreatment]
      ));
      resetForm();
    } catch {
      setTreatmentError("Unable to save treatment.");
    } finally {
      setSavingTreatment(false);
    }
  };

  const deleteTreatment = async (id: string) => {
    const res = await fetch(`/api/treatments/${id}`, {
      method: "DELETE",
      headers,
    });

    if (res.ok) {
      setTreatments((prev) => prev.filter((treatment) => treatment.id !== id));
      if (editingTreatmentId === id) resetForm();
    }
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-brand-blue flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
          <h1 className="text-2xl font-bold text-brand-blue mb-6">Admin Login</h1>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-brand-blue focus:outline-none mb-4"
            placeholder="Enter admin password"
          />
          {authError && <p className="text-red-600 text-sm mb-3">{authError}</p>}
          <button type="submit" className="w-full bg-brand-blue text-white font-bold py-3 rounded-lg hover:opacity-90">
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-brand-blue py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold text-white">MMT Admin Panel</h1>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex gap-4 mb-8">
          {(["bookings", "treatments"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg font-semibold text-sm capitalize transition-colors ${activeTab === tab ? "bg-brand-blue text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-brand-blue"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}
        {loading && <p className="text-gray-500 text-sm">Loading…</p>}

        {activeTab === "bookings" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-brand-blue">{bookings.length} Booking(s)</h2>
            {bookings.length === 0 && !loading && <p className="text-gray-500 text-sm">No bookings yet.</p>}
            {bookings.map((b) => (
              <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-brand-blue">{b.client_name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getStatusColor(b.status)}`}>{b.status}</span>
                    </div>
                    <p className="text-sm text-gray-600">{b.treatment_name} · {b.duration_mins} mins</p>
                    <p className="text-sm text-gray-600">{b.date} at {b.start_time}</p>
                    <p className="text-sm text-gray-500 mt-1">{b.client_address}, {b.client_postcode}</p>
                    <p className="text-sm text-gray-500">{b.client_phone}</p>
                    {b.medical_conditions.length > 0 && !b.medical_conditions.includes("None of the above") && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-2">
                        ⚠ Medical: {b.medical_conditions.join(", ")}
                        {b.medical_notes && ` — ${b.medical_notes}`}
                      </p>
                    )}
                    {b.injury_recent && (
                      <p className="text-xs text-red-700 bg-red-50 rounded px-2 py-1 mt-1">Recent injury: {b.injury_recent_notes}</p>
                    )}
                    {b.injury_previous && (
                      <p className="text-xs text-orange-700 bg-orange-50 rounded px-2 py-1 mt-1">Previous injuries: {b.injury_previous_notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(["pending", "confirmed", "cancelled"] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => void updateBookingStatus(b.id, status)}
                        disabled={b.status === status}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-colors ${b.status === status ? "bg-brand-blue text-white border-brand-blue" : "border-gray-200 text-gray-600 hover:border-brand-blue"}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "treatments" && (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_1fr]">
            <form onSubmit={saveTreatment} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4 h-fit">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-brand-blue">{editingTreatmentId ? "Edit treatment" : "Add treatment"}</h2>
                {editingTreatmentId && (
                  <button type="button" onClick={resetForm} className="text-sm text-gray-500 hover:text-brand-blue">
                    Cancel
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-blue mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-brand-blue focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-blue mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-brand-blue focus:outline-none"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <label className="block text-sm font-semibold text-brand-blue">Durations & prices</label>
                  <button type="button" onClick={addDuration} className="text-sm font-semibold text-brand-blue hover:text-brand-gold">
                    + Add row
                  </button>
                </div>
                {form.durations.map((duration, index) => (
                  <div key={`${index}-${duration.mins}-${duration.price}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <input
                      type="number"
                      min="1"
                      value={duration.mins}
                      onChange={(e) => updateDuration(index, "mins", Number(e.target.value))}
                      className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                      placeholder="Minutes"
                    />
                    <input
                      type="number"
                      min="1"
                      value={duration.price}
                      onChange={(e) => updateDuration(index, "price", Number(e.target.value))}
                      className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                      placeholder="Price"
                    />
                    <button
                      type="button"
                      onClick={() => removeDuration(index)}
                      disabled={form.durations.length === 1}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:border-red-300 hover:text-red-600 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 accent-brand-gold"
                />
                Active treatment
              </label>

              {treatmentError && <p className="text-sm text-red-600">{treatmentError}</p>}

              <button type="submit" disabled={savingTreatment} className="w-full bg-brand-blue text-white font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-50">
                {savingTreatment ? "Saving…" : editingTreatmentId ? "Update treatment" : "Create treatment"}
              </button>
            </form>

            <div className="space-y-4">
              <h2 className="text-lg font-bold text-brand-blue">{treatments.length} Treatment(s)</h2>
              {treatments.map((treatment) => (
                <div key={treatment.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-brand-blue">{treatment.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${treatment.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {treatment.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{treatment.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {treatment.durations.map((duration) => (
                        <span key={`${treatment.id}-${duration.mins}`} className="text-xs bg-brand-blue/5 text-brand-blue rounded-full px-2 py-1">
                          {duration.mins}m · £{duration.price}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => startEdit(treatment)}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-gray-200 text-gray-600 hover:border-brand-blue"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleTreatmentActive(treatment)}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-gray-200 text-gray-600 hover:border-brand-blue"
                    >
                      {treatment.active ? "Mark inactive" : "Mark active"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteTreatment(treatment.id)}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
