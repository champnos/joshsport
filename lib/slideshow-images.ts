export interface SlideshowImage {
  url: string;
  position: string;
}

export const DEFAULT_IMAGE_POSITION = "50% 50%";

export const MAX_IMAGE_UPLOAD_MB = 20;
export const MAX_IMAGE_UPLOAD_BYTES = MAX_IMAGE_UPLOAD_MB * 1024 * 1024;
export const IMAGE_TOO_LARGE_MESSAGE = `Image must be ${MAX_IMAGE_UPLOAD_MB}MB or smaller.`;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
export const ALLOWED_IMAGE_ACCEPT = ALLOWED_IMAGE_TYPES.join(",");
export const IMAGE_TYPE_MESSAGE = "Only JPG, PNG, WebP, GIF or AVIF images are allowed.";

export function isAllowedImageType(contentType: string) {
  return ALLOWED_IMAGE_TYPES.includes(contentType.toLowerCase());
}

// Largest (desktop) and smallest (mobile) sizes of the homepage image boxes in app/page.tsx.
// object-cover + percentage object-position crops depend only on the box's aspect ratio,
// so scaled-down previews with the same ratio show exactly what the live site shows.
export interface DisplayFrame {
  label: string;
  width: number;
  height: number;
}

export const HERO_DISPLAY_FRAMES: DisplayFrame[] = [
  { label: "Desktop", width: 620, height: 520 },
  { label: "Mobile", width: 358, height: 320 },
];

export const ABOUT_DISPLAY_FRAMES: DisplayFrame[] = [
  { label: "Desktop", width: 304, height: 520 },
  { label: "Mobile", width: 358, height: 320 },
];

const POSITION_PATTERN = /^(\d{1,3}(?:\.\d+)?)% (\d{1,3}(?:\.\d+)?)%$/;

export function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function formatImagePosition(x: number, y: number) {
  return `${clampPercent(x)}% ${clampPercent(y)}%`;
}

export function parseImagePosition(value: unknown): { x: number; y: number } | null {
  if (typeof value !== "string") return null;
  const match = POSITION_PATTERN.exec(value.trim());
  if (!match) return null;
  const x = Number(match[1]);
  const y = Number(match[2]);
  if (x > 100 || y > 100) return null;
  return { x, y };
}

export function normalizeImagePosition(value: unknown) {
  const parsed = parseImagePosition(value);
  return parsed ? formatImagePosition(parsed.x, parsed.y) : DEFAULT_IMAGE_POSITION;
}

function normalizeSlideshowImage(value: unknown): SlideshowImage | null {
  if (typeof value === "string") {
    const url = value.trim();
    return url ? { url, position: DEFAULT_IMAGE_POSITION } : null;
  }
  if (value && typeof value === "object") {
    const { url, position } = value as { url?: unknown; position?: unknown };
    if (typeof url !== "string" || url.trim().length === 0) return null;
    return { url: url.trim(), position: normalizeImagePosition(position) };
  }
  return null;
}

// Accepts both the current `{ url, position }[]` shape and the legacy plain `string[]` shape.
export function normalizeSlideshowImages(value: unknown): SlideshowImage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeSlideshowImage(item))
    .filter((item): item is SlideshowImage => item !== null);
}
