import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyBookingCheckoutToken } from "@/lib/booking-checkout-token";
import { sendBookingEmails } from "@/lib/booking-emails";
import type { Booking } from "@/lib/types";

interface RouteContext {
  params: { bookingId: string };
}

function normalizeEmail(emailValue: string | null) {
  return typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
}

function toBookingResponse(data: {
  id: string;
  status: string;
  voucher_code: string | null;
  base_amount_pence: number | null;
  discount_amount_pence: number | null;
  final_amount_pence: number | null;
}) {
  return {
    id: data.id,
    status: data.status,
    voucher_code: data.voucher_code,
    base_amount_pence: data.base_amount_pence,
    discount_amount_pence: data.discount_amount_pence,
    final_amount_pence: data.final_amount_pence,
  };
}

async function loadBooking(bookingId: string) {
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function incrementVoucherUsageIfNeeded(booking: { id: string; voucher_code?: string | null }) {
  if (!booking.voucher_code) return;

  const { data: incremented, error: voucherUsageError } = await supabaseAdmin.rpc("increment_voucher_usage", {
    voucher_code_input: booking.voucher_code,
  });

  if (voucherUsageError || incremented !== true) {
    console.error("Voucher usage increment failed after booking confirmation", {
      voucherCode: booking.voucher_code,
      bookingId: booking.id,
      voucherUsageError,
    });
  }
}

async function confirmBookingIfNeeded(booking: Booking) {
  if (booking.status === "confirmed" || booking.status === "completed") {
    return booking;
  }

  if (booking.status !== "pending_payment") {
    return null;
  }

  const { data: updatedBooking, error } = await supabaseAdmin
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", booking.id)
    .eq("status", "pending_payment")
    .select("*")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      const currentBooking = await loadBooking(booking.id);
      if (currentBooking && (currentBooking.status === "confirmed" || currentBooking.status === "completed")) {
        return currentBooking;
      }
      return null;
    }

    throw error;
  }

  await incrementVoucherUsageIfNeeded(updatedBooking);
  await sendBookingEmails(updatedBooking);
  return updatedBooking;
}

async function confirmBookingWithCheckoutToken(bookingId: string, checkoutToken: string) {
  const booking = await loadBooking(bookingId);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const normalizedClientEmail = normalizeEmail(booking.client_email ?? null);
  const isCheckoutTokenValid = verifyBookingCheckoutToken(
    bookingId,
    booking.client_phone ?? "",
    normalizedClientEmail,
    checkoutToken,
  );

  if (!isCheckoutTokenValid) {
    return NextResponse.json({ error: "Invalid checkout token" }, { status: 403 });
  }

  const confirmedBooking = await confirmBookingIfNeeded(booking);
  if (!confirmedBooking) {
    return NextResponse.json({ error: "Booking is not awaiting payment" }, { status: 409 });
  }

  return NextResponse.json({ success: true, ...toBookingResponse(confirmedBooking) });
}

async function getCheckoutTokenFromBody(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const body = await request.json();
      if (typeof body?.checkoutToken === "string") return body.checkoutToken.trim();
      if (typeof body?.token === "string") return body.token.trim();
      return "";
    }

    const formData = await request.formData();
    const checkoutToken = formData.get("checkoutToken");
    if (typeof checkoutToken === "string") return checkoutToken.trim();
    const token = formData.get("token");
    return typeof token === "string" ? token.trim() : "";
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const checkoutToken = await getCheckoutTokenFromBody(request);
    if (!checkoutToken) {
      return NextResponse.json({ error: "Invalid checkout token" }, { status: 403 });
    }

    return await confirmBookingWithCheckoutToken(params.bookingId, checkoutToken);
  } catch (error) {
    console.error("Failed to confirm booking:", error);
    return NextResponse.json({ error: "Unable to confirm booking." }, { status: 500 });
  }
}
