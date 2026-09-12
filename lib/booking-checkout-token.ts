import { createHmac, timingSafeEqual } from "crypto";

export const BOOKING_CHECKOUT_TOKEN_TTL_MS = 30 * 60 * 1000;

function getCheckoutTokenSecret() {
  const secret = process.env.BOOKING_CHECKOUT_TOKEN_SECRET || "";
  if (!secret) {
    throw new Error("Missing booking checkout token secret.");
  }
  return secret;
}

function signBookingCheckoutToken(bookingId: string, clientPhone: string, clientEmail: string, expiresAt: string) {
  return createHmac("sha256", getCheckoutTokenSecret())
    .update([bookingId, clientPhone, clientEmail, expiresAt].join(":"))
    .digest("hex");
}

export function createBookingCheckoutTokenForBooking(bookingId: string, clientPhone: string, clientEmail: string) {
  const expiresAt = new Date(Date.now() + BOOKING_CHECKOUT_TOKEN_TTL_MS).toISOString();
  const signature = signBookingCheckoutToken(bookingId, clientPhone, clientEmail, expiresAt);
  return `${expiresAt}.${signature}`;
}

export function verifyBookingCheckoutToken(bookingId: string, clientPhone: string, clientEmail: string, token: string) {
  const separatorIndex = token.indexOf(".");
  if (separatorIndex === -1) return false;

  const expiresAt = token.slice(0, separatorIndex);
  const providedSignature = token.slice(separatorIndex + 1);
  if (!expiresAt || !providedSignature) return false;

  const expiresAtTime = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtTime) || expiresAtTime < Date.now()) return false;

  const expectedToken = signBookingCheckoutToken(bookingId, clientPhone, clientEmail, expiresAt);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedToken);

  if (providedBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(providedBuffer, expectedBuffer);
}
