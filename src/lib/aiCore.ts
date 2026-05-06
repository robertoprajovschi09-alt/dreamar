// Helper for invoking the unified openai-ai-core edge function.
import { supabase } from "@/integrations/supabase/client";

export type AiCoreFeature =
  | "monthly_report_generation"
  | "next_month_strategy"
  | "content_idea_generation"
  | "video_performance_analysis"
  | "health_score_explanation"
  | "risk_detector_analysis"
  | "website_audit"
  | "lovable_fix_prompt_generator"
  | "document_summary"
  | "competitor_insights"
  | "swipe_file_variations"
  | "analytics_interpretation";

export type AiCoreOutput = {
  title: string;
  summary: string;
  insights: string[];
  recommendations: string[];
  missing_data: string[];
  confidence_score: number | null;
  action_items: { title: string; priority: "low" | "medium" | "high"; owner: string | null }[];
  warnings: string[];
  generated_text: string;
};

export type AiCoreResponse = {
  output_id?: string;
  output: AiCoreOutput;
  model: string;
  prompt_version: number;
  tokens: { in: number; out: number };
  cost_usd: number;
  status: "success" | "missing_data" | "blocked" | "error";
};

export async function runAiCore(args: {
  feature: AiCoreFeature;
  agency_id?: string | null;
  client_id?: string | null;
  input: unknown;
  context_type?: string;
  prompt_version_id?: string;
}): Promise<AiCoreResponse> {
  const { data, error } = await supabase.functions.invoke("openai-ai-core", { body: args });
  if (error) throw error;
  return data as AiCoreResponse;
}
