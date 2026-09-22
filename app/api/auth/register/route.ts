import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  createRandomToken,
  hashPassword,
  hashToken,
  normalizeCustomerEmail,
} from "@/lib/customer-auth";
import { sendCustomerVerificationEmail } from "@/lib/customer-account-emails";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimit = checkRateLimit("customer-register", ip, 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    const body = await request.json();
    const email = normalizeCustomerEmail(body.email);
    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    const { data: existingCustomer, error: existingError } = await supabaseAdmin
      .from("customers")
      .select("id, email_verified_at")
      .eq("email", email)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existingCustomer?.email_verified_at) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    let customerId = existingCustomer?.id;

    if (customerId) {
      const { error: updateError } = await supabaseAdmin
        .from("customers")
        .update({ full_name: fullName || null, password_hash: passwordHash })
        .eq("id", customerId);
      if (updateError) throw updateError;
    } else {
      const { data: createdCustomer, error: createError } = await supabaseAdmin
        .from("customers")
        .insert({ email, full_name: fullName || null, password_hash: passwordHash })
        .select("id")
        .single();
      if (createError || !createdCustomer) throw createError ?? new Error("Unable to create account.");
      customerId = createdCustomer.id;
    }

    const verificationToken = createRandomToken();
    const tokenHash = hashToken(verificationToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await supabaseAdmin
      .from("customer_email_verification_tokens")
      .delete()
      .eq("customer_id", customerId)
      .is("consumed_at", null);

    const { error: tokenError } = await supabaseAdmin.from("customer_email_verification_tokens").insert({
      customer_id: customerId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });
    if (tokenError) throw tokenError;

    await sendCustomerVerificationEmail(email, verificationToken);

    return NextResponse.json(
      { success: true, message: "Account created. Please verify your email before booking." },
      { status: 201 },
    );
  } catch (error) {
    console.error("Customer register failed:", error);
    return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
  }
}
