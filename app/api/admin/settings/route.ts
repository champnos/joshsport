import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .single();

    if (error && error.code !== "PGRST116") throw error;

    return NextResponse.json(
      data || {
        booking_window_days: 30,
        buffer_mins_after_booking: 30,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Failed to fetch settings:", err);
    return NextResponse.json(
      {
        booking_window_days: 30,
        buffer_mins_after_booking: 30,
      },
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();

    const body = await request.json();
    const { booking_window_days, buffer_mins_after_booking } = body;

    if (booking_window_days === undefined || buffer_mins_after_booking === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("settings")
      .upsert({
        id: 1,
        booking_window_days,
        buffer_mins_after_booking,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("Failed to update settings:", err);
    return NextResponse.json({ error: "Unable to update settings." }, { status: 500 });
  }
}
