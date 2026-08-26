import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function isAuthorizedAdminRequest(request: NextRequest): boolean {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  // Reject if ADMIN_PASSWORD is not configured — deny all access rather than allow empty string
  if (!configuredPassword) return false;
  const auth = request.headers.get("x-admin-password") ?? "";
  return safeCompare(auth, configuredPassword);
}

export function unauthorizedAdminResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
