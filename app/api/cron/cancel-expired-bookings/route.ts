import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const CRON_SECRET = process.env.CRON_SECRET;
const PENDING_BOOKING_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export async function GET(request: Request) {
  try {
    // Verify the cron secret to prevent unauthorized calls
    const authHeader = request.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cutoffTime = new Date(Date.now() - PENDING_BOOKING_TIMEOUT_MS).toISOString();

    // Find all pending_payment bookings older than 30 minutes
    const { data: expiredBookings, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("id, date, start_time, status")
      .eq("status", "pending_payment")
      .lt("created_at", cutoffTime);

    if (fetchError) throw fetchError;

    if (!expiredBookings || expiredBookings.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No expired pending bookings found" 
      });
    }

    // Cancel all expired bookings
    const { error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("status", "pending_payment")
      .lt("created_at", cutoffTime);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: `Cancelled ${expiredBookings.length} expired pending bookings`,
      cancelledCount: expiredBookings.length,
    });
  } catch (err) {
    console.error("Pending booking cleanup failed:", err);
    return NextResponse.json(
      { 
        error: "Pending booking cleanup failed",
        details: err instanceof Error ? err.message : String(err)
      },
      { status: 500 }
    );
  }
}
