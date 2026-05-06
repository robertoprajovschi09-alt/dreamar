import { supabase } from "@/integrations/supabase/client";

export type HealthStatus = "critical" | "at_risk" | "healthy" | "excellent";

export type AiRecommendation = {
  why_this_score?: string;
  whats_working?: string[];
  whats_broken?: string[];
  next_month_actions?: string[];
};

export type HealthScore = {
  id: string;
  agency_id: string;
  client_id: string;
  month: number;
  year: number;
  period_start: string;
  period_end: string;
  total_score: number;
  content_consistency_score: number | null;
  performance_score: number | null;
  goal_progress_score: number | null;
  client_engagement_score: number | null;
  business_impact_score: number | null;
  score_status: HealthStatus;
  summary: string | null;
  ai_recommendation: AiRecommendation | null;
  ai_generated_at: string | null;
  missing_data: string[];
  breakdown: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export const STATUS_META: Record<HealthStatus, { label: string; ringClass: string; badgeClass: string; textClass: string }> = {
  critical:  { label: "Critical",  ringClass: "stroke-rose-500",    badgeClass: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30",       textClass: "text-rose-500" },
  at_risk:   { label: "At risk",   ringClass: "stroke-amber-500",   badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",   textClass: "text-amber-500" },
  healthy:   { label: "Healthy",   ringClass: "stroke-emerald-500", badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", textClass: "text-emerald-500" },
  excellent: { label: "Excellent", ringClass: "stroke-indigo-500",  badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",     textClass: "text-indigo-500" },
};

export const COMPONENT_LABELS: Record<string, string> = {
  content_consistency: "Content consistency",
  performance: "Performance",
  goal_progress: "Goal progress",
  client_engagement: "Client engagement",
  business_impact: "Business impact",
};

export const COMPONENT_WEIGHTS: Record<string, number> = {
  content_consistency: 20,
  performance: 25,
  goal_progress: 25,
  client_engagement: 15,
  business_impact: 15,
};

const TBL = "client_health_scores" as any;

export async function fetchCurrent(clientId: string): Promise<HealthScore | null> {
  const now = new Date();
  const { data } = await (supabase as any).from(TBL).select("*")
    .eq("client_id", clientId).eq("year", now.getFullYear()).eq("month", now.getMonth() + 1).maybeSingle();
  return data || null;
}

export async function fetchHistory(clientId: string, limit = 6): Promise<HealthScore[]> {
  const { data } = await (supabase as any).from(TBL).select("*")
    .eq("client_id", clientId).order("period_start", { ascending: false }).limit(limit);
  return data || [];
}

export async function fetchAgencyLatest(agencyId: string): Promise<HealthScore[]> {
  const { data } = await (supabase as any).from(TBL).select("*")
    .eq("agency_id", agencyId).order("period_start", { ascending: false }).limit(200);
  // Keep only the most recent per client
  const byClient = new Map<string, HealthScore>();
  (data || []).forEach((s: HealthScore) => {
    if (!byClient.has(s.client_id)) byClient.set(s.client_id, s);
  });
  return [...byClient.values()];
}

export async function compute(clientId: string, opts?: { month?: number; year?: number }): Promise<HealthScore> {
  const { data, error } = await supabase.functions.invoke("compute-health-score", {
    body: { client_id: clientId, month: opts?.month, year: opts?.year },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any).score as HealthScore;
}

export async function generateRecommendation(scoreId: string): Promise<HealthScore> {
  const { data, error } = await supabase.functions.invoke("health-score-recommendation", {
    body: { score_id: scoreId },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any).score as HealthScore;
}

export function statusFor(score: number): HealthStatus {
  if (score < 40) return "critical";
  if (score < 60) return "at_risk";
  if (score < 80) return "healthy";
  return "excellent";
}
