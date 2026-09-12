import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

async function findBookingForCharge(charge: Stripe.Charge) {
  const treatmentId = charge.metadata?.treatment_id?.trim();
  const date = charge.metadata?.date?.trim();
  const startTime = charge.metadata?.start_time?.trim();
  const clientEmail = charge.metadata?.client_email?.trim();

  if (!treatmentId || !date || !startTime) {
    return null;
  }

  let query = supabaseAdmin
    .from("bookings")
    .select("id, status")
    .eq("treatment_id", treatmentId)
    .eq("date", date)
    .eq("start_time", startTime)
    .order("created_at", { ascending: false })
    .limit(1);

  if (clientEmail) {
    query = query.eq("client_email", clientEmail);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Webhook booking lookup failed:", error);
    return null;
  }

  return data?.[0] ?? null;
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
        date: charge.metadata?.date,
        start_time: charge.metadata?.start_time,
      });
      return NextResponse.json({ received: true });
    }

    const { error } = await supabaseAdmin.from("bookings").update({ status: "confirmed" }).eq("id", booking.id);
    if (error) {
      console.error("Failed to confirm booking from webhook:", error);
      return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
    }

    console.log("Booking confirmed from charge.succeeded", { bookingId: booking.id, payment_intent: charge.payment_intent });
    return NextResponse.json({ received: true });
  }

  if (event.type === "charge.failed") {
    const charge = event.data.object as Stripe.Charge;
    const booking = await findBookingForCharge(charge);

    if (!booking) {
      console.log("charge.failed received with no matching booking", {
        payment_intent: charge.payment_intent,
        date: charge.metadata?.date,
        start_time: charge.metadata?.start_time,
      });
      return NextResponse.json({ received: true });
    }

    if (booking.status === "completed" || booking.status === "confirmed") {
      console.warn("Skipping cancellation for already confirmed/completed booking after charge.failed", {
        bookingId: booking.id,
        status: booking.status,
      });
      return NextResponse.json({ received: true });
    }

    const { error } = await supabaseAdmin.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
    if (error) {
      console.error("Failed to cancel booking from webhook:", error);
      return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
    }

    console.log("Booking cancelled from charge.failed", { bookingId: booking.id, payment_intent: charge.payment_intent });
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}
