import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendBookingEmails } from "@/lib/booking-emails";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

async function findBookingForCharge(charge: Stripe.Charge) {
  const bookingId = charge.metadata?.booking_id;
  if (bookingId) {
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (error) {
      console.error("Webhook booking lookup by id failed:", error);
      return null;
    }

    if (data) return data;
  }

  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) return null;

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (error) {
    console.error("Webhook booking lookup failed:", error);
    return null;
  }

  return data ?? null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "charge.succeeded") {
    const charge = event.data.object as Stripe.Charge;
    const booking = await findBookingForCharge(charge);

    if (!booking) {
      console.log("charge.succeeded received with no matching booking yet", {
        payment_intent: charge.payment_intent,
      });
      return NextResponse.json({ received: true });
    }

    if (booking.status === "cancelled" || booking.status === "completed") {
      console.log("Skipping charge.succeeded status update for terminal booking state", {
        bookingId: booking.id,
        status: booking.status,
      });
      return NextResponse.json({ received: true });
    }

    const paymentIntentId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;

    const { data: updatedBooking, error } = await supabaseAdmin
      .from("bookings")
      .update({
        status: "confirmed",
        payment_intent_id: paymentIntentId ?? booking.payment_intent_id ?? null,
      })
      .eq("id", booking.id)
      .eq("status", "pending_payment")
      .select("*")
      .single();
    if (error) {
      if (error.code === "PGRST116") {
        const { data: currentBooking, error: currentBookingError } = await supabaseAdmin
          .from("bookings")
          .select("id, status, payment_intent_id")
          .eq("id", booking.id)
          .maybeSingle();
        if (currentBookingError) {
          console.error("Failed to re-read booking after duplicate webhook attempt:", currentBookingError);
          return NextResponse.json({ error: "Failed to verify booking state" }, { status: 500 });
        }
        if (
          currentBooking?.status === "confirmed" &&
          (!paymentIntentId || !currentBooking.payment_intent_id || currentBooking.payment_intent_id === paymentIntentId)
        ) {
          console.log("Skipping duplicate charge.succeeded processing for booking", {
            bookingId: booking.id,
            payment_intent: charge.payment_intent,
          });
          return NextResponse.json({ received: true });
        }
        console.error("charge.succeeded could not confirm booking because the status changed unexpectedly", {
          bookingId: booking.id,
          currentStatus: currentBooking?.status,
          payment_intent: charge.payment_intent,
        });
        return NextResponse.json({ error: "Booking state changed unexpectedly" }, { status: 409 });
      }
      console.error("Failed to confirm booking from webhook:", error);
      return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
    }

    await sendBookingEmails(updatedBooking);

    console.log("Booking confirmed from charge.succeeded", { bookingId: booking.id, payment_intent: charge.payment_intent });
    return NextResponse.json({ received: true });
  }

  if (event.type === "charge.failed") {
    const charge = event.data.object as Stripe.Charge;
    const booking = await findBookingForCharge(charge);

    if (!booking) {
      console.log("charge.failed received with no matching booking", {
        payment_intent: charge.payment_intent,
      });
      return NextResponse.json({ received: true });
    }

    console.warn("Ignoring charge.failed while booking awaits a successful Checkout payment", {
      bookingId: booking.id,
      status: booking.status,
      payment_intent: charge.payment_intent,
    });
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}
