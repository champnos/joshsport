import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle payment_intent.succeeded
  if (event.type === "charge.succeeded") {
    const charge = event.data.object as Stripe.Charge;
    console.log(`Payment succeeded for: ${charge.metadata?.treatment_name}`);
    // TODO: Update booking status to paid in database
    return NextResponse.json({ received: true });
  }

  // Handle charge.failed
  if (event.type === "charge.failed") {
    const charge = event.data.object as Stripe.Charge;
    console.error(`Payment failed for: ${charge.metadata?.treatment_name}`);
    // TODO: Update booking status to failed/cancelled
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}
