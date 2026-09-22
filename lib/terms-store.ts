import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_TERMS_AND_CONDITIONS,
  type TermsAndConditions,
  type TermsAndConditionsSection,
  normalizeTermsAndConditions,
} from "@/lib/terms-and-conditions";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const TERMS_AND_CONDITIONS_ROW_ID = "11111111-1111-1111-1111-111111111111";

type TermsRow = {
  id: string;
  title: string;
  intro: string;
  sections: unknown;
  updated_at?: string;
};

function parseTermsRow(row: TermsRow | null | undefined): TermsAndConditions | null {
  if (!row) return null;
  return normalizeTermsAndConditions({
    title: row.title,
    intro: row.intro,
    sections: row.sections,
  });
}

async function loadTermsRow(client: SupabaseClient) {
  const { data, error } = await client
    .from("terms_and_conditions")
    .select("id, title, intro, sections, updated_at")
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

type TermsSectionValidationResult =
  | { success: true; value: TermsAndConditionsSection }
  | { success: false; error: string };

function validateSection(section: unknown, index: number): TermsSectionValidationResult {
  if (!section || typeof section !== "object") {
    return { success: false, error: `Section ${index + 1} is invalid.` };
  }
  const sectionRecord = section as Record<string, unknown>;

  const title = typeof sectionRecord.title === "string" ? sectionRecord.title.trim() : "";
  if (!title) {
    return { success: false, error: `Section ${index + 1} title is required.` };
  }

  if (!Array.isArray(sectionRecord.bullets) || sectionRecord.bullets.length === 0) {
    return { success: false, error: `Section ${index + 1} must include at least one bullet.` };
  }

  const bullets = sectionRecord.bullets.map((bullet, bulletIndex) => {
    if (typeof bullet !== "string" || bullet.trim().length === 0) {
      throw new Error(`Section ${index + 1} bullet ${bulletIndex + 1} cannot be empty.`);
    }

    return bullet.trim();
  });

  return {
    success: true,
    value: {
      title,
      bullets,
    },
  };
}

export function validateTermsAndConditionsInput(body: unknown): TermsValidationResult {
  if (!body || typeof body !== "object") {
    return { success: false, error: "Request body is invalid." };
  }
  const bodyRecord = body as Record<string, unknown>;

  const title = typeof bodyRecord.title === "string" ? bodyRecord.title.trim() : "";
  const intro = typeof bodyRecord.intro === "string" ? bodyRecord.intro.trim() : "";

  if (!title) {
    return { success: false, error: "Title is required." };
  }

  if (!intro) {
    return { success: false, error: "Intro is required." };
  }

  if (!Array.isArray(bodyRecord.sections)) {
    return { success: false, error: "Sections must be an array." };
  }

  if (bodyRecord.sections.length === 0) {
    return { success: false, error: "Add at least one section." };
  }

  const sections: TermsAndConditionsSection[] = [];

  try {
    for (let index = 0; index < bodyRecord.sections.length; index += 1) {
      const section = bodyRecord.sections[index];
      const validatedSection = validateSection(section, index);
      if (!validatedSection.success) {
        return validatedSection;
      }
      sections.push(validatedSection.value);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Section bullets are invalid.",
    };
  }

  return {
    success: true,
    value: {
      title,
      intro,
      sections,
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
        intro: terms.intro,
        sections: terms.sections,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("id, title, intro, sections, updated_at")
    .single();

  if (error) throw error;
  return parseTermsRow(data as TermsRow | null) ?? DEFAULT_TERMS_AND_CONDITIONS;
}
