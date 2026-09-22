import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  createRandomToken,
  hashToken,
  normalizeCustomerEmail,
} from "@/lib/customer-auth";
import { sendCustomerPasswordResetEmail } from "@/lib/customer-account-emails";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimit = checkRateLimit("customer-password-reset", ip, 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many reset attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    const body = await request.json();
    const email = normalizeCustomerEmail(body.email);
    if (!email) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    await supabaseAdmin
      .from("customer_password_reset_tokens")
      .delete()
      .lt("expires_at", new Date().toISOString());

    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();
    if (customerError) throw customerError;

    if (customer) {
      await supabaseAdmin
        .from("customer_password_reset_tokens")
        .delete()
        .eq("customer_id", customer.id)
        .is("consumed_at", null);

      const token = createRandomToken();
      const { error: tokenError } = await supabaseAdmin.from("customer_password_reset_tokens").insert({
        customer_id: customer.id,
        token_hash: hashToken(token),
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
      if (tokenError) throw tokenError;

      await sendCustomerPasswordResetEmail(customer.email, token);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Request password reset failed:", error);
    return NextResponse.json({ error: "Unable to process password reset request." }, { status: 500 });
  }
}
