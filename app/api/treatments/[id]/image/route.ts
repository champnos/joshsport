import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
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
    const { data, error: uploadError } = await supabase.storage
      .from("treatment-images")
      .upload(fileName, buffer, { contentType: file.type });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("treatment-images")
      .getPublicUrl(fileName);

    // Update treatment record with image URL
    const { error: updateError } = await supabase
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
