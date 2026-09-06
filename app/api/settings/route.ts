import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .single();

    if (error && error.code !== "PGRST116") throw error;

    return NextResponse.json({ settings: data || {} }, { status: 200 });
  } catch (err) {
    console.error("Failed to fetch settings:", err);
    return NextResponse.json({ settings: {} }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();

    const body = await request.json();
    const { instagram, facebook, tiktok, email } = body;

    const { error: upsertError } = await supabase
      .from("site_settings")
      .upsert({
        id: 1,
        instagram: instagram || null,
        facebook: facebook || null,
        tiktok: tiktok || null,
        email: email || null,
        updated_at: new Date(),
      });

    if (upsertError) throw upsertError;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Failed to update settings:", err);
    return NextResponse.json({ error: "Unable to update settings." }, { status: 500 });
  }
}
