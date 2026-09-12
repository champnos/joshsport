import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { BookingValidationError, validateAndPrepareBooking } from "@/lib/booking-flow";
import { createBookingCheckoutTokenForBooking } from "@/lib/booking-checkout-token";

function normalizePhone(phoneValue: unknown) {
  const rawPhone = typeof phoneValue === "string" ? phoneValue.trim() : "";
  const hasLeadingPlus = rawPhone.startsWith("+");
  return `${hasLeadingPlus ? "+" : ""}${rawPhone.replace(/\D/g, "")}`;
}

function normalizeEmail(emailValue: unknown) {
  return typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
}

function normalizedEmailFromBooking(booking: { client_email?: string | null }) {
  return normalizeEmail(booking.client_email ?? "");
}

function matchesRequestedBooking(
  booking: {
    treatment_id: string | null;
    duration_mins: number | null;
    date: string | null;
    start_time: string | null;
  },
  requestedBooking: {
    treatmentId: string;
    duration: number;
    date: string;
    startTime: string;
  },
) {
  return (
    booking.treatment_id === requestedBooking.treatmentId &&
    booking.duration_mins === requestedBooking.duration &&
    booking.date === requestedBooking.date &&
    booking.start_time === requestedBooking.startTime
  );
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
    const requestedClientEmail = normalizeEmail(body?.client_email);
    const requestedClientPhone = normalizePhone(body?.client_phone);
    const requestedBooking = {
      treatmentId: requestedTreatmentId,
      duration: Number.isFinite(requestedDuration) ? requestedDuration : 0,
      date: requestedDate,
      startTime: requestedStartTime,
    };

    const pendingBookingQuery = supabaseAdmin
      .from("bookings")
      .select("id, status, treatment_id, duration_mins, date, start_time, client_email, client_phone")
      .eq("status", "pending_payment")
      .gte("created_at", pendingCutoff)
      .eq("client_phone", requestedClientPhone)
      .order("created_at", { ascending: false })
      .limit(10);

    const { data: existingPendingBookings, error: existingPendingBookingError } = await pendingBookingQuery;
    if (existingPendingBookingError) throw existingPendingBookingError;
    if (existingPendingBookings && existingPendingBookings.length > 0) {
      const sameCustomerPendingBookings = existingPendingBookings.filter(
        (booking) => normalizedEmailFromBooking(booking) === requestedClientEmail,
      );
      const exactPendingBooking = sameCustomerPendingBookings.find((booking) => matchesRequestedBooking(booking, requestedBooking));

      if (exactPendingBooking) {
        return NextResponse.json(
          {
            id: exactPendingBooking.id,
            status: exactPendingBooking.status,
            checkoutToken: createBookingCheckoutTokenForBooking(
              exactPendingBooking.id,
              exactPendingBooking.client_phone ?? requestedClientPhone,
              normalizedEmailFromBooking(exactPendingBooking),
            ),
          },
          { status: 200 },
        );
      }

      if (sameCustomerPendingBookings.length > 0) {
        return NextResponse.json(
          { error: "You already have a booking awaiting payment. Please complete that payment before starting another booking." },
          { status: 409 },
        );
      }
    }

    const preparedBooking = await validateAndPrepareBooking(body);
    const insertPayload = {
      ...preparedBooking.normalizedBooking,
      status: "pending_payment",
    };

    const { data, error } = await supabaseAdmin.from("bookings").insert([insertPayload]).select().single();
    if (error) {
      if (error.code === "23505") {
        const existingPendingBookingQuery = supabaseAdmin
          .from("bookings")
          .select("id, status, treatment_id, duration_mins, date, start_time, client_email, client_phone")
          .eq("status", "pending_payment")
          .eq("client_phone", preparedBooking.normalizedBooking.client_phone)
          .eq("treatment_id", preparedBooking.normalizedBooking.treatment_id)
          .eq("duration_mins", preparedBooking.normalizedBooking.duration_mins)
          .eq("date", preparedBooking.normalizedBooking.date)
          .eq("start_time", preparedBooking.normalizedBooking.start_time)
          .order("created_at", { ascending: false })
          .limit(10);

        const { data: duplicateBookings, error: duplicateBookingError } = await existingPendingBookingQuery;
        if (duplicateBookingError) throw duplicateBookingError;
        const duplicateBooking = duplicateBookings?.find(
          (booking) => normalizedEmailFromBooking(booking) === preparedBooking.normalizedBooking.client_email,
        );
        if (duplicateBooking) {
          return NextResponse.json(
            {
              id: duplicateBooking.id,
              status: duplicateBooking.status,
              checkoutToken: createBookingCheckoutTokenForBooking(
                duplicateBooking.id,
                duplicateBooking.client_phone ?? preparedBooking.normalizedBooking.client_phone,
                normalizedEmailFromBooking(duplicateBooking),
              ),
            },
            { status: 200 },
          );
        }
      }

      throw error;
    }

    return NextResponse.json(
      {
        ...data,
        checkoutToken: createBookingCheckoutTokenForBooking(
          data.id,
          preparedBooking.normalizedBooking.client_phone,
          preparedBooking.normalizedBooking.client_email,
        ),
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof BookingValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error("Booking creation failed with error:", err);
    return NextResponse.json({ error: "Unable to create booking." }, { status: 500 });
  }
}
