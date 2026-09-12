import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { BookingValidationError, validateAndPrepareBooking } from "@/lib/booking-flow";

function normalizePhone(phoneValue: unknown) {
  const rawPhone = typeof phoneValue === "string" ? phoneValue.trim() : "";
  const hasLeadingPlus = rawPhone.startsWith("+");
  return `${hasLeadingPlus ? "+" : ""}${rawPhone.replace(/\D/g, "")}`;
}

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
    const pendingCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const requestedTreatmentId = typeof body?.treatment_id === "string" ? body.treatment_id.trim() : "";
    const requestedDate = typeof body?.date === "string" ? body.date.trim() : "";
    const requestedStartTime = typeof body?.start_time === "string" ? body.start_time.trim() : "";
    const requestedDuration = Number(body?.duration_mins);
    const requestedClientEmail = typeof body?.client_email === "string" ? body.client_email.trim() : "";
    const requestedClientPhone = normalizePhone(body?.client_phone);

    let pendingBookingQuery = supabaseAdmin
      .from("bookings")
      .select("id, status, treatment_id, duration_mins, date, start_time")
      .eq("status", "pending_payment")
      .gte("created_at", pendingCutoff)
      .eq("client_phone", requestedClientPhone)
      .limit(1);

    if (requestedClientEmail) {
      pendingBookingQuery = pendingBookingQuery.eq("client_email", requestedClientEmail);
    }

    const { data: existingPendingBooking, error: existingPendingBookingError } = await pendingBookingQuery.maybeSingle();
    if (existingPendingBookingError) throw existingPendingBookingError;
    if (existingPendingBooking) {
      const isSamePendingBooking =
        existingPendingBooking.treatment_id === requestedTreatmentId &&
        existingPendingBooking.duration_mins === requestedDuration &&
        existingPendingBooking.date === requestedDate &&
        existingPendingBooking.start_time === requestedStartTime;

      if (isSamePendingBooking) {
        return NextResponse.json({ id: existingPendingBooking.id, status: existingPendingBooking.status }, { status: 200 });
      }

      return NextResponse.json(
        { error: "You already have a booking awaiting payment. Please complete that payment before starting another booking." },
        { status: 409 },
      );
    }

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
