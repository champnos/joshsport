import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "about_image_url")
      .single();

    if (error || !data) {
      return NextResponse.json({ image_url: null }, { status: 200 });
    }

    return NextResponse.json({ image_url: data.value }, { status: 200 });
  } catch (err) {
    console.error("Failed to fetch about image:", err);
    return NextResponse.json({ image_url: null }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileName = `about-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("treatment-images")
      .upload(fileName, buffer, { contentType: file.type });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("treatment-images")
      .getPublicUrl(fileName);

    // Save URL to settings table
    const { error: updateError } = await supabaseAdmin
      .from("settings")
      .upsert({ key: "about_image_url", value: publicUrl }, { onConflict: "key" });

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    return NextResponse.json({ image_url: publicUrl }, { status: 200 });
  } catch (err) {
    console.error("About image upload failed:", err);
    return NextResponse.json({ error: "Unable to upload image." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();

    // Get the current about image URL
    const { data, error: fetchError } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "about_image_url")
      .single();

    if (fetchError || !data?.value) {
      return NextResponse.json({ error: "About image not found" }, { status: 404 });
    }

    // Extract file name from URL
    const fileName = data.value.split("/").pop();
    if (!fileName) {
      return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
    }

    // Delete from storage
    const { error: deleteError } = await supabaseAdmin.storage
      .from("treatment-images")
      .remove([fileName]);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      throw deleteError;
    }

    // Clear from settings
    const { error: updateError } = await supabaseAdmin
      .from("settings")
      .update({ value: null })
      .eq("key", "about_image_url");

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("About image delete failed:", err);
    return NextResponse.json({ error: "Unable to delete image." }, { status: 500 });
  }
}
