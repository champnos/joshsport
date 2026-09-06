import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { getAvailableSlots } from "@/lib/availability";

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();
    const { data, error } = await supabase.from("bookings").select("*").order("date").order("start_time");
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json({ error: "Unable to load bookings." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { treatment_id, date, start_time, duration_mins } = body;
    const client_name = typeof body.client_name === "string" ? body.client_name.trim() : "";
    const client_dob = typeof body.client_dob === "string" ? body.client_dob.trim() : "";
    const client_phone = typeof body.client_phone === "string" ? body.client_phone.trim() : "";
    const client_address = typeof body.client_address === "string" ? body.client_address.trim() : "";
    const client_postcode = typeof body.client_postcode === "string" ? body.client_postcode.trim() : "";

    const dobMatch = client_dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    let isValidDob = false;
    if (dobMatch) {
      const year = Number(dobMatch[1]);
      const month = Number(dobMatch[2]);
      const day = Number(dobMatch[3]);
      const parsedDob = new Date(Date.UTC(year, month - 1, day));
      isValidDob =
        parsedDob.getUTCFullYear() === year &&
        parsedDob.getUTCMonth() === month - 1 &&
        parsedDob.getUTCDate() === day;
    }
    const clientPhoneDigits = client_phone.replace(/\D/g, "");
    const isValidPhone = /^\+?[0-9\s\-()]{7,20}$/.test(client_phone) && clientPhoneDigits.length >= 7;

    if (
      !treatment_id ||
      !date ||
      !start_time ||
      !duration_mins ||
      !client_name ||
      !client_dob ||
      !client_phone ||
      !client_address ||
      !client_postcode
    ) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    if (!isValidDob) {
      return NextResponse.json({ error: "Date of birth must be a valid date in YYYY-MM-DD format." }, { status: 400 });
    }

    if (!isValidPhone) {
      return NextResponse.json({ error: "Phone number must be a valid phone format." }, { status: 400 });
    }

    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("start_time, duration_mins")
      .eq("date", date)
      .neq("status", "cancelled");

    const available = getAvailableSlots(date, duration_mins, existingBookings ?? []);
    if (!available.includes(start_time)) {
      return NextResponse.json({ error: "Selected time is no longer available." }, { status: 409 });
    }

    const insertPayload = {
      treatment_id,
      treatment_name: body.treatment_name,
      duration_mins,
      date,
      start_time,
      client_name,
      client_dob,
      client_phone,
      client_address,
      client_postcode,
      emergency_name: typeof body.emergency_name === "string" ? body.emergency_name.trim() : "",
      emergency_relationship: typeof body.emergency_relationship === "string" ? body.emergency_relationship.trim() : "",
      emergency_phone: typeof body.emergency_phone === "string" ? body.emergency_phone.trim() : "",
      medical_conditions: Array.isArray(body.medical_conditions) ? body.medical_conditions : [],
      medical_notes: typeof body.medical_notes === "string" ? body.medical_notes.trim() : "",
      injury_recent: typeof body.injury_recent === "boolean" ? body.injury_recent : false,
      injury_recent_notes: typeof body.injury_recent_notes === "string" ? body.injury_recent_notes.trim() : "",
      injury_previous: typeof body.injury_previous === "boolean" ? body.injury_previous : false,
      injury_previous_notes: typeof body.injury_previous_notes === "string" ? body.injury_previous_notes.trim() : "",
      status: "pending",
    };

    const { data, error } = await supabase.from("bookings").insert([insertPayload]).select().single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create booking." }, { status: 500 });
  }
}
