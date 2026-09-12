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
    const pendingCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const pendingBookingQuery = supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("status", "pending_payment")
      .gte("created_at", pendingCutoff)
      .eq("client_phone", preparedBooking.normalizedBooking.client_phone)
      .limit(1);

    const { data: existingPendingBooking, error: existingPendingBookingError } = await pendingBookingQuery.maybeSingle();
    if (existingPendingBookingError) throw existingPendingBookingError;
    if (existingPendingBooking) {
      return NextResponse.json(
        { error: "You already have a booking awaiting payment. Please complete that payment before starting another booking." },
        { status: 409 },
      );
    }

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
