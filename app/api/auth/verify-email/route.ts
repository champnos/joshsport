import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  createCustomerSessionToken,
  customerSessionCookieOptions,
  hashToken,
} from "@/lib/customer-auth";

function redirectToAccount(request: NextRequest, query: string) {
  return NextResponse.redirect(new URL(`/account?${query}`, request.url));
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token") || "";
    if (!token) return redirectToAccount(request, "verified=invalid");

    const tokenHash = hashToken(token);
    const { data: verificationToken, error: tokenError } = await supabaseAdmin
      .from("customer_email_verification_tokens")
      .select("id, customer_id, expires_at, consumed_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tokenError) throw tokenError;
    if (!verificationToken) return redirectToAccount(request, "verified=invalid");

    if (verificationToken.consumed_at || new Date(verificationToken.expires_at).getTime() < Date.now()) {
      return redirectToAccount(request, "verified=expired");
    }

    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .update({ email_verified_at: new Date().toISOString() })
      .eq("id", verificationToken.customer_id)
      .select("id, email")
      .single();
    if (customerError || !customer) throw customerError ?? new Error("Missing customer after verification.");

    await supabaseAdmin
      .from("customer_email_verification_tokens")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", verificationToken.id);

    const response = redirectToAccount(request, "verified=success");
    response.cookies.set(
      "customer_session",
      createCustomerSessionToken(customer.id, customer.email),
      customerSessionCookieOptions,
    );
    return response;
  } catch (error) {
    console.error("Email verification failed:", error);
    return redirectToAccount(request, "verified=error");
  }
}
