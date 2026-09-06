import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

export async function GET() {
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

    return NextResponse.json(
      {
        booking_window_days: bookingData ? parseInt(bookingData.value) : 30,
        buffer_mins_after_booking: bufferData ? parseInt(bufferData.value) : 30,
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

    // Update booking_window_days
    const { error: error1 } = await supabase
      .from("settings")
      .update({ value: booking_window_days.toString() })
      .eq("key", "booking_window_days");

    if (error1) {
      // If update fails (row doesn't exist), insert it
      await supabase
        .from("settings")
        .insert({ key: "booking_window_days", value: booking_window_days.toString() });
    }

    // Update buffer_mins_after_booking
    const { error: error2 } = await supabase
      .from("settings")
      .update({ value: buffer_mins_after_booking.toString() })
      .eq("key", "buffer_mins_after_booking");

    if (error2) {
      // If update fails (row doesn't exist), insert it
      await supabase
        .from("settings")
        .insert({ key: "buffer_mins_after_booking", value: buffer_mins_after_booking.toString() });
    }

    return NextResponse.json(
      {
        booking_window_days,
        buffer_mins_after_booking,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Failed to update settings:", err);
    return NextResponse.json({ error: "Unable to update settings." }, { status: 500 });
  }
}
