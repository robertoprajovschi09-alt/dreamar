import { supabase } from "@/integrations/supabase/client";

export type StrategyStatus = "draft" | "generated" | "reviewed" | "approved" | "sent_to_client";

export const STRATEGY_STATUS_META: Record<StrategyStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-muted text-foreground" },
  generated: { label: "Generated", color: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  reviewed: { label: "Reviewed", color: "bg-violet-500/20 text-violet-700 dark:text-violet-300" },
  approved: { label: "Approved", color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" },
  sent_to_client: { label: "Sent to client", color: "bg-accent/20 text-accent" },
};

export type CampaignIdea = { name: string; goal: string; description: string };
export type ActionItem = { title: string; description: string; priority: "low" | "medium" | "high" };
export type CalendarPlan = {
  posts_per_week?: number; reels?: number; stories?: number;
  carousels?: number; campaigns?: number; key_dates?: string[]; notes?: string;
};

export type MonthlyStrategy = {
  id: string;
  agency_id: string;
  client_id: string;
  month: number;
  year: number;
  based_on_report_id: string | null;
  strategy_title: string;
  executive_summary: string | null;
  key_insights: string[];
  what_worked: string[];
  what_did_not_work: string[];
  content_to_repeat: string[];
  content_to_stop: string[];
  new_tests: string[];
  recommended_hooks: string[];
  recommended_content_formats: string[];
  recommended_campaigns: CampaignIdea[];
  suggested_calendar_plan: CalendarPlan;
  business_focus: string[];
  risks: string[];
  action_items: ActionItem[];
  missing_data: string[];
  status: StrategyStatus;
  sent_to_client_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function listStrategies(agencyId: string, filters?: { clientId?: string; status?: StrategyStatus }) {
  let q = supabase.from("monthly_strategies" as any).select("*").eq("agency_id", agencyId).order("year", { ascending: false }).order("month", { ascending: false });
  if (filters?.clientId) q = q.eq("client_id", filters.clientId);
  if (filters?.status) q = q.eq("status", filters.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as unknown as MonthlyStrategy[];
}

export async function listStrategiesForClient(clientId: string, opts?: { onlySent?: boolean }) {
  let q = supabase.from("monthly_strategies" as any).select("*").eq("client_id", clientId).order("year", { ascending: false }).order("month", { ascending: false });
  if (opts?.onlySent) q = q.eq("status", "sent_to_client");
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as unknown as MonthlyStrategy[];
}

export async function getStrategy(id: string) {
  const { data, error } = await supabase.from("monthly_strategies" as any).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as MonthlyStrategy | null;
}

export async function generateStrategy(clientId: string, year: number, month: number) {
  const { data, error } = await supabase.functions.invoke("generate-monthly-strategy", {
    body: { client_id: clientId, year, month },
  });
  if (error) throw error;
  return data as { id: string };
}

export async function updateStrategy(id: string, patch: Partial<MonthlyStrategy>) {
  const { error } = await supabase.from("monthly_strategies" as any).update(patch as any).eq("id", id);
  if (error) throw error;
}

export async function setStrategyStatus(strategy: MonthlyStrategy, status: StrategyStatus) {
  const patch: any = { status };
  if (status === "sent_to_client") patch.sent_to_client_at = new Date().toISOString();
  const { error } = await supabase.from("monthly_strategies" as any).update(patch).eq("id", strategy.id);
  if (error) throw error;
  if (status === "sent_to_client") {
    const { data: clientUsers } = await supabase.from("client_users").select("user_id").eq("client_id", strategy.client_id).eq("status", "active");
    if (clientUsers && clientUsers.length) {
      const rows = clientUsers.map((cu: any) => ({
        user_id: cu.user_id,
        agency_id: strategy.agency_id,
        client_id: strategy.client_id,
        type: "strategy_sent",
        title: "New strategy received",
        body: `${strategy.strategy_title} for ${strategy.month}/${strategy.year}`,
        link: `/client`,
      }));
      await supabase.from("notifications").insert(rows);
    }
  }
}

export async function deleteStrategy(id: string) {
  const { error } = await supabase.from("monthly_strategies" as any).delete().eq("id", id);
  if (error) throw error;
}

export async function createTasksFromStrategy(strategy: MonthlyStrategy) {
  if (!strategy.action_items?.length) return 0;
  const rows = strategy.action_items.map((a) => ({
    agency_id: strategy.agency_id,
    client_id: strategy.client_id,
    title: a.title,
    description: a.description,
    priority: (a.priority || "medium") as any,
    status: "todo" as any,
    task_type: "strategy",
  }));
  const { error } = await supabase.from("tasks").insert(rows);
  if (error) throw error;
  return rows.length;
}

export async function createDraftsFromStrategy(strategy: MonthlyStrategy) {
  const formats = strategy.recommended_content_formats || [];
  const hooks = strategy.recommended_hooks || [];
  const total = Math.max(formats.length, hooks.length);
  if (!total) return 0;
  const baseDate = new Date(strategy.year, strategy.month - 1, 1);
  const perWeek = Math.max(1, Math.min(7, Number(strategy.suggested_calendar_plan?.posts_per_week) || 3));
  const stepDays = Math.max(1, Math.floor(7 / perWeek));
  const rows = Array.from({ length: total }).map((_, i) => {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i * stepDays);
    return {
      agency_id: strategy.agency_id,
      client_id: strategy.client_id,
      title: hooks[i] || formats[i] || `Strategy idea ${i + 1}`,
      hook: hooks[i] || null,
      format: formats[i] || null,
      content_type: formats[i] || null,
      status: "draft" as any,
      scheduled_for: d.toISOString(),
    };
  });
  const { error } = await supabase.from("content_posts").insert(rows);
  if (error) throw error;
  return rows.length;
}

export function monthLabel(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function nextMonth(): { year: number; month: number } {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}
