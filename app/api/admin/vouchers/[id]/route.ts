import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAuthorizedAdminRequest, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { normalizeVoucherCode } from "@/lib/vouchers";

interface RouteContext {
  params: { id: string };
}

function parseDiscountPercentage(value: unknown) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) return null;
  return parsed;
}

function parseMaxUses(value: unknown) {
  if (value === null || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseExpiresAt(value: unknown) {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "invalid";
  return parsed.toISOString();
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.code !== undefined) {
      const code = normalizeVoucherCode(body.code);
      if (!code) return NextResponse.json({ error: "Voucher code cannot be empty." }, { status: 400 });
      updates.code = code;
    }

    if (body.discount_percentage !== undefined) {
      const discountPercentage = parseDiscountPercentage(body.discount_percentage);
      if (discountPercentage === null) {
        return NextResponse.json({ error: "Discount must be an integer between 0 and 100." }, { status: 400 });
      }
      updates.discount_percentage = discountPercentage;
    }

    if (body.active !== undefined) {
      if (typeof body.active !== "boolean") {
        return NextResponse.json({ error: "Active must be true or false." }, { status: 400 });
      }
      updates.active = body.active;
    }

    if (body.expires_at !== undefined) {
      const expiresAt = parseExpiresAt(body.expires_at);
      if (expiresAt === "invalid") return NextResponse.json({ error: "Expiry date is invalid." }, { status: 400 });
      updates.expires_at = expiresAt;
    }

    if (body.max_uses !== undefined) {
      const maxUses = parseMaxUses(body.max_uses);
      if (body.max_uses !== null && body.max_uses !== "" && maxUses === null) {
        return NextResponse.json({ error: "Max uses must be a positive integer." }, { status: 400 });
      }
      updates.max_uses = maxUses;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No voucher updates provided." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("vouchers")
      .update(updates)
      .eq("id", params.id)
      .select("id, code, discount_percentage, active, expires_at, max_uses, uses_count, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Voucher code already exists." }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to update voucher:", error);
    return NextResponse.json({ error: "Unable to update voucher." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    if (!isAuthorizedAdminRequest(request)) return unauthorizedAdminResponse();

    const { error } = await supabaseAdmin.from("vouchers").delete().eq("id", params.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete voucher:", error);
    return NextResponse.json({ error: "Unable to delete voucher." }, { status: 500 });
  }
}
