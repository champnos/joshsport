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
  const logValidationResult = (isValid: boolean, reason: string, details: Record<string, unknown> = {}) => {
    console.error("Booking checkout token validation result:", {
      bookingId,
      clientPhone,
      clientEmail,
      isValid,
      reason,
      ...details,
    });
    return isValid;
  };

  const separatorIndex = token.indexOf(".");
  if (separatorIndex === -1) {
    return logValidationResult(false, "invalid_token_format", { separatorIndex });
  }

  const expiresAt = token.slice(0, separatorIndex);
  const providedSignature = token.slice(separatorIndex + 1);
  if (!expiresAt || !providedSignature) {
    return logValidationResult(false, "missing_token_parts", {
      separatorIndex,
      hasExpiresAt: Boolean(expiresAt),
      hasProvidedSignature: Boolean(providedSignature),
    });
  }

  const expiresAtTime = Date.parse(expiresAt);
  const currentTime = Date.now();
  if (!Number.isFinite(expiresAtTime) || expiresAtTime < currentTime) {
    return logValidationResult(false, "invalid_or_expired_token", {
      expiresAt,
      expiresAtTime,
      currentTime,
    });
  }

  const expectedToken = signBookingCheckoutToken(bookingId, clientPhone, clientEmail, expiresAt);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedToken);

  if (providedBuffer.length !== expectedBuffer.length) {
    return logValidationResult(false, "signature_length_mismatch", {
      expectedSignature: expectedToken,
      providedSignature,
      expectedBufferLength: expectedBuffer.length,
      providedBufferLength: providedBuffer.length,
    });
  }

  const isSignatureValid = timingSafeEqual(providedBuffer, expectedBuffer);
  if (!isSignatureValid) {
    return logValidationResult(false, "signature_mismatch", {
      expectedSignature: expectedToken,
      providedSignature,
    });
  }

  return logValidationResult(true, "token_valid", { expiresAt, expiresAtTime, currentTime });
}
