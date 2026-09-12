import { NextResponse } from "next/server";
import Stripe from "stripe";
import { BookingValidationError, validateAndPrepareBooking } from "@/lib/booking-flow";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const preparedBooking = await validateAndPrepareBooking(body);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: preparedBooking.amountInPence,
      currency: "gbp",
      automatic_payment_methods: { enabled: true },
      receipt_email: preparedBooking.normalizedBooking.client_email || undefined,
      metadata: {
        treatment_id: preparedBooking.normalizedBooking.treatment_id,
        treatment_name: preparedBooking.normalizedBooking.treatment_name,
        duration_mins: String(preparedBooking.normalizedBooking.duration_mins),
        date: preparedBooking.normalizedBooking.date,
        start_time: preparedBooking.normalizedBooking.start_time,
        client_name: preparedBooking.normalizedBooking.client_name,
        client_email: preparedBooking.normalizedBooking.client_email,
        client_postcode: preparedBooking.normalizedBooking.client_postcode,
      },
    });

    if (!paymentIntent.client_secret) {
      throw new Error("PaymentIntent missing client secret.");
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    if (err instanceof BookingValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    if (err instanceof Stripe.errors.StripeError) {
      console.error("PaymentIntent creation failed:", err.message);
      return NextResponse.json({ error: "Unable to create payment intent." }, { status: 400 });
    }

    console.error("Payment intent endpoint failed:", err);
    return NextResponse.json({ error: "Unable to create payment intent." }, { status: 500 });
  }
}
