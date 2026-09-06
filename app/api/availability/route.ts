import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAvailableSlots } from "@/lib/availability";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

async function getSettings() {
  try {
    const { data: bookingData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "booking_window_days")
      .single();

    const { data: bufferData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "buffer_mins_after_booking")
      .single();

    const { data: startTimeData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "default_start_time")
      .single();

    const { data: endTimeData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "default_end_time")
      .single();

    return {
      booking_window_days: bookingData ? parseInt(bookingData.value) : 30,
      buffer_mins_after_booking: bufferData ? parseInt(bufferData.value) : 30,
      default_start_time: startTimeData?.value || "09:00",
      default_end_time: endTimeData?.value || "17:00",
    };
  } catch {
    return {
      booking_window_days: 30,
      buffer_mins_after_booking: 30,
      default_start_time: "09:00",
      default_end_time: "17:00",
    };
  }
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

      const { data, error } = await supabase
        .from("working_dates")
        .select("*")
        .order("date", { ascending: true });

      if (error) throw error;
      return NextResponse.json(data || [], { status: 200 });
    }

    // Public endpoint: get available slots for booking
    if (!date || !duration) {
      return NextResponse.json({ error: "Date and duration are required." }, { status: 400 });
    }

    // Get settings for booking window and buffer time
    const settings = await getSettings();
    const bookingWindowDays = settings.booking_window_days;
    const bufferMins = settings.buffer_mins_after_booking;

    // Validate date is within booking window
    const today = startOfDay(new Date());
    const maxBookingDate = startOfDay(new Date());
    maxBookingDate.setDate(maxBookingDate.getDate() + bookingWindowDays);
    const requestedDate = startOfDay(new Date(date));

    if (requestedDate < today || requestedDate > maxBookingDate) {
      return NextResponse.json({ slots: [] });
    }

    // Check if therapist is working that date
    const { data: workingDateData, error: workingDateError } = await supabase
      .from("working_dates")
      .select("*")
      .eq("date", date)
      .single();

    if (workingDateError && workingDateError.code !== "PGRST116") throw workingDateError;

    if (!workingDateData) {
      return NextResponse.json({ slots: [] });
    }

    // Get existing bookings for that day
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("start_time, duration_mins")
      .eq("date", date)
      .neq("status", "cancelled");

    const slots = getAvailableSlots(date, duration, existingBookings ?? [], bufferMins, settings.default_start_time, settings.default_end_time);
    return NextResponse.json({ slots });
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
