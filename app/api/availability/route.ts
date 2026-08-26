import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAvailableSlots } from "@/lib/availability";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") ?? "";
    const duration = Number(searchParams.get("duration") ?? "0");

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
