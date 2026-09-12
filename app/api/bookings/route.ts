import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { BookingValidationError, validateAndPrepareBooking } from "@/lib/booking-flow";

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();
    const { data, error } = await supabaseAdmin.from("bookings").select("*").order("date").order("start_time");
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("Failed to fetch bookings:", err);
    return NextResponse.json({ error: "Unable to load bookings." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const preparedBooking = await validateAndPrepareBooking(body);
    const insertPayload = {
      ...preparedBooking.normalizedBooking,
      status: "pending_payment",
    };

    const { data, error } = await supabaseAdmin.from("bookings").insert([insertPayload]).select().single();
    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof BookingValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error("Booking creation failed with error:", err);
    return NextResponse.json({ error: "Unable to create booking." }, { status: 500 });
  }
}
