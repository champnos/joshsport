import { NextResponse } from "next/server";
import { getTermsAndConditions } from "@/lib/terms-store";

export async function GET() {
  const terms = await getTermsAndConditions();
  return NextResponse.json(terms, { status: 200 });
}
