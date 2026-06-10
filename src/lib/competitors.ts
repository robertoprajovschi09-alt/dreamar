import { supabase } from "@/integrations/supabase/client";

export type Competitor = {
  id: string;
  agency_id: string;
  client_id: string;
  name: string;
  website: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  linkedin_url: string | null;
  niche: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CompetitorObservation = {
  id: string;
  agency_id: string;
  client_id: string;
  competitor_id: string;
  title: string;
  platform: string | null;
  content_type: string | null;
  content_url: string | null;
  screenshot_url: string | null;
  observed_date: string;
  hook: string | null;
  caption: string | null;
  offer: string | null;
  content_angle: string | null;
  estimated_performance: string | null;
  notes: string | null;
  ai_analysis: any;
  tags: string[];
  visible_to_client: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export const COMP_PLATFORMS = ["instagram", "tiktok", "youtube", "facebook", "linkedin", "x", "other"];
export const COMP_CONTENT_TYPES = ["reel", "short", "video", "carousel", "post", "story", "live", "ad"];
export const COMP_PERFORMANCE = ["low", "medium", "high", "viral"];

const TC = "competitors" as any;
const TO = "competitor_observations" as any;

export async function listCompetitors(clientId: string): Promise<Competitor[]> {
  const { data, error } = await (supabase as any).from(TC).select("*").eq("client_id", clientId).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createCompetitor(p: Partial<Competitor>) {
  const { data, error } = await (supabase as any).from(TC).insert(p).select().single();
  if (error) throw error;
  return data as Competitor;
}
export async function updateCompetitor(id: string, p: Partial<Competitor>) {
  const { data, error } = await (supabase as any).from(TC).update(p).eq("id", id).select().single();
  if (error) throw error;
  return data as Competitor;
}
export async function deleteCompetitor(id: string) {
  const { error } = await (supabase as any).from(TC).delete().eq("id", id);
  if (error) throw error;
}

export async function listObservations(clientId: string, competitorId?: string): Promise<CompetitorObservation[]> {
  let q = (supabase as any).from(TO).select("*").eq("client_id", clientId).order("observed_date", { ascending: false });
  if (competitorId) q = q.eq("competitor_id", competitorId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function listClientVisibleObservations(clientId: string): Promise<CompetitorObservation[]> {
  const { data, error } = await (supabase as any).from(TO).select("*")
    .eq("client_id", clientId).eq("visible_to_client", true)
    .order("observed_date", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createObservation(p: Partial<CompetitorObservation>) {
  const { data, error } = await (supabase as any).from(TO).insert(p).select().single();
  if (error) throw error;
  return data as CompetitorObservation;
}
export async function updateObservation(id: string, p: Partial<CompetitorObservation>) {
  const { data, error } = await (supabase as any).from(TO).update(p).eq("id", id).select().single();
  if (error) throw error;
  return data as CompetitorObservation;
}
export async function deleteObservation(id: string) {
  const { error } = await (supabase as any).from(TO).delete().eq("id", id);
  if (error) throw error;
}

export async function uploadScreenshot(agencyId: string, clientId: string, competitorId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const path = `${agencyId}/competitors/${clientId}/${competitorId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("agency-files").upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function screenshotUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = await supabase.storage.from("agency-files").createSignedUrl(path.replace(/^\/+/, ""), 3600);
  return data?.signedUrl ?? null;
}

export async function aiInsights(client_id: string) {
  const { data, error } = await supabase.functions.invoke("competitor-insights", { body: { client_id } });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as {
    patterns: string[];
    common_content_types: string[];
    missed_opportunities: string[];
    differentiation_angles: string[];
    original_ideas: { title: string; hook: string; angle: string; why_it_works: string }[];
    missing_data?: string[];
  };
}

export async function aiCompare(client_id: string, competitor_ids: string[]) {
  const { data, error } = await supabase.functions.invoke("competitor-compare", { body: { client_id, competitor_ids } });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as {
    rows: { competitor_name: string; strengths: string[]; weaknesses: string[]; content_mix: string[] }[];
    adopt: string[];
    avoid: string[];
  };
}

export async function aiAnalyzeObservation(observation_id: string) {
  const { data, error } = await supabase.functions.invoke("competitor-observation-analyze", { body: { observation_id } });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { ai_analysis: any };
}
