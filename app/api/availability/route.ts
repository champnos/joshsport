import { NextResponse } from "next/server";

import { getAvailableSlots } from "@/lib/availability";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") ?? "";
    const duration = Number(searchParams.get("duration") ?? "0");

    if (!date || !duration) {
      return NextResponse.json({ error: "Date and duration are required." }, { status: 400 });
    }

    return NextResponse.json({ slots: getAvailableSlots(date, duration) });
  } catch {
    return NextResponse.json({ error: "Unable to load availability." }, { status: 500 });
  }
}
