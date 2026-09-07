import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { getAvailableSlots } from "@/lib/availability";

interface RouteContext { params: { id: string } }

async function getBookingSettings() {
  try {
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
      buffer_mins_after_booking: bufferData ? parseInt(bufferData.value) : 30,
      default_start_time: startTimeData?.value || "09:00",
      default_end_time: endTimeData?.value || "17:00",
    };
  } catch {
    return {
      buffer_mins_after_booking: 30,
      default_start_time: "09:00",
      default_end_time: "17:00",
    };
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();
    const body = await request.json();

    const updates: Record<string, string> = {};

    if (body.status !== undefined) {
      if (!["pending", "confirmed", "completed", "cancelled"].includes(body.status)) {
        return NextResponse.json({ error: "Invalid status." }, { status: 400 });
      }
      updates.status = body.status;
    }

    const nextDate = typeof body.date === "string" ? body.date.trim() : "";
    const nextStartTime = typeof body.start_time === "string" ? body.start_time.trim() : "";
    const wantsReschedule = Boolean(nextDate || nextStartTime);

    if (wantsReschedule) {
      if (!nextDate || !nextStartTime) {
        return NextResponse.json({ error: "Date and start time are required to reschedule." }, { status: 400 });
      }

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, duration_mins")
        .eq("id", params.id)
        .single();

      if (bookingError || !booking) {
        return NextResponse.json({ error: "Booking not found." }, { status: 404 });
      }

      const { data: workingDateData, error: workingDateError } = await supabase
        .from("working_dates")
        .select("date")
        .eq("date", nextDate)
        .single();

      if (workingDateError && workingDateError.code !== "PGRST116") throw workingDateError;
      if (!workingDateData) {
        return NextResponse.json({ error: "Selected date is not available for bookings." }, { status: 409 });
      }

      const { data: existingBookings, error: existingBookingsError } = await supabase
        .from("bookings")
        .select("start_time, duration_mins")
        .eq("date", nextDate)
        .neq("id", params.id)
        .neq("status", "cancelled");

      if (existingBookingsError) throw existingBookingsError;

      const settings = await getBookingSettings();
      const availableSlots = getAvailableSlots(
        nextDate,
        booking.duration_mins,
        existingBookings ?? [],
        settings.buffer_mins_after_booking,
        settings.default_start_time,
        settings.default_end_time,
      );

      if (!availableSlots.includes(nextStartTime)) {
        return NextResponse.json({ error: "Selected time is no longer available." }, { status: 409 });
      }

      updates.date = nextDate;
      updates.start_time = nextStartTime;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid booking changes were provided." }, { status: 400 });
    }

    const { data, error } = await supabase.from("bookings").update(updates).eq("id", params.id).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Unable to update booking." }, { status: 500 });
  }
}
