import { createSlideshowImageHandlers } from "@/lib/slideshow-image-route";

const handlers = createSlideshowImageHandlers({
  settingsKey: "hero_image_urls",
  legacyKey: "hero_image_url",
  filePrefix: "hero",
  label: "Hero",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
