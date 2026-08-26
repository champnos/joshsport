import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

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

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const configuredPassword = process.env.ADMIN_PASSWORD;
    if (configuredPassword && safeCompare(String(password ?? ""), configuredPassword)) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
