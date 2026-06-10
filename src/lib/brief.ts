import { supabase } from "@/integrations/supabase/client";

export type ClientBrief = {
  id?: string;
  agency_id: string;
  client_id: string;
  submitted_by?: string | null;
  business_description?: string | null;
  main_objective?: string | null;
  target_audience?: string | null;
  unique_selling_points?: string | null;
  main_competitors?: string | null;
  brand_tone?: string | null;
  content_dos?: string | null;
  content_donts?: string | null;
  preferred_platforms?: string[] | null;
  posting_frequency?: string | null;
  budget_range?: string | null;
  extra_notes?: string | null;
  completed?: boolean;
  reviewed_at?: string | null;
};

export const BRAND_TONES = [
  { value: "friendly", label: "Friendly & approachable" },
  { value: "professional", label: "Professional & trustworthy" },
  { value: "luxury", label: "Luxury & elegant" },
  { value: "energetic", label: "Energetic & bold" },
  { value: "playful", label: "Playful & fun" },
  { value: "educational", label: "Educational & expert" },
];

export const POSTING_FREQUENCIES = [
  "1-2 / week", "3-4 / week", "Daily", "Multiple per day", "Not sure yet",
];

export const BUDGET_RANGES = [
  "< €500", "€500 - €1.500", "€1.500 - €5.000", "€5.000 - €15.000", "€15.000+", "Not sure",
];

export const PLATFORM_OPTIONS = [
  "Instagram", "TikTok", "Facebook", "YouTube", "LinkedIn", "Twitter/X", "Pinterest",
];

export async function getClientBrief(clientId: string) {
  const { data, error } = await (supabase as any)
    .from("client_briefs")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) throw error;
  return data as ClientBrief | null;
}

// Explicit list of columns we persist. Keeps payload deterministic and prevents silent drops.
export const BRIEF_COLUMNS = [
  "agency_id", "client_id", "submitted_by",
  "business_description", "main_objective", "target_audience",
  "unique_selling_points", "main_competitors",
  "brand_tone", "content_dos", "content_donts",
  "preferred_platforms", "posting_frequency", "budget_range",
  "extra_notes", "completed",
] as const;

export function serializeBrief(brief: ClientBrief): Record<string, any> {
  const out: Record<string, any> = {};
  for (const col of BRIEF_COLUMNS) {
    const v = (brief as any)[col];
    if (col === "preferred_platforms") {
      out[col] = Array.isArray(v) ? v : [];
    } else if (col === "completed") {
      out[col] = !!v;
    } else {
      out[col] = v ?? null;
    }
  }
  return out;
}

export async function saveClientBrief(brief: ClientBrief) {
  const payload = { ...serializeBrief(brief), updated_at: new Date().toISOString() };
  if (brief.id) {
    const { error } = await (supabase as any).from("client_briefs").update(payload).eq("id", brief.id);
    if (error) throw error;
    return brief.id;
  } else {
    const { data, error } = await (supabase as any).from("client_briefs").insert(payload).select("id").single();
    if (error) throw error;
    return data.id as string;
  }
}
