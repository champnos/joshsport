import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  createCustomerSessionToken,
  customerSessionCookieOptions,
  normalizeCustomerEmail,
  verifyPassword,
} from "@/lib/customer-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimit = checkRateLimit("customer-login", ip, 10, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    const body = await request.json();
    const email = normalizeCustomerEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";

    const { data: customer, error } = await supabaseAdmin
      .from("customers")
      .select("id, email, full_name, email_verified_at, password_hash")
      .eq("email", email)
      .maybeSingle();
    if (error) throw error;

    if (!customer || !verifyPassword(password, customer.password_hash)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    if (!customer.email_verified_at) {
      return NextResponse.json({ error: "Please verify your email before logging in." }, { status: 403 });
    }

    const response = NextResponse.json(
      {
        customer: {
          id: customer.id,
          email: customer.email,
          full_name: customer.full_name,
          email_verified: Boolean(customer.email_verified_at),
        },
      },
      { status: 200 },
    );

    response.cookies.set(
      "customer_session",
      createCustomerSessionToken(customer.id, customer.email),
      customerSessionCookieOptions,
    );

    return response;
  } catch (error) {
    console.error("Customer login failed:", error);
    return NextResponse.json({ error: "Unable to log in." }, { status: 500 });
  }
}
