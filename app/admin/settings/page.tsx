"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Settings {
  booking_window_days: number;
  buffer_mins_after_booking: number;
  default_start_time: string;
  default_end_time: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  email?: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    booking_window_days: 30,
    buffer_mins_after_booking: 30,
    default_start_time: "09:00",
    default_end_time: "17:00",
    instagram: "",
    facebook: "",
    tiktok: "",
    email: "",
  });
  const [workingDates, setWorkingDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const password = localStorage.getItem("adminToken") || "";

      // Fetch booking settings
      const settingsRes = await fetch("/api/admin/settings", {
        headers: {
          "x-admin-password": password,
        },
      });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings((prev) => ({ ...prev, ...settingsData }));
      }

      // Fetch social settings
      const socialRes = await fetch("/api/admin/settings/social", {
        headers: {
          "x-admin-password": password,
        },
      });
      if (socialRes.ok) {
        const socialData = await socialRes.json();
        setSettings((prev) => ({ ...prev, ...socialData }));
      }

      // Fetch working dates
      const datesRes = await fetch("/api/working-dates", {
        headers: {
          "x-admin-password": password,
        },
      });
      if (datesRes.ok) {
        const datesData = await datesRes.json();
        setWorkingDates(new Set(datesData.dates || []));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (field: keyof Settings, value: string | number) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const toggleDate = (dateStr: string) => {
    const newDates = new Set(workingDates);
    if (newDates.has(dateStr)) {
      newDates.delete(dateStr);
    } else {
      newDates.add(dateStr);
    }
    setWorkingDates(newDates);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const password = localStorage.getItem("adminToken") || "";

      // Save booking settings
      const settingsRes = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          booking_window_days: settings.booking_window_days,
          buffer_mins_after_booking: settings.buffer_mins_after_booking,
          default_start_time: settings.default_start_time,
          default_end_time: settings.default_end_time,
        }),
      });
      if (!settingsRes.ok) throw new Error("Failed to save settings");

      // Save social settings
      const socialRes = await fetch("/api/admin/settings/social", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          instagram: settings.instagram,
          facebook: settings.facebook,
          tiktok: settings.tiktok,
          email: settings.email,
        }),
      });
      if (!socialRes.ok) throw new Error("Failed to save social settings");

      // Save working dates
      const datesRes = await fetch("/api/working-dates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ dates: Array.from(workingDates) }),
      });
      if (!datesRes.ok) throw new Error("Failed to save working dates");

      alert("Settings updated successfully!");
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
      const isWorking = workingDates.has(dateStr);
      days.push(
        <button
          key={day}
          onClick={() => toggleDate(dateStr)}
          className={`p-3 text-center rounded-lg font-medium text-sm transition-colors ${
            isWorking
              ? "bg-brand-gold text-brand-blue"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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

  if (loading) return <p className="text-center py-10 text-gray-500">Loading...</p>;

  return (
    <div className="max-w-4xl space-y-8">
      {/* Social Links Section */}
      <div>
        <h2 className="text-2xl font-bold text-brand-blue mb-2">Social Links & Contact</h2>
        <p className="text-gray-600 text-sm mb-6">Update your social media links and contact email that appear throughout the site.</p>

        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-brand-blue mb-2">
              📧 Contact Email
            </label>
            <input
              type="email"
              value={settings.email || ""}
              onChange={(e) => handleSettingChange("email", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-brand-blue focus:outline-none placeholder-gray-500"
              placeholder="contact@maggsymassagetherapy.com"
            />
          </div>

          {/* Instagram */}
          <div>
            <label className="block text-sm font-medium text-brand-blue mb-2">
              📸 Instagram
            </label>
            <input
              type="text"
              value={settings.instagram || ""}
              onChange={(e) => handleSettingChange("instagram", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-brand-blue focus:outline-none placeholder-gray-500"
              placeholder="https://instagram.com/maggsymt"
            />
          </div>

          {/* Facebook */}
          <div>
            <label className="block text-sm font-medium text-brand-blue mb-2">
              👥 Facebook
            </label>
            <input
              type="text"
              value={settings.facebook || ""}
              onChange={(e) => handleSettingChange("facebook", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-brand-blue focus:outline-none placeholder-gray-500"
              placeholder="https://facebook.com/..."
            />
          </div>

          {/* TikTok */}
          <div>
            <label className="block text-sm font-medium text-brand-blue mb-2">
              🎵 TikTok
            </label>
            <input
              type="text"
              value={settings.tiktok || ""}
              onChange={(e) => handleSettingChange("tiktok", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-brand-blue focus:outline-none placeholder-gray-500"
              placeholder="https://tiktok.com/..."
            />
          </div>
        </div>
      </div>

      {/* Working Dates Calendar */}
      <div>
        <h2 className="text-2xl font-bold text-brand-blue mb-2">Select Your Working Dates</h2>
        <p className="text-gray-600 text-sm mb-6">Click on dates in the calendar to mark when you&apos;re available. This overrides day-of-week settings.</p>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              ← Previous
            </button>
            <h3 className="text-lg font-bold text-brand-blue">{monthName}</h3>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
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

        <p className="text-xs text-gray-500 mt-2">
          {workingDates.size} date(s) selected
        </p>
      </div>

      {/* Working Hours Section */}
      <div className="border-t border-gray-200 pt-8">
        <h2 className="text-2xl font-bold text-brand-blue mb-2">Default Working Hours</h2>
        <p className="text-gray-600 text-sm mb-6">Set your default working hours for selected dates.</p>

        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-brand-blue mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={settings.default_start_time}
                onChange={(e) => handleSettingChange("default_start_time", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-brand-blue mb-2">
                End Time
              </label>
              <input
                type="time"
                value={settings.default_end_time}
                onChange={(e) => handleSettingChange("default_end_time", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
              />
            </div>
          </div>
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
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
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
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
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
