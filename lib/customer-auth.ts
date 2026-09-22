import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

export const CUSTOMER_SESSION_COOKIE = "customer_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

interface SessionPayload {
  sub: string;
  email: string;
  exp: number;
}

function getAuthSecret() {
  const secret = process.env.CUSTOMER_AUTH_SECRET || process.env.BOOKING_CHECKOUT_TOKEN_SECRET || "";
  if (!secret) throw new Error("Missing customer auth secret.");
  return secret;
}

function sign(input: string) {
  return createHmac("sha256", getAuthSecret()).update(input).digest("base64url");
}

export function normalizeCustomerEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function hashToken(token: string) {
  return createHmac("sha256", getAuthSecret()).update(token).digest("hex");
}

export function createRandomToken() {
  return randomBytes(32).toString("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const candidate = scryptSync(password, salt, 64).toString("hex");
  const left = Buffer.from(candidate, "hex");
  const right = Buffer.from(hash, "hex");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createCustomerSessionToken(customerId: string, email: string) {
  const payload: SessionPayload = {
    sub: customerId,
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyCustomerSessionToken(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = sign(encodedPayload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
    if (!payload?.sub || !payload?.email || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const customerSessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
