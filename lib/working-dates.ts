import { ExistingBooking, getAvailableSlots } from "@/lib/availability";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

export interface WorkingDateRow {
  date: string;
  available: boolean;
  start_time: string | null;
  end_time: string | null;
  is_off: boolean;
  blocked_slots: string[];
  booked_slots?: string[];
}

export interface BookingSettings {
  booking_window_days: number;
  buffer_mins_after_booking: number;
  default_start_time: string;
  default_end_time: string;
}

const DEFAULT_SETTINGS: BookingSettings = {
  booking_window_days: 30,
  buffer_mins_after_booking: 30,
  default_start_time: "09:00",
  default_end_time: "17:00",
};

export function normalizeTimeValue(value: string | null | undefined) {
  if (!value) return null;
  return value.slice(0, 5);
}

export function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isValidTimeValue(value: string) {
  const normalized = normalizeTimeValue(value);
  if (!normalized || !/^\d{2}:\d{2}$/.test(normalized)) return false;
  const [hours, minutes] = normalized.split(":").map(Number);
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
}

export function timeToMinutes(value: string) {
  const normalized = normalizeTimeValue(value);
  if (!normalized) return 0;
  const [hours, minutes] = normalized.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function isValidBlockedSlot(value: string) {
  const [start, end] = value.split("-");
  return Boolean(
    start &&
      end &&
      isValidTimeValue(start) &&
      isValidTimeValue(end) &&
      timeToMinutes(start) < timeToMinutes(end),
  );
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

export function filterBlockedSlots(slots: string[], duration: number, blockedSlots: string[] = []) {
  if (!Array.isArray(blockedSlots) || blockedSlots.length === 0) return slots;

  return slots.filter((slot) => {
    const slotStart = timeToMinutes(slot);
    const slotEnd = slotStart + duration;

    return blockedSlots.every((blocked) => {
      if (!isValidBlockedSlot(blocked)) return true;
      const [blockedStart, blockedEnd] = blocked.split("-");
      return !overlaps(slotStart, slotEnd, timeToMinutes(blockedStart), timeToMinutes(blockedEnd));
    });
  });
}

export function buildBookedSlots(existingBookings: ExistingBooking[] = []) {
  return existingBookings
    .filter((booking) => isValidTimeValue(booking.start_time) && Number.isFinite(booking.duration_mins))
    .map((booking) => {
      const startTime = normalizeTimeValue(booking.start_time) as string;
      const endTime = minutesToTime(timeToMinutes(startTime) + booking.duration_mins);
      return `${startTime}-${endTime}`;
    });
}

export function getBookableSlots(
  date: string,
  duration: number,
  workingDate: Pick<WorkingDateRow, "available" | "start_time" | "end_time" | "is_off" | "blocked_slots">,
  existingBookings: ExistingBooking[],
  settings: BookingSettings,
) {
  if (!workingDate.available || workingDate.is_off) return [];

  const startTime = normalizeTimeValue(workingDate.start_time) || settings.default_start_time;
  const endTime = normalizeTimeValue(workingDate.end_time) || settings.default_end_time;

  return filterBlockedSlots(
    getAvailableSlots(
      date,
      duration,
      existingBookings,
      settings.buffer_mins_after_booking,
      startTime,
      endTime,
    ),
    duration,
    workingDate.blocked_slots,
  );
}

export async function getBookingSettings(): Promise<BookingSettings> {
  try {
    const { data } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", [
        "booking_window_days",
        "buffer_mins_after_booking",
        "default_start_time",
        "default_end_time",
      ]);

    const values = new Map((data ?? []).map((row) => [row.key, row.value]));

    return {
      booking_window_days: Number.parseInt(values.get("booking_window_days") ?? "", 10) || DEFAULT_SETTINGS.booking_window_days,
      buffer_mins_after_booking:
        Number.parseInt(values.get("buffer_mins_after_booking") ?? "", 10) || DEFAULT_SETTINGS.buffer_mins_after_booking,
      default_start_time: values.get("default_start_time") || DEFAULT_SETTINGS.default_start_time,
      default_end_time: values.get("default_end_time") || DEFAULT_SETTINGS.default_end_time,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(baseDate: Date) {
  return new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate()));
}

export async function ensureRollingWorkingDates(monthsAhead: number = 12) {
  const startDate = startOfUtcDay(new Date());
  const endDate = new Date(startDate);
  endDate.setUTCMonth(endDate.getUTCMonth() + monthsAhead);
  endDate.setUTCDate(endDate.getUTCDate() - 1);

  const startKey = toDateKey(startDate);
  const endKey = toDateKey(endDate);

  const { data, error } = await supabaseAdmin
    .from("working_dates")
    .select("date")
    .gte("date", startKey)
    .lte("date", endKey);

  if (error) throw error;

  const existingDates = new Set((data ?? []).map((row) => row.date));
  const missingDates: Array<Pick<WorkingDateRow, "date" | "available">> = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const dateKey = toDateKey(cursor);
    if (!existingDates.has(dateKey)) {
      missingDates.push({ date: dateKey, available: false });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (missingDates.length === 0) return;

  const { error: insertError } = await supabaseAdmin.from("working_dates").insert(missingDates);
  if (insertError && insertError.code !== "23505") throw insertError;
}
