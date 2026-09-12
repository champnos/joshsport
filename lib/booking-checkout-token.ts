import { createHmac, timingSafeEqual } from "crypto";

export const BOOKING_CHECKOUT_TOKEN_TTL_MS = 30 * 60 * 1000;

function getCheckoutTokenSecret() {
  const secret = process.env.BOOKING_CHECKOUT_TOKEN_SECRET || "";
  if (!secret) {
    throw new Error("Missing booking checkout token secret.");
  }
  return secret;
}

function signBookingCheckoutToken(bookingId: string, clientPhone: string, clientEmail: string, expiresAt: string | number) {
  return createHmac("sha256", getCheckoutTokenSecret())
    .update([bookingId, clientPhone, clientEmail, String(expiresAt)].join(":"))
    .digest("hex");
}

export function createBookingCheckoutTokenForBooking(bookingId: string, clientPhone: string, clientEmail: string) {
  const expiresAt = Date.now() + BOOKING_CHECKOUT_TOKEN_TTL_MS;
  const signature = signBookingCheckoutToken(bookingId, clientPhone, clientEmail, expiresAt);
  return `${expiresAt}.${signature}`;
}

function parseBookingCheckoutTokenExpiry(expiresAt: string) {
  if (/^\d+$/.test(expiresAt)) {
    return Number(expiresAt);
  }

  const parsedLegacyTimestamp = Date.parse(expiresAt);
  return Number.isFinite(parsedLegacyTimestamp) ? parsedLegacyTimestamp : Number.NaN;
}

function parseBookingCheckoutToken(token: string) {
  const dotSeparatorIndex = token.lastIndexOf(".");
  if (dotSeparatorIndex !== -1) {
    const providedSignature = token.slice(dotSeparatorIndex + 1);
    if (/^[a-f0-9]{64}$/i.test(providedSignature)) {
      return {
        expiresAt: token.slice(0, dotSeparatorIndex),
        providedSignature,
        format: "dot",
      } as const;
    }
  }

  const colonSeparatorIndex = token.lastIndexOf(":");
  if (colonSeparatorIndex !== -1) {
    const providedSignature = token.slice(colonSeparatorIndex + 1);
    if (!/^[a-f0-9]{64}$/i.test(providedSignature)) {
      return null;
    }
    return {
      expiresAt: token.slice(0, colonSeparatorIndex),
      providedSignature,
      format: "colon",
    } as const;
  }

  return null;
}

export function verifyBookingCheckoutToken(bookingId: string, clientPhone: string, clientEmail: string, token: string) {
  const logValidationResult = (isValid: boolean, reason: string, details: Record<string, unknown> = {}) => {
    console.error("Booking checkout token validation result:", {
      bookingId,
      hasClientPhone: Boolean(clientPhone),
      hasClientEmail: Boolean(clientEmail),
      isValid,
      reason,
      ...details,
    });
    return isValid;
  };

  const tokenParts = parseBookingCheckoutToken(token);
  if (!tokenParts) {
    return logValidationResult(false, "invalid_token_format");
  }

  const { expiresAt, providedSignature, format } = tokenParts;
  if (!expiresAt || !providedSignature) {
    return logValidationResult(false, "missing_token_parts", {
      format,
      hasExpiresAt: Boolean(expiresAt),
      hasProvidedSignature: Boolean(providedSignature),
    });
  }

  const expiresAtTime = parseBookingCheckoutTokenExpiry(expiresAt);
  const currentTime = Date.now();
  if (!Number.isFinite(expiresAtTime) || expiresAtTime < currentTime) {
    return logValidationResult(false, "invalid_or_expired_token", {
      expiresAtTime,
      currentTime,
    });
  }

  const expectedToken = signBookingCheckoutToken(bookingId, clientPhone, clientEmail, expiresAt);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedToken);

  if (providedBuffer.length !== expectedBuffer.length) {
    return logValidationResult(false, "signature_length_mismatch", {
      expectedSignatureLength: expectedToken.length,
      providedSignatureLength: providedSignature.length,
      expectedBufferLength: expectedBuffer.length,
      providedBufferLength: providedBuffer.length,
    });
  }

  const isSignatureValid = timingSafeEqual(providedBuffer, expectedBuffer);
  if (!isSignatureValid) {
    return logValidationResult(false, "signature_mismatch", {
      expectedSignatureLength: expectedToken.length,
      providedSignatureLength: providedSignature.length,
    });
  }

  return logValidationResult(true, "token_valid", { expiresAtTime, currentTime });
}
