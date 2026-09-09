import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

interface DateHours {
  date: string;
  start_time: string | null;
  end_time: string | null;
  is_off: boolean;
  blocked_slots: string[];
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("working_dates")
      .select("*")
      .order("date", { ascending: true });

    if (error && error.code !== "PGRST116") throw error;

    const dates = data?.map((row) => row.date) || [];
    const hours = data || [];

    return NextResponse.json({ dates, hours }, { status: 200 });
  } catch (err) {
    console.error("Failed to fetch working dates:", err);
    return NextResponse.json({ dates: [], hours: [] }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();

    const body = await request.json();
    const { dates, hours } = body;

    if (!Array.isArray(dates)) {
      return NextResponse.json({ error: "Dates must be an array" }, { status: 400 });
    }

    // Delete all existing working dates
    await supabaseAdmin.from("working_dates").delete().gt("date", "1900-01-01");

    // Insert new working dates with hours
    if (hours && Array.isArray(hours) && hours.length > 0) {
      const formattedHours = hours.map((h: DateHours) => ({
        date: h.date,
        start_time: h.start_time || null,
        end_time: h.end_time || null,
        is_off: h.is_off || false,
        blocked_slots: h.blocked_slots || [],
      }));

      const { error: insertError } = await supabaseAdmin
        .from("working_dates")
        .insert(formattedHours);

      if (insertError) throw insertError;
    } else if (dates.length > 0) {
      // Fallback: insert simple dates if no hours provided
      const { error: insertError } = await supabaseAdmin
        .from("working_dates")
        .insert(dates.map((date: string) => ({ date })));

      if (insertError) throw insertError;
    }

    return NextResponse.json({ dates, hours: hours || [] }, { status: 200 });
  } catch (err) {
    console.error("Failed to update working dates:", err);
    return NextResponse.json({ error: "Unable to update working dates." }, { status: 500 });
  }
}
