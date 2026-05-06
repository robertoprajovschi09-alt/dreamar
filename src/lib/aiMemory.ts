import { supabase } from "@/integrations/supabase/client";

export type MemoryType =
  | "agency_preference"
  | "client_brand_voice"
  | "client_goal"
  | "niche_insight"
  | "content_pattern"
  | "winning_hook"
  | "failed_hook"
  | "reporting_preference"
  | "business_context"
  | "audience_insight"
  | "competitor_insight";

export type MemoryVisibility = "internal_agency" | "client_visible" | "super_admin_only";

export interface AiMemoryItem {
  id: string;
  agency_id: string;
  client_id: string | null;
  memory_type: MemoryType;
  title: string;
  content: string;
  source_type: string;
  source_id: string;
  confidence_score: number;
  is_active: boolean;
  visibility: MemoryVisibility;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiKnowledgeSource {
  id: string;
  agency_id: string;
  client_id: string | null;
  source_type: string;
  source_id: string;
  title: string;
  content_summary: string | null;
  extracted_facts: any;
  status: "pending" | "processing" | "processed" | "failed" | "archived";
  last_processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function listMemories(agencyId: string) {
  const { data, error } = await supabase
    .from("ai_memory_items")
    .select("*")
    .eq("agency_id", agencyId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as AiMemoryItem[];
}

export async function upsertMemory(input: Partial<AiMemoryItem> & {
  agency_id: string; memory_type: MemoryType; title: string; content: string;
  source_type: string; source_id: string;
}) {
  if (!input.source_type?.trim() || !input.source_id?.trim()) {
    throw new Error("Memory requires a source_type and source_id");
  }
  const payload: any = { ...input };
  if (input.id) {
    const { id, ...rest } = payload;
    const { data, error } = await supabase
      .from("ai_memory_items").update(rest).eq("id", id).select().single();
    if (error) throw error;
    return data as AiMemoryItem;
  }
  const { data, error } = await supabase
    .from("ai_memory_items").insert(payload).select().single();
  if (error) throw error;
  return data as AiMemoryItem;
}

export async function setMemoryActive(id: string, is_active: boolean) {
  const { error } = await supabase.from("ai_memory_items").update({ is_active }).eq("id", id);
  if (error) throw error;
}

export async function deleteMemory(id: string) {
  const { error } = await supabase.from("ai_memory_items").delete().eq("id", id);
  if (error) throw error;
}

export async function listKnowledgeSources(agencyId: string) {
  const { data, error } = await supabase
    .from("ai_knowledge_sources")
    .select("*")
    .eq("agency_id", agencyId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as AiKnowledgeSource[];
}

export async function ingestKnowledgeSource(payload: {
  agency_id: string; client_id?: string | null;
  source_type: string; source_id: string; title: string; raw_content: string;
}) {
  const { data, error } = await supabase.functions.invoke("ai-knowledge-ingest", { body: payload });
  if (error) throw error;
  return data;
}
