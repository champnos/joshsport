"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Settings {
  booking_window_days: number;
  buffer_mins_after_booking: number;
  default_start_time: string;
  default_end_time: string;
  therapist_postcode: string;
  max_travel_distance_miles: number;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  email?: string;
}

interface DateHours {
  date: string;
  available: boolean;
  start_time: string | null;
  end_time: string | null;
  blocked_slots: string[]; // Array of time ranges like "14:00-15:30"
  booked_slots?: string[];
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    booking_window_days: 30,
    buffer_mins_after_booking: 30,
    default_start_time: "09:00",
    default_end_time: "17:00",
    therapist_postcode: "",
    max_travel_distance_miles: 10,
    instagram: "",
    facebook: "",
    tiktok: "",
    email: "",
  });
  const [workingDates, setWorkingDates] = useState<Set<string>>(new Set());
  const [dateHours, setDateHours] = useState<Map<string, DateHours>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [blockTimeStart, setBlockTimeStart] = useState("");
  const [blockTimeEnd, setBlockTimeEnd] = useState("");
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
        
        // Initialize dateHours map
        const hoursMap = new Map<string, DateHours>();
        if (datesData.hours) {
          datesData.hours.forEach((h: DateHours) => {
            hoursMap.set(h.date, {
              date: h.date,
              available: Boolean(h.available),
              start_time: h.start_time ?? null,
              end_time: h.end_time ?? null,
              blocked_slots: Array.isArray(h.blocked_slots) ? h.blocked_slots : [],
              booked_slots: Array.isArray(h.booked_slots) ? h.booked_slots : [],
            });
          });
        }
        setDateHours(hoursMap);
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

  const createDefaultDateHours = (dateStr: string): DateHours => ({
    date: dateStr,
    available: false,
    start_time: settings.default_start_time,
    end_time: settings.default_end_time,
    blocked_slots: [],
    booked_slots: [],
  });

  const setDateAvailability = (dateStr: string, available: boolean) => {
    setWorkingDates((prev) => {
      const next = new Set(prev);
      if (available) {
        next.add(dateStr);
      } else {
        next.delete(dateStr);
      }
      return next;
    });

    setDateHours((prev) => {
      const next = new Map(prev);
      const current = next.get(dateStr) || createDefaultDateHours(dateStr);
      next.set(dateStr, { ...current, available });
      return next;
    });
  };

  const getDateHours = (dateStr: string): DateHours => {
    return dateHours.get(dateStr) || createDefaultDateHours(dateStr);
  };

  const updateDateHours = (dateStr: string, updates: Partial<DateHours>) => {
    setDateHours((prev) => {
      const next = new Map(prev);
      const current = next.get(dateStr) || createDefaultDateHours(dateStr);
      next.set(dateStr, { ...current, ...updates });
      return next;
    });
  };

  const addBlockedSlot = () => {
    if (!selectedDate || !blockTimeStart || !blockTimeEnd) return;
    if (blockTimeStart >= blockTimeEnd) {
      alert("End time must be after start time");
      return;
    }

    const hours = getDateHours(selectedDate);
    const slot = `${blockTimeStart}-${blockTimeEnd}`;
    // Check if slot already exists to avoid duplicates
    if (!hours.blocked_slots.includes(slot)) {
      updateDateHours(selectedDate, { blocked_slots: [...hours.blocked_slots, slot] });
    }
    setBlockTimeStart("");
    setBlockTimeEnd("");
  };

  const removeBlockedSlot = (slot: string) => {
    if (!selectedDate) return;
    const hours = getDateHours(selectedDate);
    const newSlots = hours.blocked_slots.filter((s) => s !== slot);
    updateDateHours(selectedDate, { blocked_slots: newSlots });
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
          therapist_postcode: settings.therapist_postcode,
          max_travel_distance_miles: settings.max_travel_distance_miles,
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

      // Save working dates and hours
      const hoursArray = Array.from(dateHours.values());
      const datesRes = await fetch("/api/working-dates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ 
          dates: Array.from(workingDates),
          hours: hoursArray,
        }),
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
      const hours = getDateHours(dateStr);
      const isSelected = selectedDate === dateStr;
      
      days.push(
        <button
          key={day}
          onClick={() => setSelectedDate(dateStr)}
          className={`p-3 text-center rounded-lg font-medium text-sm transition-all ${
            isSelected
              ? "ring-2 ring-brand-blue bg-brand-gold text-brand-blue"
              : isWorking
                ? "bg-brand-gold text-brand-blue"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          title={isWorking ? `${hours.start_time}-${hours.end_time}` : "Unavailable"}
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

  const selectedHours = selectedDate ? getDateHours(selectedDate) : null;

  if (loading) return <p className="text-center py-10 text-gray-500">Loading...</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4">
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

      {/* Working Dates Calendar with Flexible Hours */}
      <div>
        <h2 className="text-2xl font-bold text-brand-blue mb-2">Manage Your Availability</h2>
        <p className="text-gray-600 text-sm mb-6">Select a date to toggle whether it is available, adjust hours, or block time slots.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ← Previous
              </button>
              <h3 className="text-lg font-bold text-brand-blue">{monthName}</h3>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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

            <div className="mt-4 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand-gold rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-100 rounded"></div>
                <span>Unavailable</span>
              </div>
            </div>
          </div>

          {/* Date Editor Panel */}
          {selectedDate && selectedHours && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4 h-fit sticky top-4">
              <div>
                <h3 className="font-bold text-brand-blue mb-1">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </h3>
              </div>

              <div className="border-b pb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedHours.available}
                    onChange={(e) => setDateAvailability(selectedDate, e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700">Available for booking</span>
                </label>
              </div>

              {/* Hours */}
              <>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={selectedHours.start_time || ""}
                      onChange={(e) => updateDateHours(selectedDate, { start_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
                    <input
                      type="time"
                      value={selectedHours.end_time || ""}
                      onChange={(e) => updateDateHours(selectedDate, { end_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
                    />
                  </div>
                </div>

                {/* Blocked Time Slots */}
                <div className="border-t pt-4">
                  <h4 className="text-xs font-bold text-gray-700 mb-3">🚫 Blocked Time Slots</h4>
                  
                  <div className="space-y-2 mb-3">
                    {selectedHours.blocked_slots.length === 0 ? (
                      <p className="text-xs text-gray-500">No blocked times</p>
                    ) : (
                      selectedHours.blocked_slots.map((slot) => (
                        <div key={slot} className="flex items-center justify-between bg-red-50 p-2 rounded-lg">
                          <span className="text-xs font-medium text-red-700">{slot}</span>
                          <button
                            onClick={() => removeBlockedSlot(slot)}
                            className="text-red-600 hover:text-red-800 text-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-2">
                    <input
                      type="time"
                      value={blockTimeStart}
                      onChange={(e) => setBlockTimeStart(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 focus:border-brand-blue focus:outline-none"
                      placeholder="From"
                    />
                    <input
                      type="time"
                      value={blockTimeEnd}
                      onChange={(e) => setBlockTimeEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 focus:border-brand-blue focus:outline-none"
                      placeholder="To"
                    />
                    <button
                      onClick={addBlockedSlot}
                      className="w-full px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 text-xs font-medium rounded-lg transition-colors"
                    >
                      + Add Block
                    </button>
                  </div>
                </div>
              </>

              <div className="text-xs text-gray-500 pt-2 border-t">
                Stored dates stay in the database; use the availability toggle instead of removing dates.
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-4">
          {workingDates.size} date(s) currently available
        </p>
      </div>

      {/* Working Hours Section */}
      <div className="border-t border-gray-200 pt-8">
        <h2 className="text-2xl font-bold text-brand-blue mb-2">Default Working Hours</h2>
        <p className="text-gray-600 text-sm mb-6">Set default hours that apply to all selected dates (can be overridden per-day above).</p>

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

          <div className="border-t border-gray-200 pt-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-brand-blue mb-2">
                Therapist Postcode
              </label>
              <p className="text-xs text-gray-600 mb-3">
                Used privately to check whether a client&apos;s postcode is within your travel area.
              </p>
              <input
                type="text"
                value={settings.therapist_postcode}
                onChange={(e) => handleSettingChange("therapist_postcode", e.target.value.toUpperCase())}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:border-brand-blue focus:outline-none"
                placeholder="SW1A 1AA"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-blue mb-2">
                Maximum Travel Distance
              </label>
              <p className="text-xs text-gray-600 mb-3">
                Bookings outside this radius will be rejected automatically.
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={settings.max_travel_distance_miles}
                  onChange={(e) => handleSettingChange("max_travel_distance_miles", Number(e.target.value))}
                  className="flex-1 cursor-pointer"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={settings.max_travel_distance_miles}
                    onChange={(e) =>
                      handleSettingChange(
                        "max_travel_distance_miles",
                        e.target.value === "" ? settings.max_travel_distance_miles : Number(e.target.value),
                      )
                    }
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                  <span className="text-sm text-gray-600">miles</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">0 to 30 miles, default 10 miles</p>
            </div>
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
