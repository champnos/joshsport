import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import {
  buildBookedSlots,
  ensureRollingWorkingDates,
  getBookableSlots,
  getBookingSettings,
  isValidDateKey,
} from "@/lib/working-dates";
import type { NextRequest } from "next/server";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") ?? "";
    const duration = Number(searchParams.get("duration") ?? "0");
    const admin = searchParams.get("admin");

    // Admin endpoint: fetch working dates
    if (admin === "true") {
      if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();

      await ensureRollingWorkingDates();

      const { data, error } = await supabaseAdmin
        .from("working_dates")
        .select("date, available, start_time, end_time, blocked_slots, booked_slots")
        .order("date", { ascending: true });

      if (error) throw error;
      return NextResponse.json(data || [], { status: 200 });
    }

    // Public endpoint: get available slots for booking
    if (!date || !duration) {
      return NextResponse.json({ error: "Date and duration are required." }, { status: 400 });
    }

    if (!isValidDateKey(date)) {
      return NextResponse.json({ error: "Date must be in YYYY-MM-DD format." }, { status: 400 });
    }

    await ensureRollingWorkingDates();

    // Get settings for booking window and buffer time
    const settings = await getBookingSettings();
    const bookingWindowDays = settings.booking_window_days;

    // Validate date is within booking window
    const today = startOfDay(new Date());
    const maxBookingDate = startOfDay(new Date());
    maxBookingDate.setDate(maxBookingDate.getDate() + bookingWindowDays);
    const requestedDate = startOfDay(new Date(date));

    if (requestedDate < today || requestedDate > maxBookingDate) {
      return NextResponse.json({ slots: [], booked_slots: [] });
    }

    // Check if therapist is working that date
    const { data: workingDateData, error: workingDateError } = await supabase
      .from("working_dates")
      .select("*")
      .eq("date", date)
      .single();

    if (workingDateError && workingDateError.code !== "PGRST116") throw workingDateError;

    if (!workingDateData) {
      return NextResponse.json({ slots: [], booked_slots: [] });
    }

    if (!workingDateData.available) {
      return NextResponse.json({ slots: [], booked_slots: [] });
    }

    // Get existing bookings for that day
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("start_time, duration_mins")
      .eq("date", date)
      .neq("status", "cancelled");

    const slots = getBookableSlots(
      date,
      duration,
      workingDateData,
      existingBookings ?? [],
      settings,
    );
    const bookedSlots = buildBookedSlots(existingBookings ?? []);

    return NextResponse.json({ slots, booked_slots: bookedSlots });
  } catch (err) {
    console.error("Failed to fetch availability:", err);
    return NextResponse.json({ error: "Unable to load availability." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();

    const body = await request.json();
    const { date } = body;

    if (!date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("working_dates")
      .insert({ date })
      .select();

    if (error) throw error;

    return NextResponse.json(data?.[0] || {}, { status: 200 });
  } catch (err) {
    console.error("Failed to update availability:", err);
    return NextResponse.json({ error: "Unable to update availability." }, { status: 500 });
  }
}
