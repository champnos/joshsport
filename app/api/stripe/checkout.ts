import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { price, treatment_name, duration_mins, date, start_time } = body;

    if (!price || !treatment_name) {
      return NextResponse.json({ error: "Missing price or treatment name" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: treatment_name,
              description: `${duration_mins} minute session on ${date} at ${start_time}`,
            },
            unit_amount: Math.round(price * 100), // Convert to pence
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/booking?cancelled=true`,
      metadata: {
        treatment_name,
        duration_mins,
        date,
        start_time,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
