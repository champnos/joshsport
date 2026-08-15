import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { getTreatments, saveTreatments } from "@/lib/data";
import { Treatment } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(getTreatments());
  } catch {
    return NextResponse.json({ error: "Unable to load treatments." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) {
      return unauthorizedAdminResponse();
    }

    const body = (await request.json()) as Partial<Treatment>;

    if (!body.name || !body.description || !Array.isArray(body.durations) || !body.pricingModel || typeof body.price !== "number") {
      return NextResponse.json({ error: "Invalid treatment payload." }, { status: 400 });
    }

    const durations = body.durations.map(Number).filter((duration) => Number.isFinite(duration) && duration > 0);
    if (durations.length !== body.durations.length) {
      return NextResponse.json({ error: "Durations must be positive numbers." }, { status: 400 });
    }

    const treatments = getTreatments();
    const treatment: Treatment = {
      id: crypto.randomUUID(),
      name: body.name,
      description: body.description,
      durations,
      pricingModel: body.pricingModel,
      price: Number(body.price),
      price90: body.price90 ? Number(body.price90) : undefined,
      price120: body.price120 ? Number(body.price120) : undefined,
      active: body.active ?? true,
    };

    treatments.push(treatment);
    saveTreatments(treatments);

    return NextResponse.json(treatment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create treatment." }, { status: 500 });
  }
}
