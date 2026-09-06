"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Settings {
  booking_window_days: number;
  buffer_mins_after_booking: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    booking_window_days: 30,
    buffer_mins_after_booking: 30,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings", {
        headers: {
          "X-Admin-Token": localStorage.getItem("adminToken") || "",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof Settings, value: number) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": localStorage.getItem("adminToken") || "",
        },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save");
      alert("Settings updated successfully!");
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-center py-10 text-gray-500">Loading...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brand-blue mb-2">Booking Settings</h2>
        <p className="text-gray-600 text-sm">Configure booking window and buffer time between appointments.</p>
      </div>

      <div className="space-y-6 bg-white border border-gray-200 rounded-lg p-6">
        {/* Booking Window */}
        <div>
          <label className="block text-sm font-medium text-brand-blue mb-2">
            Booking Window (days in advance)
          </label>
          <p className="text-xs text-gray-600 mb-3">
            Clients can book up to this many days in advance. Default: 30 days.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="7"
              max="90"
              step="1"
              value={settings.booking_window_days}
              onChange={(e) => handleChange("booking_window_days", Number(e.target.value))}
              className="flex-1 cursor-pointer"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="7"
                max="90"
                value={settings.booking_window_days}
                onChange={(e) => handleChange("booking_window_days", Number(e.target.value))}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-sm text-gray-600">days</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Minimum 7 days, maximum 90 days</p>
        </div>

        {/* Buffer Time */}
        <div className="border-t border-gray-200 pt-6">
          <label className="block text-sm font-medium text-brand-blue mb-2">
            Buffer Time After Booking (minutes)
          </label>
          <p className="text-xs text-gray-600 mb-3">
            Time to block after each appointment ends to allow for travel. Default: 30 minutes.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="120"
              step="5"
              value={settings.buffer_mins_after_booking}
              onChange={(e) => handleChange("buffer_mins_after_booking", Number(e.target.value))}
              className="flex-1 cursor-pointer"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="120"
                step="5"
                value={settings.buffer_mins_after_booking}
                onChange={(e) => handleChange("buffer_mins_after_booking", Number(e.target.value))}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-sm text-gray-600">mins</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">0 to 120 minutes</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong>Example:</strong> If a client books a 45-minute massage at 9:30 AM (ending at 10:15 AM), 
          and buffer is set to 30 minutes, the next available slot will be 10:45 AM.
        </p>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand-gold text-brand-blue font-bold px-8 py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        <button
          onClick={() => fetchSettings()}
          disabled={saving}
          className="border border-gray-300 text-gray-700 font-medium px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
