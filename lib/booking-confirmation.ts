import { createHmac, timingSafeEqual } from "crypto";

function getConfirmationSecret() {
  return process.env.BOOKING_CONFIRMATION_SECRET || "";
}

const BOOKING_CONFIRMATION_TTL_SECONDS = 60 * 60 * 24;

function signValue(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function createBookingConfirmationToken(bookingId: string) {
  const secret = getConfirmationSecret();
  if (!secret || !bookingId) return "";
  const expiresAt = Math.floor(Date.now() / 1000) + BOOKING_CONFIRMATION_TTL_SECONDS;
  const payload = `${bookingId}:${expiresAt}`;
  return `${expiresAt}.${signValue(payload, secret)}`;
}

export function isValidBookingConfirmationToken(token: string, bookingId: string) {
  const secret = getConfirmationSecret();
  if (!token || !bookingId || !secret) return false;

  const [expiresAtRaw, signature] = token.split(".");
  const expiresAt = Number.parseInt(expiresAtRaw || "", 10);
  if (!expiresAtRaw || !signature || !Number.isFinite(expiresAt)) return false;
  if (expiresAt < Math.floor(Date.now() / 1000)) return false;

  const expected = signValue(`${bookingId}:${expiresAt}`, secret);

  try {
    const provided = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (provided.length !== expectedBuffer.length) return false;
    return timingSafeEqual(provided, expectedBuffer);
  } catch {
    return false;
  }
}
