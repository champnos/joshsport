import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

async function findBookingForCharge(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;

  if (!paymentIntentId) return null;

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("id, status, voucher_code")
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

      if (booking.status === "confirmed") {
        return NextResponse.json({ received: true });
      }

      const { error } = await supabaseAdmin.from("bookings").update({ status: "confirmed" }).eq("id", booking.id);
      if (error) {
        console.error("Failed to confirm booking from webhook:", error);
        return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
      }

      if (booking.voucher_code) {
        const { data: voucher, error: voucherLookupError } = await supabaseAdmin
          .from("vouchers")
          .select("id, uses_count")
          .eq("code", booking.voucher_code)
          .maybeSingle();

        if (voucherLookupError) {
          console.error("Failed to lookup voucher during webhook confirm:", voucherLookupError);
        } else if (voucher) {
          const { error: voucherUpdateError } = await supabaseAdmin
            .from("vouchers")
            .update({ uses_count: (voucher.uses_count ?? 0) + 1 })
            .eq("id", voucher.id);

          if (voucherUpdateError) {
            console.error("Failed to increment voucher usage during webhook confirm:", voucherUpdateError);
          }
        }
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
      });
      return NextResponse.json({ received: true });
    }

    if (booking.status === "completed" || booking.status === "confirmed") {
      if (booking.status === "completed") {
        console.warn("Skipping cancellation for completed booking after charge.failed", {
          bookingId: booking.id,
          status: booking.status,
        });
        return NextResponse.json({ received: true });
      }

      const paymentIntentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;

      if (paymentIntentId) {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status === "succeeded") {
          console.warn("Skipping cancellation for confirmed booking because payment intent is succeeded", {
            bookingId: booking.id,
            payment_intent: paymentIntentId,
          });
          return NextResponse.json({ received: true });
        }
      }
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
