import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";

interface RouteContext { params: { id: string } }

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();
    const body = await request.json();
    if (!body.status || !["pending", "confirmed", "cancelled"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    const { data, error } = await supabase.from("bookings").update({ status: body.status }).eq("id", params.id).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Unable to update booking." }, { status: 500 });
  }
}
