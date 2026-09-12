import { NextRequest, NextResponse } from "next/server";
import { validateBookingDistance } from "@/lib/distance-check";

export async function GET(request: NextRequest) {
  const postcode = request.nextUrl.searchParams.get("postcode") ?? "";

  if (!postcode.trim()) {
    return NextResponse.json({ error: "Postcode is required." }, { status: 400 });
  }

  try {
    const result = await validateBookingDistance(postcode);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to check service area.";
    const status = message.includes("valid UK postcode") ? 400 : message.includes("not configured") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
