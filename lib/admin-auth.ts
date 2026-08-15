import { createHmac, randomBytes, timingSafeEqual } from "crypto";

import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE_NAME = "admin-session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;
const STUB_SECRET = randomBytes(32).toString("hex");
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? STUB_SECRET;

if (!process.env.ADMIN_SESSION_SECRET && process.env.NODE_ENV === "production") {
  console.warn("ADMIN_SESSION_SECRET is not set. Admin sessions will be invalidated on restart.");
}

function createSignature(payload: string) {
  return createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

function createAdminSessionValue() {
  const nonce = randomBytes(16).toString("hex");
  const expiresAt = Date.now() + SESSION_DURATION_SECONDS * 1000;
  const payload = `${nonce}.${expiresAt}`;
  const signature = createSignature(payload);

  return `${payload}.${signature}`;
}

function safeStringEqual(a: string, b: string) {
  const first = Buffer.from(a);
  const second = Buffer.from(b);

  if (first.length !== second.length) {
    return false;
  }

  return timingSafeEqual(first, second);
}

export function createAdminAuthResponse() {
  const response = NextResponse.json({ success: true });
  const sessionValue = createAdminSessionValue();

  response.cookies.set(ADMIN_COOKIE_NAME, sessionValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });

  return response;
}

export function isAuthorizedAdminRequest(request: NextRequest) {
  const cookieValue = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookieValue) return false;

  const firstSeparator = cookieValue.indexOf(".");
  const secondSeparator = cookieValue.indexOf(".", firstSeparator + 1);
  if (firstSeparator === -1 || secondSeparator === -1) return false;

  const nonce = cookieValue.slice(0, firstSeparator);
  const expiresAtRaw = cookieValue.slice(firstSeparator + 1, secondSeparator);
  const signature = cookieValue.slice(secondSeparator + 1);
  if (!nonce || !expiresAtRaw || !signature) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const payload = `${nonce}.${expiresAtRaw}`;
  const expectedSignature = createSignature(payload);

  return safeStringEqual(signature, expectedSignature);
}

export function isValidAdminPassword(password: string) {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword) return false;

  return safeStringEqual(password, expectedPassword);
}

export function unauthorizedAdminResponse() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}
