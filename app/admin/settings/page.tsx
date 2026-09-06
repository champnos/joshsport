"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Availability {
  day_of_week: number;
  is_working: boolean;
  start_time: string | null;
  end_time: string | null;
}

interface Settings {
  booking_window_days: number;
  buffer_mins_after_booking: number;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function SettingsPage() {
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [settings, setSettings] = useState<Settings>({
    booking_window_days: 30,
    buffer_mins_after_booking: 30,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const password = localStorage.getItem("adminToken") || "";

      // Fetch availability
      const availRes = await fetch("/api/availability?admin=true", {
        headers: {
          "x-admin-password": password,
        },
      });
      if (availRes.ok) {
        const availData = await availRes.json();
        const fullWeek: Availability[] = [];
        for (let i = 0; i < 7; i++) {
          const existing = availData.find((a: Availability) => a.day_of_week === i);
          fullWeek.push(
            existing || { day_of_week: i, is_working: false, start_time: null, end_time: null }
          );
        }
        setAvailability(fullWeek);
      }

      // Fetch booking settings
      const settingsRes = await fetch("/api/admin/settings", {
        headers: {
          "x-admin-password": password,
        },
      });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }
    } catch (err) {
      console.error(err);
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

  const handleSettingChange = (field: keyof Settings, value: number) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const password = localStorage.getItem("adminToken") || "";

      // Save availability
      for (const avail of availability) {
        const res = await fetch("/api/availability", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-password": password,
          },
          body: JSON.stringify(avail),
        });
        if (!res.ok) throw new Error("Failed to save availability");
      }

      // Save booking settings
      const settingsRes = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify(settings),
      });
      if (!settingsRes.ok) throw new Error("Failed to save settings");

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
    <div className="max-w-4xl space-y-8">
      {/* Working Hours Section */}
      <div>
        <h2 className="text-2xl font-bold text-brand-blue mb-2">Working Hours</h2>
        <p className="text-gray-600 text-sm mb-6">Set your availability for each day of the week.</p>

        <div className="space-y-4">
          {availability.map((avail) => (
            <div key={avail.day_of_week} className="bg-white border border-gray-200 rounded-lg p-4">
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
      </div>

      {/* Booking Settings Section */}
      <div className="border-t border-gray-200 pt-8">
        <h2 className="text-2xl font-bold text-brand-blue mb-2">Booking Settings</h2>
        <p className="text-gray-600 text-sm mb-6">Configure booking window and buffer time between appointments.</p>

        <div className="space-y-6 bg-white border border-gray-200 rounded-lg p-6">
          {/* Booking Window */}
          <div>
            <label className="block text-sm font-medium text-brand-blue mb-2">
              Booking Window (days in advance)
            </label>
            <p className="text-xs text-gray-600 mb-3">
              Clients can book up to this many days in advance.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="7"
                max="90"
                step="1"
                value={settings.booking_window_days}
                onChange={(e) => handleSettingChange("booking_window_days", Number(e.target.value))}
                className="flex-1 cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="7"
                  max="90"
                  value={settings.booking_window_days}
                  onChange={(e) => handleSettingChange("booking_window_days", Number(e.target.value))}
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
              Time to block after each appointment ends to allow for travel.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="120"
                step="5"
                value={settings.buffer_mins_after_booking}
                onChange={(e) => handleSettingChange("buffer_mins_after_booking", Number(e.target.value))}
                className="flex-1 cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="120"
                  step="5"
                  value={settings.buffer_mins_after_booking}
                  onChange={(e) => handleSettingChange("buffer_mins_after_booking", Number(e.target.value))}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-sm text-gray-600">mins</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">0 to 120 minutes</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <p className="text-sm text-gray-700">
            <strong>Example:</strong> If a client books a 45-minute massage at 9:30 AM (ending at 10:15 AM), 
            and buffer is set to 30 minutes, the next available slot will be 10:45 AM.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-4 pt-6 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand-gold text-brand-blue font-bold px-8 py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save All Settings"}
        </button>
        <button
          onClick={() => fetchData()}
          disabled={saving}
          className="border border-gray-300 text-gray-700 font-medium px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
