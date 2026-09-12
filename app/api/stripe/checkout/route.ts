import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createBookingConfirmationToken } from "@/lib/booking-confirmation";
import { verifyBookingCheckoutToken } from "@/lib/booking-checkout-token";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

function getDurationPrice(durations: unknown, durationMins: number) {
  if (!Array.isArray(durations)) return null;

  const match = durations
    .filter((entry): entry is { mins?: unknown; price?: unknown } => typeof entry === "object" && entry !== null)
    .find((entry) => Number(entry.mins) === durationMins);

  if (!match) return null;
  const price = Number(match.price);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function normalizeEmail(emailValue: string | null) {
  return typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim() : "";
    const checkoutToken = typeof body.checkoutToken === "string" ? body.checkoutToken.trim() : "";

    if (!bookingId) {
      return NextResponse.json({ error: "Missing booking ID" }, { status: 400 });
    }
    if (!checkoutToken) {
      return NextResponse.json({ error: "Invalid checkout token" }, { status: 403 });
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("id, treatment_id, treatment_name, duration_mins, date, start_time, client_email, client_phone, status, voucher_code, voucher_discount_percentage, base_amount_pence, discount_amount_pence, final_amount_pence")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    const normalizedClientEmail = normalizeEmail(booking.client_email);
    const isCheckoutTokenValid = verifyBookingCheckoutToken(
      bookingId,
      booking.client_phone || "",
      normalizedClientEmail,
      checkoutToken,
    );

    console.error("Stripe checkout token verification result:", {
      bookingId,
      clientPhone: booking.client_phone || "",
      clientEmail: normalizedClientEmail,
      checkoutTokenLength: checkoutToken.length,
      isCheckoutTokenValid,
    });

    if (!isCheckoutTokenValid) {
      return NextResponse.json({ error: "Invalid checkout token" }, { status: 403 });
    }

    if (booking.status !== "pending_payment") {
      return NextResponse.json({ error: "Booking is not awaiting payment" }, { status: 409 });
    }

    let unitAmount =
      typeof booking.final_amount_pence === "number" && booking.final_amount_pence > 0
        ? booking.final_amount_pence
        : null;

    if (unitAmount === null) {
      const { data: treatment, error: treatmentError } = await supabaseAdmin
        .from("treatments")
        .select("durations")
        .eq("id", booking.treatment_id)
        .single();

      if (treatmentError || !treatment) {
        return NextResponse.json({ error: "Treatment not found" }, { status: 404 });
      }

      const price = getDurationPrice(treatment.durations, booking.duration_mins);
      if (price === null) {
        return NextResponse.json({ error: "Selected duration is not available" }, { status: 400 });
      }

      unitAmount = Math.round(price * 100);
    }

    const successUrl = new URL(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/booking-success`);
    successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
    successUrl.searchParams.set("booking_id", booking.id);
    successUrl.searchParams.set("confirmation_token", createBookingConfirmationToken(booking.id));

    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "gbp",
              product_data: {
                name: booking.treatment_name,
                description: `${booking.duration_mins} minute session on ${booking.date} at ${booking.start_time}`,
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        metadata: {
          booking_id: booking.id,
          treatment_id: booking.treatment_id,
          treatment_name: booking.treatment_name,
          duration_mins: String(booking.duration_mins),
          date: booking.date,
          start_time: booking.start_time,
          voucher_code: booking.voucher_code || "",
          discount_percentage: String(booking.voucher_discount_percentage || 0),
          base_amount_pence: String(booking.base_amount_pence || unitAmount),
          discount_amount_pence: String(booking.discount_amount_pence || 0),
          final_amount_pence: String(unitAmount),
        },
        mode: "payment",
        success_url: successUrl.toString(),
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/booking?cancelled=true`,
        customer_email: normalizedClientEmail || undefined,
        payment_intent_data: {
          metadata: {
            booking_id: booking.id,
            treatment_id: booking.treatment_id,
            treatment_name: booking.treatment_name,
            duration_mins: String(booking.duration_mins),
            date: booking.date,
            start_time: booking.start_time,
            voucher_code: booking.voucher_code || "",
            discount_percentage: String(booking.voucher_discount_percentage || 0),
            base_amount_pence: String(booking.base_amount_pence || unitAmount),
            discount_amount_pence: String(booking.discount_amount_pence || 0),
            final_amount_pence: String(unitAmount),
          },
        },
      },
      { idempotencyKey: `booking-checkout-${booking.id}` },
    );
    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
