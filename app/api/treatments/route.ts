import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";

export async function GET() {
  try {
    const { data, error } = await supabase.from("treatments").select("*").order("created_at");
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("Failed to load treatments:", err);
    return NextResponse.json({ error: "Unable to load treatments." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();
    const body = await request.json();
    console.log("Creating treatment with body:", JSON.stringify(body, null, 2));
    const { data, error } = await supabase.from("treatments").insert([body]).select().single();
    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }
    console.log("Treatment created successfully:", data);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Treatment creation failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Unable to create treatment." }, { status: 500 });
  }
}
