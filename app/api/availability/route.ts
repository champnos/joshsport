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

    return {
      booking_window_days: bookingData ? parseInt(bookingData.value) : 30,
      buffer_mins_after_booking: bufferData ? parseInt(bufferData.value) : 30,
    };
  } catch {
    return {
      booking_window_days: 30,
      buffer_mins_after_booking: 30,
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") ?? "";
    const duration = Number(searchParams.get("duration") ?? "0");
    const admin = searchParams.get("admin");

    // Admin endpoint: fetch working days/hours
    if (admin === "true") {
      if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();

      const { data, error } = await supabase
        .from("availability")
        .select("*")
        .order("day_of_week", { ascending: true });

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

    // Get day of week (0 = Monday, 6 = Sunday)
    const dayOfWeek = requestedDate.getDay() === 0 ? 6 : requestedDate.getDay() - 1;

    // Check if therapist is working that day
    const { data: availabilityData, error: availError } = await supabase
      .from("availability")
      .select("*")
      .eq("day_of_week", dayOfWeek)
      .single();

    if (availError && availError.code !== "PGRST116") throw availError;

    if (!availabilityData?.is_working) {
      return NextResponse.json({ slots: [] });
    }

    // Get existing bookings for that day
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("start_time, duration_mins")
      .eq("date", date)
      .neq("status", "cancelled");

    const slots = getAvailableSlots(date, duration, existingBookings ?? [], bufferMins);
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
    const { day_of_week, is_working, start_time, end_time } = body;

    if (day_of_week === undefined || is_working === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("availability")
      .upsert(
        {
          day_of_week,
          is_working,
          start_time: is_working ? start_time : null,
          end_time: is_working ? end_time : null,
        },
        { onConflict: "day_of_week" }
      )
      .select();

    if (error) throw error;

    return NextResponse.json(data?.[0] || {}, { status: 200 });
  } catch (err) {
    console.error("Failed to update availability:", err);
    return NextResponse.json({ error: "Unable to update availability." }, { status: 500 });
  }
}
