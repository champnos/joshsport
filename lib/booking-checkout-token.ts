import { createHmac, timingSafeEqual } from "crypto";

function getCheckoutTokenSecret() {
  const secret = process.env.BOOKING_CHECKOUT_TOKEN_SECRET || process.env.STRIPE_SECRET_KEY || "";
  if (!secret) {
    throw new Error("Missing booking checkout token secret.");
  }
  return secret;
}

export function createBookingCheckoutToken(bookingId: string) {
  return createHmac("sha256", getCheckoutTokenSecret()).update(bookingId).digest("hex");
}

export function verifyBookingCheckoutToken(bookingId: string, token: string) {
  const expectedToken = createBookingCheckoutToken(bookingId);
  const providedBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expectedToken);

  if (providedBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(providedBuffer, expectedBuffer);
}
