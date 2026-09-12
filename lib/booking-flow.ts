import { getAgeValidation } from "@/lib/booking-rules";
import { getDistanceValidationErrorStatus, validateBookingDistance, type DistanceCheckResult } from "@/lib/distance-check";
import { supabase } from "@/lib/supabase";
import { ensureRollingWorkingDates, getBookableSlots, getBookingSettings } from "@/lib/working-dates";

interface NormalizedBooking {
  treatment_id: string;
  treatment_name: string;
  duration_mins: number;
  date: string;
  start_time: string;
  client_name: string;
  client_dob: string;
  client_phone: string;
  client_address: string;
  client_postcode: string;
  client_email: string;
  emergency_name: string;
  emergency_relationship: string;
  emergency_phone: string;
  medical_conditions: string[];
  medical_notes: string;
  injury_recent: boolean;
  injury_recent_notes: string;
  injury_previous: boolean;
  injury_previous_notes: string;
}

export interface PreparedBooking {
  normalizedBooking: NormalizedBooking;
  distanceCheck: DistanceCheckResult;
  amountInPence: number;
}

export class BookingValidationError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BookingValidationError";
    this.status = status;
  }
}

function normalizeBooking(body: Record<string, unknown>): NormalizedBooking {
  const rawDuration = Number(body.duration_mins);

  return {
    treatment_id: typeof body.treatment_id === "string" ? body.treatment_id.trim() : "",
    treatment_name: typeof body.treatment_name === "string" ? body.treatment_name.trim() : "",
    duration_mins: Number.isFinite(rawDuration) ? rawDuration : 0,
    date: typeof body.date === "string" ? body.date.trim() : "",
    start_time: typeof body.start_time === "string" ? body.start_time.trim() : "",
    client_name: typeof body.client_name === "string" ? body.client_name.trim() : "",
    client_dob: typeof body.client_dob === "string" ? body.client_dob.trim() : "",
    client_phone: typeof body.client_phone === "string" ? body.client_phone.trim() : "",
    client_address: typeof body.client_address === "string" ? body.client_address.trim() : "",
    client_postcode: typeof body.client_postcode === "string" ? body.client_postcode.trim() : "",
    client_email: typeof body.client_email === "string" ? body.client_email.trim().toLowerCase() : "",
    emergency_name: typeof body.emergency_name === "string" ? body.emergency_name.trim() : "",
    emergency_relationship: typeof body.emergency_relationship === "string" ? body.emergency_relationship.trim() : "",
    emergency_phone: typeof body.emergency_phone === "string" ? body.emergency_phone.trim() : "",
    medical_conditions: Array.isArray(body.medical_conditions)
      ? body.medical_conditions.filter((entry): entry is string => typeof entry === "string")
      : [],
    medical_notes: typeof body.medical_notes === "string" ? body.medical_notes.trim() : "",
    injury_recent: typeof body.injury_recent === "boolean" ? body.injury_recent : false,
    injury_recent_notes: typeof body.injury_recent_notes === "string" ? body.injury_recent_notes.trim() : "",
    injury_previous: typeof body.injury_previous === "boolean" ? body.injury_previous : false,
    injury_previous_notes: typeof body.injury_previous_notes === "string" ? body.injury_previous_notes.trim() : "",
  };
}

function getDurationPrice(durations: unknown, durationMins: number) {
  if (!Array.isArray(durations)) return null;

  const match = durations
    .filter((entry): entry is { mins?: unknown; price?: unknown } => typeof entry === "object" && entry !== null)
    .find((entry) => Number(entry.mins) === durationMins);

  if (!match) return null;
  const price = Number(match.price);
  return Number.isFinite(price) && price > 0 ? price : null;
}

export async function validateAndPrepareBooking(body: unknown): Promise<PreparedBooking> {
  if (!body || typeof body !== "object") {
    throw new BookingValidationError("Invalid booking payload.", 400);
  }

  const normalizedBooking = normalizeBooking(body as Record<string, unknown>);
  const termsAccepted = (body as Record<string, unknown>).terms_accepted === true;

  const {
    treatment_id,
    duration_mins,
    date,
    start_time,
    client_name,
    client_dob,
    client_phone,
    client_address,
    client_postcode,
  } = normalizedBooking;

  if (!treatment_id || !date || !start_time || !duration_mins || !client_name || !client_dob || !client_phone || !client_address || !client_postcode) {
    throw new BookingValidationError("Missing required fields.", 400);
  }

  const ageValidation = getAgeValidation(client_dob);
  if (!ageValidation.isAdult) {
    throw new BookingValidationError(ageValidation.error || "You must be at least 18 years old to book a massage.", 400);
  }

  if (!termsAccepted) {
    throw new BookingValidationError("You must accept the terms and conditions before booking.", 400);
  }

  const hasLeadingPlus = client_phone.startsWith("+");
  const normalizedPhone = `${hasLeadingPlus ? "+" : ""}${client_phone.replace(/\D/g, "")}`;
  if (!/^\+?\d{7,15}$/.test(normalizedPhone)) {
    throw new BookingValidationError(
      "Phone number must contain 7-15 digits (optional leading +; spaces, hyphens, and parentheses allowed).",
      400,
    );
  }

  await ensureRollingWorkingDates();

  const { data: workingDateData, error: workingDateError } = await supabase
    .from("working_dates")
    .select("date, available, start_time, end_time, blocked_slots")
    .eq("date", date)
    .single();

  if (workingDateError && workingDateError.code !== "PGRST116") {
    throw workingDateError;
  }

  if (!workingDateData) {
    throw new BookingValidationError("Selected date is not available for bookings.", 409);
  }

  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("start_time, duration_mins")
    .eq("date", date)
    .neq("status", "cancelled");

  const settings = await getBookingSettings();
  const available = getBookableSlots(date, duration_mins, workingDateData, existingBookings ?? [], settings);
  if (!available.includes(start_time)) {
    throw new BookingValidationError("Selected time is no longer available.", 409);
  }

  let distanceCheck: DistanceCheckResult;
  try {
    distanceCheck = await validateBookingDistance(client_postcode);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to check service area.";
    throw new BookingValidationError(message, getDistanceValidationErrorStatus(message));
  }

  if (!distanceCheck.withinRange) {
    throw new BookingValidationError(
      distanceCheck.maxTravelDistanceMiles === 0
        ? "Bookings are currently limited to the therapist postcode only."
        : `This postcode is ${distanceCheck.distanceMiles.toFixed(1)} miles away, which is outside the ${distanceCheck.maxTravelDistanceMiles}-mile service area.`,
      400,
    );
  }

  const { data: treatment, error: treatmentError } = await supabase
    .from("treatments")
    .select("id, name, durations, active")
    .eq("id", treatment_id)
    .eq("active", true)
    .single();

  if (treatmentError || !treatment) {
    throw new BookingValidationError("Selected treatment is not available.", 400);
  }

  const treatmentPrice = getDurationPrice(treatment.durations, duration_mins);
  if (treatmentPrice === null) {
    throw new BookingValidationError("Selected treatment duration is not available.", 400);
  }

  return {
    normalizedBooking: {
      ...normalizedBooking,
      treatment_name: treatment.name,
      client_postcode: distanceCheck.normalizedPostcode,
      client_phone: normalizedPhone,
    },
    distanceCheck,
    amountInPence: Math.round(treatmentPrice * 100),
  };
}
