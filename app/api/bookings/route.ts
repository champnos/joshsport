import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { Resend } from "resend";
import { BookingValidationError, validateAndPrepareBooking } from "@/lib/booking-flow";
import { normalizeVoucherCode } from "@/lib/vouchers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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

function formatTime(timeValue: string) {
  const [h, m] = timeValue.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")}${period}`;
}

async function sendBookingEmails(booking: Awaited<ReturnType<typeof validateAndPrepareBooking>>["normalizedBooking"]) {
  try {
    if (!resend) throw new Error("Missing RESEND_API_KEY");

    await resend.emails.send({
      from: "bookings@maggsymassagetherapy.com",
      to: process.env.JOSH_EMAIL || "josh@maggsymassagetherapy.com",
      subject: `New Booking: ${booking.client_name} - ${booking.treatment_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #003366; margin-bottom: 20px;">New Booking Received</h2>

          <h3 style="color: #003366; margin-top: 20px; margin-bottom: 10px;">Booking Details</h3>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>Treatment:</strong> ${booking.treatment_name}</p>
            <p><strong>Duration:</strong> ${booking.duration_mins} minutes</p>
            <p><strong>Date:</strong> ${booking.date}</p>
            <p><strong>Time:</strong> ${formatTime(booking.start_time)}</p>
          </div>

          <h3 style="color: #003366; margin-top: 20px; margin-bottom: 10px;">Client Details</h3>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>Name:</strong> ${booking.client_name}</p>
            <p><strong>Date of Birth:</strong> ${booking.client_dob}</p>
            <p><strong>Phone:</strong> ${booking.client_phone}</p>
            <p><strong>Address:</strong> ${booking.client_address}, ${booking.client_postcode}</p>
          </div>

          <h3 style="color: #003366; margin-top: 20px; margin-bottom: 10px;">Emergency Contact</h3>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>Name:</strong> ${booking.emergency_name}</p>
            <p><strong>Relationship:</strong> ${booking.emergency_relationship}</p>
            <p><strong>Phone:</strong> ${booking.emergency_phone}</p>
          </div>

          <h3 style="color: #003366; margin-top: 20px; margin-bottom: 10px;">Medical History</h3>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>Conditions:</strong> ${booking.medical_conditions.join(", ") || "None reported"}</p>
            ${booking.medical_notes ? `<p><strong>Notes:</strong> ${booking.medical_notes}</p>` : ""}
          </div>

          <h3 style="color: #003366; margin-top: 20px; margin-bottom: 10px;">Injury History</h3>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>Recent Injury/Surgery:</strong> ${booking.injury_recent ? "Yes" : "No"}</p>
            ${booking.injury_recent_notes ? `<p><strong>Details:</strong> ${booking.injury_recent_notes}</p>` : ""}
            <p><strong>Previous Injuries:</strong> ${booking.injury_previous ? "Yes" : "No"}</p>
            ${booking.injury_previous_notes ? `<p><strong>Details:</strong> ${booking.injury_previous_notes}</p>` : ""}
          </div>

          <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated booking notification from Maggy's Massage Therapy.</p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error("Failed to send email to Josh:", emailError);
  }

  if (!booking.client_email) return;

  try {
    if (!resend) throw new Error("Missing RESEND_API_KEY");

    await resend.emails.send({
      from: "bookings@maggsymassagetherapy.com",
      to: booking.client_email,
      subject: "Your Booking Confirmation - Maggy's Massage Therapy",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #003366; margin-bottom: 20px;">Booking Confirmed! ✅</h2>
          <p style="color: #666; margin-bottom: 20px;">Hi ${booking.client_name},</p>
          <p style="color: #666; margin-bottom: 20px;">Your massage therapy booking has been confirmed. Here are your booking details:</p>

          <h3 style="color: #003366; margin-top: 20px; margin-bottom: 10px;">Your Appointment</h3>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p><strong>Treatment:</strong> ${booking.treatment_name}</p>
            <p><strong>Duration:</strong> ${booking.duration_mins} minutes</p>
            <p><strong>Date:</strong> ${booking.date}</p>
            <p><strong>Time:</strong> ${formatTime(booking.start_time)}</p>
            <p><strong>Location:</strong> ${booking.client_address}, ${booking.client_postcode}</p>
          </div>

          <h3 style="color: #003366; margin-top: 20px; margin-bottom: 10px;">What's Next?</h3>
          <ul style="color: #666;">
            <li>Our therapist will arrive at your location at the scheduled time</li>
            <li>If you need to reschedule or cancel, please contact us as soon as possible</li>
            <li>For any questions, feel free to reach out before your appointment</li>
          </ul>

          <div style="background-color: #e8f4f8; border-left: 4px solid #003366; padding: 15px; margin: 20px 0;">
            <p style="color: #003366; margin: 0;"><strong>Questions?</strong> Contact us at info@maggsymassagetherapy.com or call for support.</p>
          </div>

          <p style="color: #666; margin-top: 30px;">We look forward to seeing you!</p>
          <p style="color: #666; font-weight: bold;">Maggy's Massage Therapy Team</p>

          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px;">This is an automated confirmation email. Please do not reply directly to this email.</p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error("Failed to send confirmation email to client:", emailError);
  }
}

function metadataMatchesBooking(
  paymentIntent: Stripe.PaymentIntent,
  booking: Awaited<ReturnType<typeof validateAndPrepareBooking>>["normalizedBooking"],
  paymentAttemptId: string,
  discountPercentage: number,
  baseAmountInPence: number,
  discountAmountInPence: number,
) {
  const voucherCode = booking.voucher_code || "";
  return (
    paymentIntent.metadata?.booking_flow === "joshsport_booking_v1" &&
    paymentIntent.metadata?.payment_attempt_id === paymentAttemptId &&
    paymentIntent.metadata?.treatment_id === booking.treatment_id &&
    paymentIntent.metadata?.date === booking.date &&
    paymentIntent.metadata?.start_time === booking.start_time &&
    paymentIntent.metadata?.duration_mins === String(booking.duration_mins) &&
    (paymentIntent.metadata?.voucher_code || "") === voucherCode &&
    paymentIntent.metadata?.discount_percentage === String(discountPercentage) &&
    paymentIntent.metadata?.base_amount_pence === String(baseAmountInPence) &&
    paymentIntent.metadata?.discount_amount_pence === String(discountAmountInPence)
  );
}

async function incrementVoucherUsage(voucherCode: string) {
  const normalizedCode = normalizeVoucherCode(voucherCode);
  if (!normalizedCode) return;

  const { data: voucher, error: voucherError } = await supabaseAdmin
    .from("vouchers")
    .select("id, uses_count")
    .eq("code", normalizedCode)
    .maybeSingle();

  if (voucherError || !voucher) {
    if (voucherError) console.error("Voucher usage lookup failed:", voucherError);
    return;
  }

  const { error } = await supabaseAdmin
    .from("vouchers")
    .update({ uses_count: (voucher.uses_count ?? 0) + 1 })
    .eq("id", voucher.id);

  if (error) {
    console.error("Voucher usage increment failed:", error);
  }
}

function isStripeLiveModeExpected() {
  if (process.env.STRIPE_EXPECT_LIVE_MODE === "true") return true;
  if (process.env.STRIPE_EXPECT_LIVE_MODE === "false") return false;
  return process.env.NODE_ENV === "production";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const paymentIntentId = typeof body.paymentIntentId === "string" ? body.paymentIntentId.trim() : "";
    const paymentAttemptId = typeof body.payment_attempt_id === "string" ? body.payment_attempt_id.trim() : "";

    if (!paymentIntentId) {
      return NextResponse.json({ error: "paymentIntentId is required." }, { status: 400 });
    }
    if (!paymentAttemptId) {
      return NextResponse.json({ error: "payment_attempt_id is required." }, { status: 400 });
    }

    const preparedBooking = await validateAndPrepareBooking(body);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json({ error: "Payment has not succeeded." }, { status: 400 });
    }

    if (paymentIntent.livemode !== isStripeLiveModeExpected()) {
      return NextResponse.json({ error: "Payment mode mismatch." }, { status: 400 });
    }

    if (paymentIntent.currency !== "gbp" || paymentIntent.amount !== preparedBooking.amountInPence) {
      return NextResponse.json({ error: "Payment amount mismatch." }, { status: 400 });
    }

    if (
      !metadataMatchesBooking(
        paymentIntent,
        preparedBooking.normalizedBooking,
        paymentAttemptId,
        preparedBooking.discountPercentage,
        preparedBooking.baseAmountInPence,
        preparedBooking.discountAmountInPence,
      )
    ) {
      return NextResponse.json({ error: "Payment details do not match this booking." }, { status: 400 });
    }

    const { data: existingBooking, error: existingBookingError } = await supabaseAdmin
      .from("bookings")
      .select("id, status, treatment_id, date, start_time, client_email")
      .eq("payment_intent_id", paymentIntentId)
      .maybeSingle();

    if (existingBookingError) throw existingBookingError;
    if (existingBooking) {
      if (
        existingBooking.treatment_id !== preparedBooking.normalizedBooking.treatment_id ||
        existingBooking.date !== preparedBooking.normalizedBooking.date ||
        existingBooking.start_time !== preparedBooking.normalizedBooking.start_time ||
        (existingBooking.client_email || "") !== (preparedBooking.normalizedBooking.client_email || "")
      ) {
        return NextResponse.json({ error: "This payment has already been used for another booking." }, { status: 409 });
      }
      return NextResponse.json({ id: existingBooking.id, status: existingBooking.status }, { status: 200 });
    }

    const insertPayload = {
      ...preparedBooking.normalizedBooking,
      voucher_code: preparedBooking.normalizedBooking.voucher_code || null,
      payment_intent_id: paymentIntentId,
      status: "confirmed",
    };

    const { data, error } = await supabaseAdmin.from("bookings").insert([insertPayload]).select().single();
    if (error) {
      if (error.code === "23505") {
        const { data: duplicateBooking } = await supabaseAdmin
          .from("bookings")
          .select("id, status")
          .eq("payment_intent_id", paymentIntentId)
          .maybeSingle();
        if (duplicateBooking) {
          return NextResponse.json({ id: duplicateBooking.id, status: duplicateBooking.status }, { status: 200 });
        }
      }
      throw error;
    }

    if (preparedBooking.normalizedBooking.voucher_code) {
      await incrementVoucherUsage(preparedBooking.normalizedBooking.voucher_code);
    }

    await sendBookingEmails(preparedBooking.normalizedBooking);

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof BookingValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    if (err instanceof Stripe.errors.StripeError) {
      console.error("Stripe payment validation failed:", err.message);
      return NextResponse.json({ error: "Unable to verify payment." }, { status: 400 });
    }

    console.error("Booking creation failed with error:", err);
    return NextResponse.json({ error: "Unable to create booking." }, { status: 500 });
  }
}
