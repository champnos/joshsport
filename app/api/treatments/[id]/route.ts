import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { getTreatments, saveTreatments } from "@/lib/data";
import { Treatment } from "@/lib/types";

interface RouteContext {
  params: {
    id: string;
  };
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    if (!isAuthorizedAdminRequest(request)) {
      return unauthorizedAdminResponse();
    }

    const body = (await request.json()) as Partial<Treatment>;
    const treatments = getTreatments();
    const index = treatments.findIndex((treatment) => treatment.id === params.id);

    if (index === -1) {
      return NextResponse.json({ error: "Treatment not found." }, { status: 404 });
    }

    const current = treatments[index];
    const durations = Array.isArray(body.durations)
      ? body.durations.map(Number).filter((duration) => Number.isFinite(duration) && duration > 0)
      : current.durations;

    if (Array.isArray(body.durations) && durations.length !== body.durations.length) {
      return NextResponse.json({ error: "Durations must be positive numbers." }, { status: 400 });
    }

    const updatedTreatment: Treatment = {
      ...current,
      ...body,
      id: current.id,
      durations,
      price: body.price !== undefined ? Number(body.price) : current.price,
      price90: body.price90 !== undefined && body.price90 !== null ? Number(body.price90) : current.price90,
      price120: body.price120 !== undefined && body.price120 !== null ? Number(body.price120) : current.price120,
      active: body.active ?? current.active,
    };

    treatments[index] = updatedTreatment;
    saveTreatments(treatments);

    return NextResponse.json(updatedTreatment);
  } catch {
    return NextResponse.json({ error: "Unable to update treatment." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    if (!isAuthorizedAdminRequest(request)) {
      return unauthorizedAdminResponse();
    }

    const treatments = getTreatments();
    const filteredTreatments = treatments.filter((treatment) => treatment.id !== params.id);

    if (filteredTreatments.length === treatments.length) {
      return NextResponse.json({ error: "Treatment not found." }, { status: 404 });
    }

    saveTreatments(filteredTreatments);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete treatment." }, { status: 500 });
  }
}
