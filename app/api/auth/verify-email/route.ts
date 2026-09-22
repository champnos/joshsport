import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  createCustomerSessionToken,
  customerSessionCookieOptions,
  hashToken,
} from "@/lib/customer-auth";

function redirectToAccount(request: NextRequest, status: string) {
  return NextResponse.redirect(new URL(`/account/verified?status=${status}`, request.url));
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token") || "";
    if (!token) return redirectToAccount(request, "invalid");

    const tokenHash = hashToken(token);
    const { data: verificationToken, error: tokenError } = await supabaseAdmin
      .from("customer_email_verification_tokens")
      .select("id, customer_id, expires_at, consumed_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tokenError) throw tokenError;
    if (!verificationToken) return redirectToAccount(request, "invalid");

    if (verificationToken.consumed_at || new Date(verificationToken.expires_at).getTime() < Date.now()) {
      return redirectToAccount(request, "expired");
    }

    const verificationTime = new Date().toISOString();
    const { data: consumedToken, error: consumeError } = await supabaseAdmin
      .from("customer_email_verification_tokens")
      .update({ consumed_at: verificationTime })
      .eq("id", verificationToken.id)
      .is("consumed_at", null)
      .select("customer_id")
      .single();
    if (consumeError || !consumedToken) {
      return redirectToAccount(request, "expired");
    }

    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .update({ email_verified_at: verificationTime })
      .eq("id", consumedToken.customer_id)
      .select("id, email")
      .single();
    if (customerError || !customer) throw customerError ?? new Error("Missing customer after verification.");

    const response = redirectToAccount(request, "success");
    response.cookies.set(
      "customer_session",
      createCustomerSessionToken(customer.id, customer.email),
      customerSessionCookieOptions,
    );
    return response;
  } catch (error) {
    console.error("Email verification failed:", error);
    return redirectToAccount(request, "error");
  }
}
