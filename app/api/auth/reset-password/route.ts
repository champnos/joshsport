import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashPassword, hashToken } from "@/lib/customer-auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimit = checkRateLimit("customer-reset-password", ip, 10, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!token || password.length < 8) {
      return NextResponse.json({ error: "A valid token and password are required." }, { status: 400 });
    }

    const { data: resetToken, error: tokenError } = await supabaseAdmin
      .from("customer_password_reset_tokens")
      .select("id, customer_id, expires_at, consumed_at")
      .eq("token_hash", hashToken(token))
      .maybeSingle();
    if (tokenError) throw tokenError;

    if (!resetToken || resetToken.consumed_at || new Date(resetToken.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
    }

    const { error: updateCustomerError } = await supabaseAdmin
      .from("customers")
      .update({ password_hash: hashPassword(password) })
      .eq("id", resetToken.customer_id);
    if (updateCustomerError) throw updateCustomerError;

    await supabaseAdmin
      .from("customer_password_reset_tokens")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", resetToken.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Reset password failed:", error);
    return NextResponse.json({ error: "Unable to reset password." }, { status: 500 });
  }
}
