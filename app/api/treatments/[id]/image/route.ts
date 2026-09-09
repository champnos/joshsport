import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();
    
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Upload to Supabase storage
    const fileName = `${params.id}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("treatment-images")
      .upload(fileName, buffer, { contentType: file.type });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("treatment-images")
      .getPublicUrl(fileName);

    // Update treatment record with image URL
    const { error: updateError } = await supabaseAdmin
      .from("treatments")
      .update({ image_url: publicUrl })
      .eq("id", params.id);

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    return NextResponse.json({ image_url: publicUrl }, { status: 200 });
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
