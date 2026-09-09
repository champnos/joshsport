import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import {
  ensureRollingWorkingDates,
  isValidBlockedSlot,
  isValidDateKey,
  isValidTimeValue,
  normalizeTimeValue,
  timeToMinutes,
} from "@/lib/working-dates";
import type { NextRequest } from "next/server";

interface DateHours {
  date: string;
  available: boolean;
  start_time: string | null;
  end_time: string | null;
  blocked_slots: string[];
}

export async function GET(request: NextRequest) {
  try {
    await ensureRollingWorkingDates();

    const isAdmin = isAuthorizedAdminRequest(request);
    const client = isAdmin ? supabaseAdmin : supabase;
    let query = client
      .from("working_dates")
      .select("date, available, start_time, end_time, blocked_slots, booked_slots")
      .order("date", { ascending: true });

    if (!isAdmin) {
      query = query.eq("available", true);
    }

    const { data, error } = await query;

    if (error && error.code !== "PGRST116") throw error;

    const hours = data || [];
    const dates = hours.filter((row) => row.available).map((row) => row.date);

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
    const inputRows = Array.isArray(body.hours)
      ? body.hours
      : Array.isArray(body.dates)
        ? body.dates.map((date: string) => ({ date, available: true }))
        : null;

    if (!Array.isArray(inputRows)) {
      return NextResponse.json({ error: "Dates must be an array" }, { status: 400 });
    }

    const selectedDates = new Set(
      Array.isArray(body.dates)
        ? body.dates
            .filter((value: unknown): value is string => typeof value === "string")
            .map((value: string) => value.trim())
        : [],
    );

    const dedupedRows = new Map<string, DateHours>();

    for (const row of inputRows) {
      const date = typeof row?.date === "string" ? row.date.trim() : "";
      const startTime = normalizeTimeValue(typeof row?.start_time === "string" ? row.start_time.trim() : null);
      const endTime = normalizeTimeValue(typeof row?.end_time === "string" ? row.end_time.trim() : null);
      const blockedSlots = Array.isArray(row?.blocked_slots)
        ? row.blocked_slots
            .filter((slot: unknown): slot is string => typeof slot === "string")
            .map((slot: string) => slot.trim())
        : [];

      if (!isValidDateKey(date)) {
        return NextResponse.json({ error: `Invalid date: ${date}` }, { status: 400 });
      }

      if (startTime && !isValidTimeValue(startTime)) {
        return NextResponse.json({ error: `Invalid start time for ${date}` }, { status: 400 });
      }

      if (endTime && !isValidTimeValue(endTime)) {
        return NextResponse.json({ error: `Invalid end time for ${date}` }, { status: 400 });
      }

      if (startTime && endTime && timeToMinutes(startTime) >= timeToMinutes(endTime)) {
        return NextResponse.json({ error: `Start time must be before end time for ${date}` }, { status: 400 });
      }

      if (!blockedSlots.every(isValidBlockedSlot)) {
        return NextResponse.json({ error: `Invalid blocked slot for ${date}` }, { status: 400 });
      }

      dedupedRows.set(date, {
        date,
        available: typeof row?.available === "boolean" ? row.available : selectedDates.has(date),
        start_time: startTime,
        end_time: endTime,
        blocked_slots: blockedSlots,
      });
    }

    await ensureRollingWorkingDates();

    const rows = Array.from(dedupedRows.values()).sort((a, b) => a.date.localeCompare(b.date));
    const { error: upsertError } = await supabaseAdmin.from("working_dates").upsert(rows, { onConflict: "date" });

    if (upsertError) throw upsertError;

    return NextResponse.json(
      {
        dates: rows.filter((row) => row.available).map((row) => row.date),
        hours: rows,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Failed to update working dates:", err);
    const errorMessage =
      typeof err === "object" && err !== null && "message" in err && typeof err.message === "string"
        ? err.message
        : "Unable to update working dates.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
