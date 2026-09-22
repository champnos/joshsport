import { NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE } from "@/lib/customer-auth";

export async function POST() {
  const response = NextResponse.json({ success: true }, { status: 200 });
  response.cookies.set(CUSTOMER_SESSION_COOKIE, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  return response;
}
