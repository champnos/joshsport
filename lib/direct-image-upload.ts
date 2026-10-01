import { supabase } from "@/lib/supabase";
import { IMAGE_TOO_LARGE_MESSAGE, MAX_IMAGE_UPLOAD_BYTES } from "@/lib/slideshow-images";

async function readJson(res: Response) {
  return res.json().catch(() => null);
}

// Uploads an image straight from the browser to Supabase Storage via a signed URL issued by `endpoint`,
// then asks `endpoint` to register it. This avoids the hosting platform's API request body size limit.
export async function uploadImageDirect(
  endpoint: string,
  file: File,
  adminPassword: string,
  extra: Record<string, unknown> = {},
) {
  if (!file.type.startsWith("image/")) throw new Error("Only image files are allowed.");
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) throw new Error(IMAGE_TOO_LARGE_MESSAGE);

  const headers = { "x-admin-password": adminPassword, "Content-Type": "application/json" };

  const createRes = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "create-upload", fileName: file.name, contentType: file.type, size: file.size }),
  });
  const createData = await readJson(createRes);
  if (!createRes.ok) throw new Error(createData?.error ?? "Failed to upload image.");

  const { error: uploadError } = await supabase.storage
    .from(createData.bucket)
    .uploadToSignedUrl(createData.path, createData.token, file, { contentType: file.type });
  if (uploadError) throw new Error(uploadError.message || "Failed to upload image.");

  const completeRes = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "complete-upload", path: createData.path, ...extra }),
  });
  const completeData = await readJson(completeRes);
  if (!completeRes.ok) throw new Error(completeData?.error ?? "Failed to upload image.");

  return completeData;
}
