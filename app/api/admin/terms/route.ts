import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { getTermsAndConditions, saveTermsAndConditions, validateTermsAndConditionsInput } from "@/lib/terms-store";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();

    const terms = await getTermsAndConditions(supabaseAdmin);
    return NextResponse.json(terms, { status: 200 });
  } catch (error) {
    console.error("Failed to load admin terms and conditions:", error);
    return NextResponse.json({ error: "Unable to load terms and conditions." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();

    const body = await request.json();
    const validation = validateTermsAndConditionsInput(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const terms = await saveTermsAndConditions(validation.value);
    return NextResponse.json(terms, { status: 200 });
  } catch (error) {
    console.error("Failed to save admin terms and conditions:", error);
    return NextResponse.json({ error: "Unable to save terms and conditions." }, { status: 500 });
  }
}
