import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { completeSignedImageUpload, createSignedImageUpload, uploadImageFromFormData } from "@/lib/image-upload";

async function saveTreatmentImage(id: string, publicUrl: string) {
  const { error: updateError } = await supabaseAdmin
    .from("treatments")
    .update({ image_url: publicUrl })
    .eq("id", id);

  if (updateError) {
    console.error("Update error:", updateError);
    throw updateError;
  }

  return NextResponse.json({ image_url: publicUrl }, { status: 200 });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)) {
      return NextResponse.json({ error: "Invalid treatment id." }, { status: 400 });
    }

    if ((request.headers.get("content-type") ?? "").includes("application/json")) {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
      }
      if (body.action === "create-upload") return await createSignedImageUpload(params.id, body);
      if (body.action === "complete-upload") {
        const result = await completeSignedImageUpload(params.id, body.path);
        if ("response" in result) return result.response;
        return await saveTreatmentImage(params.id, result.publicUrl);
      }
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }

    const result = await uploadImageFromFormData(params.id, await request.formData());
    if ("response" in result) return result.response;
    return await saveTreatmentImage(params.id, result.publicUrl);
  } catch (err) {
    console.error("Image upload failed:", err);
    return NextResponse.json({ error: "Unable to upload image." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();

    // Get the treatment to find the image URL
    const { data: treatment, error: fetchError } = await supabase
      .from("treatments")
      .select("image_url")
      .eq("id", params.id)
      .single();

    if (fetchError || !treatment?.image_url) {
      return NextResponse.json({ error: "Treatment or image not found" }, { status: 404 });
    }

    // Extract file name from URL
    const fileName = treatment.image_url.split("/").pop();
    if (!fileName) {
      return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
    }

    // Delete from Supabase storage
    const { error: deleteError } = await supabaseAdmin.storage
      .from("treatment-images")
      .remove([fileName]);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      throw deleteError;
    }

    // Update treatment record to remove image URL
    const { error: updateError } = await supabaseAdmin
      .from("treatments")
      .update({ image_url: null })
      .eq("id", params.id);

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Image delete failed:", err);
    return NextResponse.json({ error: "Unable to delete image." }, { status: 500 });
  }
}
