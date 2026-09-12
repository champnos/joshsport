import { supabaseAdmin } from "@/lib/supabase-admin";
import { isValidUkPostcode, normalizePostcode } from "@/lib/booking-rules";

export const DEFAULT_MAX_TRAVEL_DISTANCE_MILES = 10;

interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ServiceAreaSettings {
  therapistPostcode: string;
  maxTravelDistanceMiles: number;
}

export interface DistanceCheckResult {
  normalizedPostcode: string;
  distanceMiles: number;
  maxTravelDistanceMiles: number;
  withinRange: boolean;
}

export function getDistanceValidationErrorStatus(message: string) {
  if (message.includes("valid UK postcode")) return 400;
  if (message.includes("not configured")) return 503;
  return 502;
}

async function lookupPostcodeCoordinates(postcode: string): Promise<Coordinates> {
  const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const payload = await response.json();

  if (!response.ok || payload?.status !== 200 || !payload?.result) {
    throw new Error("Unable to validate that postcode.");
  }

  const latitude = Number(payload.result.latitude);
  const longitude = Number(payload.result.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Unable to validate that postcode.");
  }

  return { latitude, longitude };
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceInMiles(from: Coordinates, to: Coordinates) {
  const earthRadiusMiles = 3958.7613;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
}

export async function getServiceAreaSettings(): Promise<ServiceAreaSettings> {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("key, value")
    .in("key", ["therapist_postcode", "max_travel_distance_miles"]);

  if (error) throw error;

  const values = new Map((data ?? []).map((row) => [row.key, row.value]));
  const therapistPostcode = normalizePostcode(values.get("therapist_postcode") ?? "");
  const parsedMaxDistance = Number.parseInt(values.get("max_travel_distance_miles") ?? "", 10);
  const maxTravelDistanceMiles = Number.isFinite(parsedMaxDistance)
    ? parsedMaxDistance
    : DEFAULT_MAX_TRAVEL_DISTANCE_MILES;

  return {
    therapistPostcode,
    maxTravelDistanceMiles,
  };
}

export async function validateBookingDistance(postcode: string): Promise<DistanceCheckResult> {
  const normalizedPostcode = normalizePostcode(postcode);
  if (!isValidUkPostcode(normalizedPostcode)) {
    throw new Error("Please enter a valid UK postcode.");
  }

  const settings = await getServiceAreaSettings();
  if (!settings.therapistPostcode || !isValidUkPostcode(settings.therapistPostcode)) {
    throw new Error("Service area settings are not configured yet. Please contact us before booking.");
  }

  const [clientCoordinates, therapistCoordinates] = await Promise.all([
    lookupPostcodeCoordinates(normalizedPostcode),
    lookupPostcodeCoordinates(settings.therapistPostcode),
  ]);

  const distanceMiles = distanceInMiles(therapistCoordinates, clientCoordinates);
  const withinRange =
    settings.maxTravelDistanceMiles === 0
      ? normalizedPostcode === settings.therapistPostcode
      : distanceMiles <= settings.maxTravelDistanceMiles;

  return {
    normalizedPostcode,
    distanceMiles: Number(distanceMiles.toFixed(1)),
    maxTravelDistanceMiles: settings.maxTravelDistanceMiles,
    withinRange,
  };
}
