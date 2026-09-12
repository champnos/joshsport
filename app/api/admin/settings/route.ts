import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { DEFAULT_MAX_TRAVEL_DISTANCE_MILES } from "@/lib/distance-check";
import { isValidUkPostcode, normalizePostcode } from "@/lib/booking-rules";

const DEFAULT_SETTINGS = {
  booking_window_days: 30,
  buffer_mins_after_booking: 30,
  default_start_time: "09:00",
  default_end_time: "17:00",
  therapist_postcode: "",
  max_travel_distance_miles: DEFAULT_MAX_TRAVEL_DISTANCE_MILES,
};

async function upsertSetting(key: string, value: string) {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .upsert({ key, value }, { onConflict: "key" })
    .select("key")
    .single();

  if (error || !data) throw error ?? new Error(`Failed to save setting: ${key}`);
}

function parseNumberSetting(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from("settings")
      .select("key, value")
      .in("key", [
        "booking_window_days",
        "buffer_mins_after_booking",
        "default_start_time",
        "default_end_time",
        "therapist_postcode",
        "max_travel_distance_miles",
      ]);

    if (error) throw error;

    const values = new Map((data ?? []).map((row) => [row.key, row.value]));
    const response = {
      booking_window_days: parseNumberSetting(values.get("booking_window_days"), DEFAULT_SETTINGS.booking_window_days),
      buffer_mins_after_booking: parseNumberSetting(
        values.get("buffer_mins_after_booking"),
        DEFAULT_SETTINGS.buffer_mins_after_booking,
      ),
      default_start_time: values.get("default_start_time") || DEFAULT_SETTINGS.default_start_time,
      default_end_time: values.get("default_end_time") || DEFAULT_SETTINGS.default_end_time,
      max_travel_distance_miles: parseNumberSetting(
        values.get("max_travel_distance_miles"),
        DEFAULT_SETTINGS.max_travel_distance_miles,
      ),
    };

    if (isAuthorizedAdminRequest(request)) {
      return NextResponse.json(
        {
          ...response,
          therapist_postcode: normalizePostcode(values.get("therapist_postcode") || ""),
        },
        { status: 200 },
      );
    }

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    console.error("Failed to fetch settings:", err);
    const fallback = {
      booking_window_days: DEFAULT_SETTINGS.booking_window_days,
      buffer_mins_after_booking: DEFAULT_SETTINGS.buffer_mins_after_booking,
      default_start_time: DEFAULT_SETTINGS.default_start_time,
      default_end_time: DEFAULT_SETTINGS.default_end_time,
      max_travel_distance_miles: DEFAULT_SETTINGS.max_travel_distance_miles,
    };

    if (isAuthorizedAdminRequest(request)) {
      return NextResponse.json({ ...fallback, therapist_postcode: DEFAULT_SETTINGS.therapist_postcode }, { status: 200 });
    }

    return NextResponse.json(fallback, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();

    const body = await request.json();
    const { booking_window_days, buffer_mins_after_booking, default_start_time, default_end_time, therapist_postcode, max_travel_distance_miles } = body;

    if (
      booking_window_days === undefined ||
      buffer_mins_after_booking === undefined ||
      default_start_time === undefined ||
      default_end_time === undefined ||
      therapist_postcode === undefined ||
      max_travel_distance_miles === undefined
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedTherapistPostcode =
      typeof therapist_postcode === "string" ? normalizePostcode(therapist_postcode) : "";
    const normalizedMaxDistance = Number.parseInt(String(max_travel_distance_miles), 10);

    if (normalizedTherapistPostcode && !isValidUkPostcode(normalizedTherapistPostcode)) {
      return NextResponse.json({ error: "Therapist postcode must be a valid UK postcode." }, { status: 400 });
    }

    if (!Number.isFinite(normalizedMaxDistance) || normalizedMaxDistance < 0 || normalizedMaxDistance > 30) {
      return NextResponse.json({ error: "Maximum travel distance must be between 0 and 30 miles." }, { status: 400 });
    }

    await Promise.all([
      upsertSetting("booking_window_days", String(booking_window_days)),
      upsertSetting("buffer_mins_after_booking", String(buffer_mins_after_booking)),
      upsertSetting("default_start_time", String(default_start_time)),
      upsertSetting("default_end_time", String(default_end_time)),
      upsertSetting("therapist_postcode", normalizedTherapistPostcode),
      upsertSetting("max_travel_distance_miles", String(normalizedMaxDistance)),
    ]);

    return NextResponse.json(
      {
        booking_window_days,
        buffer_mins_after_booking,
        default_start_time,
        default_end_time,
        therapist_postcode: normalizedTherapistPostcode,
        max_travel_distance_miles: normalizedMaxDistance,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Failed to update settings:", err);
    return NextResponse.json({ error: "Unable to update settings." }, { status: 500 });
  }
}
