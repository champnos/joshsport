import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";

const DEFAULT_TITLE = "T's & C's";
const DEFAULT_CONTENT = "Please contact us directly for the latest booking terms and conditions.";

export async function GET() {
  try {
    const { data } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["frontpage_terms_title", "frontpage_terms_content"]);

    const values = new Map((data ?? []).map((row) => [row.key, row.value]));
    return NextResponse.json(
      {
        title: values.get("frontpage_terms_title") || DEFAULT_TITLE,
        content: values.get("frontpage_terms_content") || DEFAULT_CONTENT,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to fetch frontpage terms:", error);
    return NextResponse.json({ title: DEFAULT_TITLE, content: DEFAULT_CONTENT }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();

    const body = await request.json();
    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : DEFAULT_TITLE;
    const content = typeof body.content === "string" ? body.content.trim() : "";

    await Promise.all([
      supabaseAdmin
        .from("settings")
        .upsert({ key: "frontpage_terms_title", value: title }, { onConflict: "key" }),
      supabaseAdmin
        .from("settings")
        .upsert({ key: "frontpage_terms_content", value: content }, { onConflict: "key" }),
    ]);

    return NextResponse.json({ title, content }, { status: 200 });
  } catch (error) {
    console.error("Failed to update frontpage terms:", error);
    return NextResponse.json({ error: "Unable to update front page terms." }, { status: 500 });
  }
}
