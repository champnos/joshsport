"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Availability {
  day_of_week: number;
  is_working: boolean;
  start_time: string | null;
  end_time: string | null;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function AvailabilitySettings() {
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    try {
      const res = await fetch("/api/availability?admin=true", {
        headers: {
          "X-Admin-Token": localStorage.getItem("adminToken") || "",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      
      // Ensure all 7 days are present
      const fullWeek: Availability[] = [];
      for (let i = 0; i < 7; i++) {
        const existing = data.find((a: Availability) => a.day_of_week === i);
        fullWeek.push(
          existing || { day_of_week: i, is_working: false, start_time: null, end_time: null }
        );
      }
      setAvailability(fullWeek);
    } catch (err) {
      console.error(err);
      alert("Failed to load availability");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (dayIndex: number) => {
    setAvailability((prev) =>
      prev.map((a) =>
        a.day_of_week === dayIndex
          ? { ...a, is_working: !a.is_working }
          : a
      )
    );
  };

  const handleTimeChange = (dayIndex: number, field: "start_time" | "end_time", value: string) => {
    setAvailability((prev) =>
      prev.map((a) =>
        a.day_of_week === dayIndex
          ? { ...a, [field]: value }
          : a
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const avail of availability) {
        const res = await fetch("/api/availability", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Token": localStorage.getItem("adminToken") || "",
          },
          body: JSON.stringify(avail),
        });
        if (!res.ok) throw new Error("Failed to save");
      }
      alert("Availability updated successfully!");
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to save availability");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-center py-10 text-gray-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brand-blue mb-2">Working Hours</h2>
        <p className="text-gray-600 text-sm mb-6">Set your availability for each day of the week. Bookings are limited to 30 days in advance.</p>
      </div>

      <div className="space-y-4">
        {availability.map((avail) => (
          <div key={avail.day_of_week} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between gap-4">
              <label className="flex items-center gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={avail.is_working}
                  onChange={() => handleToggle(avail.day_of_week)}
                  className="w-5 h-5 rounded border-gray-300 cursor-pointer"
                />
                <span className="font-medium text-brand-blue w-24">{DAYS[avail.day_of_week]}</span>
              </label>

              {avail.is_working && (
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={avail.start_time || "09:00"}
                      onChange={(e) =>
                        handleTimeChange(avail.day_of_week, "start_time", e.target.value)
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">End Time</label>
                    <input
                      type="time"
                      value={avail.end_time || "17:00"}
                      onChange={(e) =>
                        handleTimeChange(avail.day_of_week, "end_time", e.target.value)
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}

              {!avail.is_working && (
                <span className="text-gray-500 text-sm italic">Not working</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4 pt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand-gold text-brand-blue font-bold px-6 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          onClick={() => fetchAvailability()}
          disabled={saving}
          className="border border-gray-300 text-gray-700 font-medium px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <p className="text-sm text-gray-600">
          <strong>Note:</strong> After each booking, the next 30 minutes will automatically be blocked to allow travel time.
        </p>
      </div>
    </div>
  );
}
