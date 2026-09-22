import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import type { NextRequest } from "next/server";

const SETTINGS_KEY = "about_image_urls";
const LEGACY_KEY = "about_image_url";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

async function getImages() {
  const { data } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", [SETTINGS_KEY, LEGACY_KEY]);

  const rows = new Map((data ?? []).map((row) => [row.key, row.value]));
  const jsonValue = rows.get(SETTINGS_KEY);
  if (typeof jsonValue === "string") {
    try {
      const parsed = JSON.parse(jsonValue);
      if (Array.isArray(parsed)) {
        const images = parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
        if (images.length > 0) return images;
      }
    } catch {
      // Ignore malformed JSON and fall back to legacy value.
    }
  }

  const legacy = rows.get(LEGACY_KEY);
  return typeof legacy === "string" && legacy.trim().length > 0 ? [legacy] : [];
}

async function saveImages(images: string[]) {
  const { error: arraySaveError } = await supabaseAdmin
    .from("settings")
    .upsert({ key: SETTINGS_KEY, value: JSON.stringify(images) }, { onConflict: "key" });
  if (arraySaveError) throw arraySaveError;

  const { error: legacySaveError } = await supabaseAdmin
    .from("settings")
    .upsert({ key: LEGACY_KEY, value: images[0] ?? null }, { onConflict: "key" });
  if (legacySaveError) throw legacySaveError;
}

function extractStoragePath(publicUrl: string) {
  try {
    const url = new URL(publicUrl);
    const pathSegments = url.pathname.split("/");
    const bucketIndex = pathSegments.indexOf("treatment-images");
    if (bucketIndex < 0) return null;
    return decodeURIComponent(pathSegments.slice(bucketIndex + 1).join("/"));
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const images = await getImages();
    return NextResponse.json({ images, image_url: images[0] ?? null }, { status: 200 });
  } catch (err) {
    console.error("Failed to fetch about image:", err);
    return NextResponse.json({ images: [], image_url: null }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image must be 5MB or smaller." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileName = `about-${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("treatment-images")
      .upload(fileName, buffer, { contentType: file.type });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("treatment-images").getPublicUrl(fileName);

    const images = await getImages();
    const requestedIndex = Number.parseInt(String(formData.get("index") ?? ""), 10);

    if (Number.isInteger(requestedIndex) && requestedIndex >= 0 && requestedIndex < images.length) {
      images[requestedIndex] = publicUrl;
    } else {
      images.push(publicUrl);
    }

    await saveImages(images);

    return NextResponse.json({ images, image_url: images[0] ?? null }, { status: 200 });
  } catch (err) {
    console.error("About image upload failed:", err);
    return NextResponse.json({ error: "Unable to upload image." }, { status: 500 });
  }
}


export async function PUT(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();
    const body = await request.json();
    const images = Array.isArray(body.images)
      ? body.images.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
      : [];

    await saveImages(images);
    return NextResponse.json({ images, image_url: images[0] ?? null }, { status: 200 });
  } catch (err) {
    console.error("Image order update failed:", err);
    return NextResponse.json({ error: "Unable to save image order." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();

    const images = await getImages();
    if (images.length === 0) {
      return NextResponse.json({ error: "About image not found" }, { status: 404 });
    }

    const requestedIndex = Number.parseInt(request.nextUrl.searchParams.get("index") ?? "", 10);
    const nextImages = [...images];
    const removedImages: string[] = [];

    if (Number.isInteger(requestedIndex) && requestedIndex >= 0 && requestedIndex < nextImages.length) {
      const [removed] = nextImages.splice(requestedIndex, 1);
      if (removed) removedImages.push(removed);
    } else {
      removedImages.push(...nextImages);
      nextImages.length = 0;
    }

    const pathsToRemove = removedImages
      .map((imageUrl) => extractStoragePath(imageUrl))
      .filter((value): value is string => Boolean(value));

    if (pathsToRemove.length > 0) {
      const { error: deleteError } = await supabaseAdmin.storage.from("treatment-images").remove(pathsToRemove);
      if (deleteError) throw deleteError;
    }

    await saveImages(nextImages);

    return NextResponse.json({ images: nextImages, image_url: nextImages[0] ?? null }, { status: 200 });
  } catch (err) {
    console.error("About image delete failed:", err);
    return NextResponse.json({ error: "Unable to delete image." }, { status: 500 });
  }
}
