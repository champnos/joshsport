import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAvailableSlots } from "@/lib/availability";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
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

    // Admin endpoint: fetch working days/hours
    if (admin === "true") {
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

    const today = startOfDay(new Date());
    const twoWeeksFromNow = startOfDay(new Date());
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
    const requestedDate = startOfDay(new Date(date));
    if (requestedDate < today || requestedDate > twoWeeksFromNow) {
      return NextResponse.json({ slots: [] });
    }

    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("start_time, duration_mins")
      .eq("date", date)
      .neq("status", "cancelled");

    const slots = getAvailableSlots(date, duration, existingBookings ?? []);
    return NextResponse.json({ slots });
  } catch {
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
