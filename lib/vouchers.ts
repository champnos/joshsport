import { supabaseAdmin } from "@/lib/supabase-admin";

export interface VoucherRecord {
  id: string;
  code: string;
  discount_percentage: number;
  active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number;
}

export class VoucherValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "VoucherValidationError";
    this.status = status;
  }
}

export function normalizeVoucherCode(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function getVoucherInvalidMessage(voucher: VoucherRecord): string | null {
  if (!voucher.active) return "Voucher code is inactive.";

  if (voucher.expires_at) {
    const expiryTime = new Date(voucher.expires_at).getTime();
    if (Number.isFinite(expiryTime) && expiryTime < Date.now()) {
      return "Voucher code has expired.";
    }
  }

  if (voucher.max_uses !== null && voucher.max_uses <= voucher.uses_count) {
    return "Voucher code has reached its usage limit.";
  }

  if (!Number.isInteger(voucher.discount_percentage) || voucher.discount_percentage < 0 || voucher.discount_percentage > 100) {
    return "Voucher code is invalid.";
  }

  return null;
}

async function getVoucherByCode(code: string) {
  const { data, error } = await supabaseAdmin
    .from("vouchers")
    .select("id, code, discount_percentage, active, expires_at, max_uses, uses_count")
    .eq("code", code)
    .maybeSingle();

  if (error) throw error;
  return (data as VoucherRecord | null) ?? null;
}

export async function validateVoucherOrThrow(codeValue: unknown) {
  const code = normalizeVoucherCode(codeValue);
  if (!code) throw new VoucherValidationError("Voucher code is required.");

  const voucher = await getVoucherByCode(code);
  if (!voucher) throw new VoucherValidationError("Voucher code is invalid.");

  const invalidReason = getVoucherInvalidMessage(voucher);
  if (invalidReason) throw new VoucherValidationError(invalidReason);

  return {
    voucher,
    code: voucher.code,
    discountPercentage: voucher.discount_percentage,
  };
}

export async function validateOptionalVoucher(codeValue: unknown) {
  const normalized = normalizeVoucherCode(codeValue);
  if (!normalized) return null;
  return validateVoucherOrThrow(normalized);
}

export function calculateDiscountAmount(baseAmountInPence: number, discountPercentage: number) {
  if (discountPercentage <= 0) return 0;
  return Math.round((baseAmountInPence * discountPercentage) / 100);
}
