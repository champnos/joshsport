import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

export async function GET() {
  try {
    const { data: instagramData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "social_instagram")
      .single();

    const { data: facebookData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "social_facebook")
      .single();

    const { data: tiktokData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "social_tiktok")
      .single();

    const { data: emailData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "contact_email")
      .single();

    return NextResponse.json(
      {
        instagram: instagramData?.value || "",
        facebook: facebookData?.value || "",
        tiktok: tiktokData?.value || "",
        email: emailData?.value || "contact@maggsymassagetherapy.com",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Failed to fetch social settings:", err);
    return NextResponse.json(
      {
        instagram: "",
        facebook: "",
        tiktok: "",
        email: "contact@maggsymassagetherapy.com",
      },
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();

    const body = await request.json();
    const { instagram, facebook, tiktok, email } = body;

    // Update or insert Instagram
    const { error: error1 } = await supabase
      .from("settings")
      .update({ value: instagram || "" })
      .eq("key", "social_instagram");

    if (error1) {
      await supabase
        .from("settings")
        .insert({ key: "social_instagram", value: instagram || "" });
    }

    // Update or insert Facebook
    const { error: error2 } = await supabase
      .from("settings")
      .update({ value: facebook || "" })
      .eq("key", "social_facebook");

    if (error2) {
      await supabase
        .from("settings")
        .insert({ key: "social_facebook", value: facebook || "" });
    }

    // Update or insert TikTok
    const { error: error3 } = await supabase
      .from("settings")
      .update({ value: tiktok || "" })
      .eq("key", "social_tiktok");

    if (error3) {
      await supabase
        .from("settings")
        .insert({ key: "social_tiktok", value: tiktok || "" });
    }

    // Update or insert Email
    const { error: error4 } = await supabase
      .from("settings")
      .update({ value: email || "contact@maggsymassagetherapy.com" })
      .eq("key", "contact_email");

    if (error4) {
      await supabase
        .from("settings")
        .insert({ key: "contact_email", value: email || "contact@maggsymassagetherapy.com" });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Failed to update social settings:", err);
    return NextResponse.json({ error: "Unable to update settings." }, { status: 500 });
  }
}
