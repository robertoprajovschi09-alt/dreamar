import { supabase } from "@/integrations/supabase/client";
import { fetchCollectingClientIds } from "@/lib/clientStatus";

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type AlertStatus = "active" | "acknowledged" | "resolved" | "ignored";

export type RiskReason = { code: string; label: string; severity: "low" | "medium" | "high"; value?: string; weight: number };
export type RecoveryAction = { title: string; description: string; priority: "low" | "medium" | "high" };

export type RiskAlert = {
  id: string;
  agency_id: string;
  client_id: string;
  risk_level: RiskLevel;
  risk_score: number;
  risk_reasons: RiskReason[];
  ai_summary: string | null;
  recommended_actions: RecoveryAction[];
  ai_generated_at: string | null;
  status: AlertStatus;
  detected_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export const LEVEL_META: Record<RiskLevel, { label: string; badgeClass: string; ringClass: string }> = {
  low:      { label: "Low",      badgeClass: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",   ringClass: "stroke-slate-400" },
  medium:   { label: "Medium",   badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",   ringClass: "stroke-amber-500" },
  high:     { label: "High",     badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30", ringClass: "stroke-orange-500" },
  critical: { label: "Critical", badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",       ringClass: "stroke-rose-500" },
};

const TBL = "client_risk_alerts" as any;

export async function fetchAgencyAlerts(agencyId: string, status: AlertStatus | "all" = "active"): Promise<RiskAlert[]> {
  let q = (supabase as any).from(TBL).select("*").eq("agency_id", agencyId).order("risk_score", { ascending: false });
  if (status !== "all") q = q.eq("status", status);
  const { data } = await q;
  return data || [];
}

export async function fetchClientActiveAlert(clientId: string): Promise<RiskAlert | null> {
  const { data } = await (supabase as any).from(TBL).select("*").eq("client_id", clientId).eq("status", "active").maybeSingle();
  return data || null;
}

export async function detectForAgency(agencyId: string) {
  // Skip clients still in "Collecting data" onboarding state.
  const collecting = await fetchCollectingClientIds(agencyId);
  const excludeIds = Array.from(collecting);

  const { data, error } = await supabase.functions.invoke("detect-client-risk", {
    body: { agency_id: agencyId, exclude_client_ids: excludeIds },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);

  // Immediately resolve any stale active alerts for collecting-data clients so
  // they disappear from the UI even if the edge function ignored the exclude list.
  if (excludeIds.length > 0) {
    await (supabase as any)
      .from(TBL)
      .update({ status: "ignored", resolved_at: new Date().toISOString() })
      .eq("agency_id", agencyId)
      .eq("status", "active")
      .in("client_id", excludeIds);
  }

  return data;
}

export async function detectForClient(clientId: string) {
  const { data, error } = await supabase.functions.invoke("detect-client-risk", { body: { client_id: clientId } });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

export async function runRiskAnalysis(alertId: string) {
  const { data, error } = await supabase.functions.invoke("risk-analysis", { body: { alert_id: alertId } });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { alert: RiskAlert; analysis: any };
}

export async function generateRecoveryTasks(alertId: string) {
  const { data, error } = await supabase.functions.invoke("generate-recovery-tasks", { body: { alert_id: alertId } });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { created: number; task_ids: string[] };
}

export async function updateAlertStatus(id: string, status: AlertStatus) {
  const patch: any = { status };
  if (status === "resolved" || status === "ignored") patch.resolved_at = new Date().toISOString();
  const { error } = await (supabase as any).from(TBL).update(patch).eq("id", id);
  if (error) throw error;
}
