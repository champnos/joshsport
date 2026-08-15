import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { getAvailableSlots } from "@/lib/availability";
import { getBookings, getTreatments, saveBookings } from "@/lib/data";
import { withFileLock } from "@/lib/file-lock";
import { Booking } from "@/lib/types";

class SlotUnavailableError extends Error {
  code = "SLOT_UNAVAILABLE";
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) {
      return unauthorizedAdminResponse();
    }

    const bookings = getBookings().sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
    return NextResponse.json(bookings);
  } catch {
    return NextResponse.json({ error: "Unable to load bookings." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<Booking>;

    if (
      !body.treatmentId ||
      !body.date ||
      !body.startTime ||
      !body.durationMins ||
      !body.clientName ||
      !body.clientEmail ||
      !body.clientPhone
    ) {
      return NextResponse.json({ error: "Missing required booking fields." }, { status: 400 });
    }

    const treatment = getTreatments().find((item) => item.id === body.treatmentId && item.active);
    if (!treatment) {
      return NextResponse.json({ error: "Selected treatment was not found." }, { status: 404 });
    }

    if (!treatment.durations.includes(Number(body.durationMins))) {
      return NextResponse.json({ error: "Selected duration is not available for this treatment." }, { status: 400 });
    }

    const booking = await withFileLock("bookings", async () => {
      const bookings = getBookings();
      const availableSlots = getAvailableSlots(body.date!, Number(body.durationMins), bookings);

      if (!availableSlots.includes(body.startTime!)) {
        throw new SlotUnavailableError("Selected time is no longer available.");
      }

      const nextBooking: Booking = {
        id: crypto.randomUUID(),
        treatmentId: treatment.id,
        treatmentName: treatment.name,
        date: body.date!,
        startTime: body.startTime!,
        durationMins: Number(body.durationMins),
        clientName: body.clientName!,
        clientEmail: body.clientEmail!,
        clientPhone: body.clientPhone!,
        notes: body.notes ?? "",
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      bookings.push(nextBooking);
      saveBookings(bookings);

      return nextBooking;
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof SlotUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to create booking." }, { status: 500 });
  }
}
