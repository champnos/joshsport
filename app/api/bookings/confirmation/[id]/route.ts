import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isValidBookingConfirmationToken } from "@/lib/booking-confirmation";

interface RouteContext {
  params: { id: string };
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const token = new URL(request.url).searchParams.get("token") || "";
    if (!isValidBookingConfirmationToken(token, params.id)) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("id, status, voucher_code, base_amount_pence, discount_amount_pence, final_amount_pence")
      .eq("id", params.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (!["confirmed", "completed"].includes(data.status)) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    return NextResponse.json({
      id: data.id,
      status: data.status,
      voucher_code: data.voucher_code,
      base_amount_pence: data.base_amount_pence,
      discount_amount_pence: data.discount_amount_pence,
      final_amount_pence: data.final_amount_pence,
    });
  } catch (error) {
    console.error("Failed to load booking confirmation:", error);
    return NextResponse.json({ error: "Unable to load booking confirmation." }, { status: 500 });
  }
}
