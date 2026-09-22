import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { normalizeVoucherCode } from "@/lib/vouchers";

function parseDiscountAmountPence(value: unknown) {
  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100);
}

function parseMaxUses(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseExpiresAt(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const iso = new Date(value);
  if (Number.isNaN(iso.getTime())) return "invalid";
  return iso.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();

    const { data, error } = await supabaseAdmin
      .from("vouchers")
      .select("id, code, discount_percentage, active, expires_at, max_uses, uses_count, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("Failed to fetch vouchers:", error);
    return NextResponse.json({ error: "Unable to load vouchers." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();
    const body = await request.json();

    const code = normalizeVoucherCode(body.code);
    const discountAmountPence = parseDiscountAmountPence(body.discount_percentage);
    const active = typeof body.active === "boolean" ? body.active : true;
    const maxUses = parseMaxUses(body.max_uses);
    const expiresAt = parseExpiresAt(body.expires_at);

    if (!code) {
      return NextResponse.json({ error: "Voucher code is required." }, { status: 400 });
    }
    if (discountAmountPence === null) {
      return NextResponse.json({ error: "Discount amount must be a valid amount above £0.00." }, { status: 400 });
    }
    if (expiresAt === "invalid") {
      return NextResponse.json({ error: "Expiry date is invalid." }, { status: 400 });
    }
    if ((body.max_uses !== null && body.max_uses !== undefined && body.max_uses !== "") && maxUses === null) {
      return NextResponse.json({ error: "Max uses must be a positive integer." }, { status: 400 });
    }

    const payload = {
      code,
      discount_percentage: discountAmountPence,
      active,
      expires_at: expiresAt,
      max_uses: maxUses,
    };

    const { data, error } = await supabaseAdmin
      .from("vouchers")
      .insert(payload)
      .select("id, code, discount_percentage, active, expires_at, max_uses, uses_count, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Voucher code already exists." }, { status: 409 });
      }
      if (error.code === "23514" && error.message?.includes("vouchers_discount_percentage_check")) {
        return NextResponse.json(
          {
            error:
              "Voucher amount was blocked by an outdated database constraint. Run the voucher discount constraint migration and try again.",
          },
          { status: 400 },
        );
      }
      console.error("Voucher insert failed with DB error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Failed to create voucher:", error);
    return NextResponse.json({ error: "Unable to create voucher." }, { status: 500 });
  }
}
