import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_TERMS_AND_CONDITIONS,
  type TermsAndConditions,
  normalizeTermsAndConditions,
} from "@/lib/terms-and-conditions";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const TERMS_AND_CONDITIONS_ROW_ID = "11111111-1111-1111-1111-111111111111";

type TermsRow = {
  id: string;
  title: string;
  content: string;
  updated_at?: string;
};

function parseTermsRow(row: TermsRow | null | undefined): TermsAndConditions | null {
  if (!row) return null;
  return normalizeTermsAndConditions({
    title: row.title,
    content: row.content,
    updated_at: row.updated_at,
  });
}

async function loadTermsRow(client: SupabaseClient) {
  const { data, error } = await client
    .from("terms_and_conditions")
    .select("id, title, content, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as TermsRow | null;
}

export async function getTermsAndConditions(client: SupabaseClient = supabaseAdmin): Promise<TermsAndConditions> {
  try {
    const row = await loadTermsRow(client);
    return parseTermsRow(row) ?? DEFAULT_TERMS_AND_CONDITIONS;
  } catch (error) {
    console.error("Failed to load terms and conditions:", error);
    return DEFAULT_TERMS_AND_CONDITIONS;
  }
}

export type TermsValidationResult =
  | { success: true; value: TermsAndConditions }
  | { success: false; error: string };

export function validateTermsAndConditionsInput(body: unknown): TermsValidationResult {
  if (!body || typeof body !== "object") {
    return { success: false, error: "Request body is invalid." };
  }
  const bodyRecord = body as Record<string, unknown>;

  const title = typeof bodyRecord.title === "string" ? bodyRecord.title.trim() : "";
  const content = typeof bodyRecord.content === "string" ? bodyRecord.content.trim() : "";

  if (!title) {
    return { success: false, error: "Title is required." };
  }

  if (!content) {
    return { success: false, error: "Content is required." };
  }

  return {
    success: true,
    value: {
      title,
      content,
    },
  };
}

export async function saveTermsAndConditions(terms: TermsAndConditions) {
  const { data, error } = await supabaseAdmin
    .from("terms_and_conditions")
    .upsert(
      {
        id: TERMS_AND_CONDITIONS_ROW_ID,
        title: terms.title,
        content: terms.content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("id, title, content, updated_at")
    .single();

  if (error) throw error;
  return parseTermsRow(data as TermsRow | null) ?? DEFAULT_TERMS_AND_CONDITIONS;
}
