import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { getBookings, saveBookings } from "@/lib/data";
import { Booking } from "@/lib/types";

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

    const body = (await request.json()) as Partial<Booking>;

    if (!body.status || !["pending", "confirmed", "cancelled"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid booking status." }, { status: 400 });
    }

    const bookings = getBookings();
    const index = bookings.findIndex((booking) => booking.id === params.id);

    if (index === -1) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    bookings[index] = {
      ...bookings[index],
      status: body.status,
    };

    saveBookings(bookings);
    return NextResponse.json(bookings[index]);
  } catch {
    return NextResponse.json({ error: "Unable to update booking." }, { status: 500 });
  }
}
