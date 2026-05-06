import { supabase } from "@/integrations/supabase/client";

export type SwipeType =
  | "hook" | "script" | "caption" | "video_idea" | "ad_angle"
  | "carousel_idea" | "story_idea" | "offer" | "cta" | "full_example";

export type SwipeVisibility = "agency_internal" | "client_specific" | "global_template";

export type SwipeFile = {
  id: string;
  agency_id: string;
  client_id: string | null;
  niche: string | null;
  title: string;
  type: SwipeType;
  platform: string | null;
  hook: string | null;
  script: string | null;
  caption: string | null;
  content_angle: string | null;
  content_format: string | null;
  performance_notes: string | null;
  why_it_worked: string | null;
  source_url: string | null;
  file_url: string | null;
  tags: string[];
  visibility: SwipeVisibility;
  usage_count: number;
  performance_score: number | null;
  source_post_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export const SWIPE_TYPES: { value: SwipeType; label: string }[] = [
  { value: "hook", label: "Hook" },
  { value: "script", label: "Script" },
  { value: "caption", label: "Caption" },
  { value: "video_idea", label: "Video idea" },
  { value: "ad_angle", label: "Ad angle" },
  { value: "carousel_idea", label: "Carousel idea" },
  { value: "story_idea", label: "Story idea" },
  { value: "offer", label: "Offer" },
  { value: "cta", label: "CTA" },
  { value: "full_example", label: "Full content example" },
];

export const SWIPE_PLATFORMS = ["instagram", "tiktok", "youtube", "facebook", "linkedin", "x", "other"];

export const SWIPE_VISIBILITY: { value: SwipeVisibility; label: string; description: string }[] = [
  { value: "agency_internal", label: "Internal", description: "Only your agency team can see this." },
  { value: "client_specific", label: "Client-visible", description: "Visible to a specific client in their portal." },
  { value: "global_template", label: "Global template", description: "Shared across the platform (admin only)." },
];

export function typeLabel(t: SwipeType) {
  return SWIPE_TYPES.find((s) => s.value === t)?.label ?? t;
}

const TBL = "swipe_files" as any;

export async function listSwipes(agencyId: string): Promise<SwipeFile[]> {
  const { data, error } = await (supabase as any)
    .from(TBL)
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listClientVisibleSwipes(clientId: string): Promise<SwipeFile[]> {
  const { data, error } = await (supabase as any)
    .from(TBL)
    .select("*")
    .eq("client_id", clientId)
    .eq("visibility", "client_specific")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createSwipe(payload: Partial<SwipeFile>): Promise<SwipeFile> {
  const { data, error } = await (supabase as any).from(TBL).insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateSwipe(id: string, patch: Partial<SwipeFile>): Promise<SwipeFile> {
  const { data, error } = await (supabase as any).from(TBL).update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSwipe(id: string) {
  const { error } = await (supabase as any).from(TBL).delete().eq("id", id);
  if (error) throw error;
}

export async function incrementUsage(id: string) {
  const { data } = await (supabase as any).from(TBL).select("usage_count").eq("id", id).maybeSingle();
  if (data) {
    await (supabase as any).from(TBL).update({ usage_count: (data.usage_count || 0) + 1 }).eq("id", id);
  }
}

export async function aiAnalyze(id: string) {
  const { data, error } = await supabase.functions.invoke("swipe-analyze", { body: { swipe_id: id } });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { why_it_worked: string };
}

export async function aiVariations(id: string, count = 10) {
  const { data, error } = await supabase.functions.invoke("swipe-generate-variations", { body: { swipe_id: id, count } });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { variations: { hook: string; script?: string; angle?: string }[] };
}

export async function aiAdaptNiche(id: string, target_niche: string) {
  const { data, error } = await supabase.functions.invoke("swipe-adapt-niche", { body: { swipe_id: id, target_niche } });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { title: string; hook: string; script: string; caption: string; suggested_tags: string[] };
}

export async function aiSuggestReuse(id: string) {
  const { data, error } = await supabase.functions.invoke("swipe-suggest-reuse", { body: { swipe_id: id } });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { suggestions: { client_name?: string; platform?: string; reason: string }[] };
}
