import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import {
  completeSignedImageUpload,
  createSignedImageUpload,
  extractStoragePath,
  IMAGE_BUCKET,
  uploadImageFromFormData,
} from "@/lib/image-upload";
import {
  DEFAULT_IMAGE_POSITION,
  formatImagePosition,
  normalizeSlideshowImages,
  parseImagePosition,
  type SlideshowImage,
} from "@/lib/slideshow-images";

interface SlideshowRouteConfig {
  settingsKey: string;
  legacyKey: string;
  filePrefix: string;
  label: string;
}

export function createSlideshowImageHandlers({ settingsKey, legacyKey, filePrefix, label }: SlideshowRouteConfig) {
  async function getImages(): Promise<SlideshowImage[]> {
    const { data } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", [settingsKey, legacyKey]);

    const rows = new Map((data ?? []).map((row) => [row.key, row.value]));
    const jsonValue = rows.get(settingsKey);
    if (typeof jsonValue === "string") {
      try {
        // Handles both `{ url, position }[]` and legacy plain URL string arrays.
        const images = normalizeSlideshowImages(JSON.parse(jsonValue));
        if (images.length > 0) return images;
      } catch {
        // Ignore malformed JSON and fall back to legacy value.
      }
    }

    const legacy = rows.get(legacyKey);
    return typeof legacy === "string" && legacy.trim().length > 0
      ? [{ url: legacy.trim(), position: DEFAULT_IMAGE_POSITION }]
      : [];
  }

  async function saveImages(images: SlideshowImage[]) {
    const { error: arraySaveError } = await supabaseAdmin
      .from("settings")
      .upsert({ key: settingsKey, value: JSON.stringify(images) }, { onConflict: "key" });
    if (arraySaveError) throw arraySaveError;

    const { error: legacySaveError } = await supabaseAdmin
      .from("settings")
      .upsert({ key: legacyKey, value: images[0]?.url ?? null }, { onConflict: "key" });
    if (legacySaveError) throw legacySaveError;
  }

  function imagesResponse(images: SlideshowImage[]) {
    return NextResponse.json({ images, image_url: images[0]?.url ?? null }, { status: 200 });
  }

  async function addImage(publicUrl: string, index: unknown) {
    const images = await getImages();
    const requestedIndex = Number.parseInt(String(index ?? ""), 10);
    const image = { url: publicUrl, position: DEFAULT_IMAGE_POSITION };

    if (Number.isInteger(requestedIndex) && requestedIndex >= 0 && requestedIndex < images.length) {
      images[requestedIndex] = image;
    } else {
      images.push(image);
    }

    await saveImages(images);
    return imagesResponse(images);
  }

  async function GET() {
    try {
      return imagesResponse(await getImages());
    } catch (err) {
      console.error(`Failed to fetch ${label} image:`, err);
      return NextResponse.json({ images: [], image_url: null }, { status: 200 });
    }
  }

  async function POST(request: NextRequest) {
    try {
      if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();

      if ((request.headers.get("content-type") ?? "").includes("application/json")) {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
          return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
        }
        if (body.action === "create-upload") return await createSignedImageUpload(filePrefix, body);
        if (body.action === "complete-upload") {
          const result = await completeSignedImageUpload(filePrefix, body.path);
          if ("response" in result) return result.response;
          return await addImage(result.publicUrl, body.index);
        }
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
      }

      const formData = await request.formData();
      const result = await uploadImageFromFormData(filePrefix, formData);
      if ("response" in result) return result.response;
      return await addImage(result.publicUrl, formData.get("index"));
    } catch (err) {
      console.error(`${label} image upload failed:`, err);
      return NextResponse.json({ error: "Unable to upload image." }, { status: 500 });
    }
  }

  async function PUT(request: NextRequest) {
    try {
      if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();
      const body = await request.json();
      const images = normalizeSlideshowImages(body.images);

      await saveImages(images);
      return imagesResponse(images);
    } catch (err) {
      console.error("Image order update failed:", err);
      return NextResponse.json({ error: "Unable to save image order." }, { status: 500 });
    }
  }

  // Saves a new focal point (CSS object-position) for an existing image without re-uploading it.
  async function PATCH(request: NextRequest) {
    try {
      if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();
      const body = await request.json().catch(() => null);
      const url = typeof body?.url === "string" ? body.url : "";
      const parsedPosition = parseImagePosition(body?.position);

      if (!url) return NextResponse.json({ error: "Image URL is required." }, { status: 400 });
      if (!parsedPosition) {
        return NextResponse.json({ error: "Position must look like \"50% 50%\" (0-100%)." }, { status: 400 });
      }

      const images = await getImages();
      const imageIndex = images.findIndex((image) => image.url === url);
      if (imageIndex < 0) return NextResponse.json({ error: `${label} image not found` }, { status: 404 });

      images[imageIndex] = { ...images[imageIndex], position: formatImagePosition(parsedPosition.x, parsedPosition.y) };
      await saveImages(images);
      return imagesResponse(images);
    } catch (err) {
      console.error(`${label} image position update failed:`, err);
      return NextResponse.json({ error: "Unable to save image position." }, { status: 500 });
    }
  }

  async function DELETE(request: NextRequest) {
    try {
      if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();

      const images = await getImages();
      if (images.length === 0) {
        return NextResponse.json({ error: `${label} image not found` }, { status: 404 });
      }

      const requestedIndex = Number.parseInt(request.nextUrl.searchParams.get("index") ?? "", 10);
      const nextImages = [...images];
      const removedImages: SlideshowImage[] = [];

      if (Number.isInteger(requestedIndex) && requestedIndex >= 0 && requestedIndex < nextImages.length) {
        const [removed] = nextImages.splice(requestedIndex, 1);
        if (removed) removedImages.push(removed);
      } else {
        removedImages.push(...nextImages);
        nextImages.length = 0;
      }

      const pathsToRemove = removedImages
        .map((image) => extractStoragePath(image.url))
        .filter((value): value is string => Boolean(value));

      if (pathsToRemove.length > 0) {
        const { error: deleteError } = await supabaseAdmin.storage.from(IMAGE_BUCKET).remove(pathsToRemove);
        if (deleteError) throw deleteError;
      }

      await saveImages(nextImages);
      return imagesResponse(nextImages);
    } catch (err) {
      console.error(`${label} image delete failed:`, err);
      return NextResponse.json({ error: "Unable to delete image." }, { status: 500 });
    }
  }

  return { GET, POST, PUT, PATCH, DELETE };
}
