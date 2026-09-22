import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  CUSTOMER_SESSION_COOKIE,
  normalizeCustomerEmail,
  verifyCustomerSessionToken,
} from "@/lib/customer-auth";

export interface AuthenticatedCustomer {
  id: string;
  email: string;
  full_name: string | null;
  email_verified_at: string | null;
}

export async function getAuthenticatedCustomer(request: NextRequest): Promise<AuthenticatedCustomer | null> {
  const token = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value || "";
  if (!token) return null;

  const payload = verifyCustomerSessionToken(token);
  if (!payload) return null;

  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("id, email, full_name, email_verified_at")
    .eq("id", payload.sub)
    .single();

  if (error || !data) return null;
  if (normalizeCustomerEmail(data.email) !== normalizeCustomerEmail(payload.email)) return null;

  return data as AuthenticatedCustomer;
}
