import { createSlideshowImageHandlers } from "@/lib/slideshow-image-route";

const handlers = createSlideshowImageHandlers({
  settingsKey: "about_image_urls",
  legacyKey: "about_image_url",
  filePrefix: "about",
  label: "About",
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
