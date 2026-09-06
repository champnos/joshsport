import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();

    const { data, error } = await supabase
      .from("working_dates")
      .select("date")
      .order("date", { ascending: true });

    if (error && error.code !== "PGRST116") throw error;

    const dates = data?.map((row) => row.date) || [];
    return NextResponse.json({ dates }, { status: 200 });
  } catch (err) {
    console.error("Failed to fetch working dates:", err);
    return NextResponse.json({ dates: [] }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();

    const body = await request.json();
    const { dates } = body;

    if (!Array.isArray(dates)) {
      return NextResponse.json({ error: "Dates must be an array" }, { status: 400 });
    }

    // Delete all existing working dates
    await supabase.from("working_dates").delete().gt("date", "1900-01-01");

    // Insert new working dates
    if (dates.length > 0) {
      const { error: insertError } = await supabase
        .from("working_dates")
        .insert(dates.map((date) => ({ date })));

      if (insertError) throw insertError;
    }

    return NextResponse.json({ dates }, { status: 200 });
  } catch (err) {
    console.error("Failed to update working dates:", err);
    return NextResponse.json({ error: "Unable to update working dates." }, { status: 500 });
  }
}
