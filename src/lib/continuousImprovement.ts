import { supabase } from "@/integrations/supabase/client";

export type CieRunType = "weekly_agency" | "monthly_strategy" | "manual" | "platform";

export interface CieRun {
  id: string;
  agency_id: string | null;
  run_type: string;
  input_summary: any;
  detected_patterns: any[];
  recommended_improvements: any[];
  approved_improvements: any[];
  rejected_improvements: any[];
  performance_before: any;
  performance_after: any;
  status: "collecting" | "evaluating" | "awaiting_review" | "completed" | "failed";
  triggered_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function runEngine(opts: { run_type: CieRunType; agency_id?: string | null; since_days?: number }) {
  const { data, error } = await supabase.functions.invoke("continuous-improvement-engine", { body: opts });
  if (error) throw error;
  return data;
}

export async function measureRunAgain(run_id: string, since_days?: number) {
  const { data, error } = await supabase.functions.invoke("continuous-improvement-engine", {
    body: { measure_run_id: run_id, since_days, run_type: "manual" },
  });
  if (error) throw error;
  return data;
}

export async function listRuns(agency_id?: string | null) {
  let q = supabase.from("continuous_improvement_runs").select("*").order("created_at", { ascending: false }).limit(100);
  if (agency_id) q = q.eq("agency_id", agency_id);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as CieRun[];
}

export async function getRun(id: string) {
  const { data, error } = await supabase.from("continuous_improvement_runs").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as CieRun | null;
}
