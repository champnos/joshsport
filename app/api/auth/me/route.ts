import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedCustomer } from "@/lib/customer-session";

export async function GET(request: NextRequest) {
  try {
    const customer = await getAuthenticatedCustomer(request);
    if (!customer) return NextResponse.json({ customer: null }, { status: 200 });

    return NextResponse.json(
      {
        customer: {
          id: customer.id,
          email: customer.email,
          full_name: customer.full_name,
          email_verified: Boolean(customer.email_verified_at),
          is_admin: Boolean(customer.is_admin),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to fetch customer session:", error);
    return NextResponse.json({ customer: null }, { status: 200 });
  }
}
