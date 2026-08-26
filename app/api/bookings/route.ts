import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { getAvailableSlots } from "@/lib/availability";

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();
    const { data, error } = await supabase.from("bookings").select("*").order("date").order("start_time");
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json({ error: "Unable to load bookings." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { treatment_id, date, start_time, duration_mins } = body;

    if (!treatment_id || !date || !start_time || !duration_mins) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("start_time, duration_mins")
      .eq("date", date)
      .neq("status", "cancelled");

    const available = getAvailableSlots(date, duration_mins, existingBookings ?? []);
    if (!available.includes(start_time)) {
      return NextResponse.json({ error: "Selected time is no longer available." }, { status: 409 });
    }

    const { data, error } = await supabase.from("bookings").insert([{ ...body, status: "pending" }]).select().single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create booking." }, { status: 500 });
  }
}
