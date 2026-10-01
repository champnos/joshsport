import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { IMAGE_TOO_LARGE_MESSAGE, MAX_IMAGE_UPLOAD_BYTES } from "@/lib/slideshow-images";

export const IMAGE_BUCKET = "treatment-images";

type UploadResult = { publicUrl: string } | { response: NextResponse };

function errorResponse(error: string, status: number) {
  return { response: NextResponse.json({ error }, { status }) };
}

function sanitizeFileName(fileName: string) {
  const cleaned = fileName.replace(/\s+/g, "-").replace(/[^A-Za-z0-9._-]/g, "");
  return cleaned.slice(-100) || "image";
}

function buildStoragePath(prefix: string, fileName: string) {
  return `${prefix}-${Date.now()}-${sanitizeFileName(fileName)}`;
}

function isOwnedUploadPath(prefix: string, path: string) {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escapedPrefix}-\\d+-[A-Za-z0-9._-]+$`).test(path);
}

function getPublicUrl(path: string) {
  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return publicUrl;
}

// Uploading through a serverless function is capped by the host (Vercel rejects request bodies over 4.5MB),
// so large images are uploaded by the browser straight to Supabase Storage using a short-lived signed URL.
export async function createSignedImageUpload(prefix: string, body: Record<string, unknown>) {
  const fileName = typeof body.fileName === "string" ? body.fileName : "";
  const contentType = typeof body.contentType === "string" ? body.contentType : "";
  const size = typeof body.size === "number" ? body.size : Number.NaN;

  if (!fileName) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: "Invalid file size." }, { status: 400 });
  }
  if (size > MAX_IMAGE_UPLOAD_BYTES) {
    return NextResponse.json({ error: IMAGE_TOO_LARGE_MESSAGE }, { status: 400 });
  }

  const path = buildStoragePath(prefix, fileName);
  const { data, error } = await supabaseAdmin.storage.from(IMAGE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw error ?? new Error("Unable to create signed upload URL.");

  return NextResponse.json({ path: data.path, token: data.token, bucket: IMAGE_BUCKET }, { status: 200 });
}

// Confirms a direct upload landed in storage and is a valid image within the size limit.
export async function completeSignedImageUpload(prefix: string, path: unknown): Promise<UploadResult> {
  if (typeof path !== "string" || !isOwnedUploadPath(prefix, path)) {
    return errorResponse("Invalid upload path.", 400);
  }

  const { data, error } = await supabaseAdmin.storage.from(IMAGE_BUCKET).list("", { search: path, limit: 10 });
  if (error) throw error;

  const uploaded = (data ?? []).find((item) => item.name === path);
  if (!uploaded) return errorResponse("Uploaded image not found.", 400);

  const metadata = (uploaded.metadata ?? {}) as { size?: unknown; mimetype?: unknown };
  const size = typeof metadata.size === "number" ? metadata.size : 0;
  const mimetype = typeof metadata.mimetype === "string" ? metadata.mimetype : "";

  if (size > MAX_IMAGE_UPLOAD_BYTES || !mimetype.startsWith("image/")) {
    await supabaseAdmin.storage.from(IMAGE_BUCKET).remove([path]);
    return errorResponse(size > MAX_IMAGE_UPLOAD_BYTES ? IMAGE_TOO_LARGE_MESSAGE : "Only image files are allowed.", 400);
  }

  return { publicUrl: getPublicUrl(path) };
}

// Legacy multipart upload through the API route (still subject to the hosting platform's body size limit).
export async function uploadImageFromFormData(prefix: string, formData: FormData): Promise<UploadResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) return errorResponse("No file provided", 400);
  if (!file.type.startsWith("image/")) return errorResponse("Only image files are allowed.", 400);
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) return errorResponse(IMAGE_TOO_LARGE_MESSAGE, 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = buildStoragePath(prefix, file.name);
  const { error } = await supabaseAdmin.storage.from(IMAGE_BUCKET).upload(path, buffer, { contentType: file.type });
  if (error) throw error;

  return { publicUrl: getPublicUrl(path) };
}

export function extractStoragePath(publicUrl: string) {
  try {
    const url = new URL(publicUrl);
    const pathSegments = url.pathname.split("/");
    const bucketIndex = pathSegments.indexOf(IMAGE_BUCKET);
    if (bucketIndex < 0) return null;
    return decodeURIComponent(pathSegments.slice(bucketIndex + 1).join("/"));
  } catch {
    return null;
  }
}
