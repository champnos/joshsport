import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedCustomer } from "@/lib/customer-session";
import { supabaseAdmin } from "@/lib/supabase-admin";

function sanitizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeDate(value: unknown) {
  const date = sanitizeString(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function sanitizeMedicalConditions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function profileFromCustomerRecord(customer: Record<string, unknown>) {
  return {
    email: sanitizeString(customer.email),
    full_name: sanitizeString(customer.full_name),
    phone: sanitizeString(customer.phone),
    address: sanitizeString(customer.address),
    postcode: sanitizeString(customer.postcode),
    date_of_birth: sanitizeDate(customer.date_of_birth),
    medical_conditions: sanitizeMedicalConditions(customer.medical_conditions),
    medical_notes: sanitizeString(customer.medical_notes),
    injury_recent: Boolean(customer.injury_recent),
    injury_recent_notes: sanitizeString(customer.injury_recent_notes),
    injury_previous: Boolean(customer.injury_previous),
    injury_previous_notes: sanitizeString(customer.injury_previous_notes),
    additional_information: sanitizeString(customer.additional_information),
  };
}

export async function GET(request: NextRequest) {
  try {
    const customer = await getAuthenticatedCustomer(request);
    if (!customer) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("customers")
      .select(
        "email, full_name, phone, address, postcode, date_of_birth, medical_conditions, medical_notes, injury_recent, injury_recent_notes, injury_previous, injury_previous_notes, additional_information",
      )
      .eq("id", customer.id)
      .single();

    if (error || !data) throw error ?? new Error("Customer not found.");

    return NextResponse.json({ profile: profileFromCustomerRecord(data as Record<string, unknown>) }, { status: 200 });
  } catch (error) {
    console.error("Failed to load account profile:", error);
    return NextResponse.json({ error: "Unable to load profile." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const customer = await getAuthenticatedCustomer(request);
    if (!customer) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = (await request.json()) as Record<string, unknown>;

    const updatePayload = {
      full_name: sanitizeString(body.full_name) || null,
      phone: sanitizeString(body.phone) || null,
      address: sanitizeString(body.address) || null,
      postcode: sanitizeString(body.postcode).toUpperCase() || null,
      date_of_birth: sanitizeDate(body.date_of_birth) || null,
      medical_conditions: sanitizeMedicalConditions(body.medical_conditions),
      medical_notes: sanitizeString(body.medical_notes) || null,
      injury_recent: body.injury_recent === true,
      injury_recent_notes: sanitizeString(body.injury_recent_notes) || null,
      injury_previous: body.injury_previous === true,
      injury_previous_notes: sanitizeString(body.injury_previous_notes) || null,
      additional_information: sanitizeString(body.additional_information) || null,
    };

    const { data, error } = await supabaseAdmin
      .from("customers")
      .update(updatePayload)
      .eq("id", customer.id)
      .select(
        "email, full_name, phone, address, postcode, date_of_birth, medical_conditions, medical_notes, injury_recent, injury_recent_notes, injury_previous, injury_previous_notes, additional_information",
      )
      .single();

    if (error || !data) throw error ?? new Error("Profile update failed.");

    return NextResponse.json({ profile: profileFromCustomerRecord(data as Record<string, unknown>) }, { status: 200 });
  } catch (error) {
    console.error("Failed to update account profile:", error);
    return NextResponse.json({ error: "Unable to save profile." }, { status: 500 });
  }
}
