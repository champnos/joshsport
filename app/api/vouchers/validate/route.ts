import { NextResponse } from "next/server";
import { VoucherValidationError, validateVoucherOrThrow } from "@/lib/vouchers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = await validateVoucherOrThrow(body?.code);

    return NextResponse.json({
      valid: true,
      code: validation.code,
      discount_percentage: validation.discountPercentage,
      expires_at: validation.voucher.expires_at,
      max_uses: validation.voucher.max_uses,
      uses_count: validation.voucher.uses_count,
    });
  } catch (error) {
    if (error instanceof VoucherValidationError) {
      return NextResponse.json({ valid: false, error: error.message }, { status: error.status });
    }

    console.error("Voucher validation failed:", error);
    return NextResponse.json({ valid: false, error: "Unable to validate voucher code." }, { status: 500 });
  }
}
