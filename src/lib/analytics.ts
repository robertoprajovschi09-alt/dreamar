import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";

export const PLATFORMS = ["instagram", "tiktok", "facebook", "youtube", "linkedin", "other"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook",
  youtube: "YouTube", linkedin: "LinkedIn", other: "Other",
};

export type AnalyticsSource = "manual" | "csv_import" | "ai_extracted" | "integration";

export type AnalyticsEntry = {
  id: string;
  agency_id: string;
  client_id: string;
  platform: string;
  period_type: string;
  month: number | null;
  year: number | null;
  date_start: string | null;
  date_end: string | null;
  views: number; reach: number; impressions: number;
  likes: number; comments: number; shares: number; saves: number;
  engagement_rate: number | null;
  followers_start: number | null; followers_end: number | null; followers_gained: number | null;
  profile_visits: number | null; website_clicks: number | null;
  messages: number | null; calls: number | null;
  leads: number | null; bookings: number | null; sales: number | null;
  revenue: number | null;
  ad_spend: number | null; roas: number | null; cost_per_lead: number | null; cost_per_purchase: number | null;
  notes: string | null;
  source: AnalyticsSource;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentMetric = {
  id: string;
  agency_id: string;
  client_id: string;
  content_item_id: string;
  platform: string | null;
  views: number; reach: number; impressions: number;
  likes: number; comments: number; shares: number; saves: number;
  watch_time: number | null; average_view_duration: number | null;
  retention_rate: number | null; hook_rate: number | null; completion_rate: number | null;
  followers_gained: number | null;
  leads: number | null; sales: number | null; bookings: number | null; revenue: number | null;
  notes: string | null;
  source: AnalyticsSource;
  created_at: string;
  updated_at: string;
};

/* ---------- Analytics entries ---------- */
export async function listAnalyticsEntries(filters: {
  clientId?: string; agencyId?: string; year?: number; month?: number; platform?: string;
}) {
  let q: any = supabase.from("analytics_entries" as any).select("*").order("date_start", { ascending: false });
  if (filters.clientId) q = q.eq("client_id", filters.clientId);
  if (filters.agencyId) q = q.eq("agency_id", filters.agencyId);
  if (filters.year) q = q.eq("year", filters.year);
  if (filters.month) q = q.eq("month", filters.month);
  if (filters.platform) q = q.eq("platform", filters.platform);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as unknown as AnalyticsEntry[];
}

export async function upsertAnalyticsEntry(row: Partial<AnalyticsEntry>) {
  const payload: any = { ...row };
  if (payload.id) {
    const { id, ...rest } = payload;
    const { error } = await supabase.from("analytics_entries" as any).update(rest).eq("id", id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase.from("analytics_entries" as any).insert(payload).select("id").single();
  if (error) throw error;
  return (data as any).id as string;
}

export async function deleteAnalyticsEntry(id: string) {
  const { error } = await supabase.from("analytics_entries" as any).delete().eq("id", id);
  if (error) throw error;
}

/* ---------- Content metrics ---------- */
export async function listContentMetrics(filters: { clientId?: string; contentItemId?: string }) {
  let q: any = supabase.from("content_metrics" as any).select("*").order("updated_at", { ascending: false });
  if (filters.clientId) q = q.eq("client_id", filters.clientId);
  if (filters.contentItemId) q = q.eq("content_item_id", filters.contentItemId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as unknown as ContentMetric[];
}

export async function upsertContentMetric(row: Partial<ContentMetric>) {
  const payload: any = { ...row };
  if (payload.id) {
    const { id, ...rest } = payload;
    const { error } = await supabase.from("content_metrics" as any).update(rest).eq("id", id);
    if (error) throw error;
    return id;
  }
  // upsert by (content_item_id, platform)
  const { data, error } = await supabase
    .from("content_metrics" as any)
    .upsert(payload, { onConflict: "content_item_id,platform" })
    .select("id")
    .single();
  if (error) throw error;
  return (data as any).id as string;
}

export async function deleteContentMetric(id: string) {
  const { error } = await supabase.from("content_metrics" as any).delete().eq("id", id);
  if (error) throw error;
}

/* ---------- Aggregations ---------- */
const num = (n: any) => (typeof n === "number" && !Number.isNaN(n) ? n : 0);

export function aggregateByPlatform(entries: AnalyticsEntry[]) {
  const map = new Map<string, { platform: string; views: number; reach: number; engagement: number; followers_gained: number; leads: number; revenue: number; entries: number }>();
  for (const e of entries) {
    const key = e.platform || "other";
    const cur = map.get(key) || { platform: key, views: 0, reach: 0, engagement: 0, followers_gained: 0, leads: 0, revenue: 0, entries: 0 };
    cur.views += num(e.views); cur.reach += num(e.reach);
    cur.engagement += num(e.likes) + num(e.comments) + num(e.shares) + num(e.saves);
    cur.followers_gained += num(e.followers_gained);
    cur.leads += num(e.leads); cur.revenue += num(e.revenue); cur.entries++;
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.views - a.views);
}

export function aggregateByMonth(entries: AnalyticsEntry[]) {
  const map = new Map<string, { key: string; year: number; month: number; views: number; reach: number; engagement: number; followers_gained: number; leads: number; revenue: number }>();
  for (const e of entries) {
    if (!e.year || !e.month) continue;
    const key = `${e.year}-${String(e.month).padStart(2, "0")}`;
    const cur = map.get(key) || { key, year: e.year, month: e.month, views: 0, reach: 0, engagement: 0, followers_gained: 0, leads: 0, revenue: 0 };
    cur.views += num(e.views); cur.reach += num(e.reach);
    cur.engagement += num(e.likes) + num(e.comments) + num(e.shares) + num(e.saves);
    cur.followers_gained += num(e.followers_gained);
    cur.leads += num(e.leads); cur.revenue += num(e.revenue);
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export function totals(entries: AnalyticsEntry[]) {
  return entries.reduce((acc, e) => ({
    views: acc.views + num(e.views),
    reach: acc.reach + num(e.reach),
    impressions: acc.impressions + num(e.impressions),
    engagement: acc.engagement + num(e.likes) + num(e.comments) + num(e.shares) + num(e.saves),
    followers_gained: acc.followers_gained + num(e.followers_gained),
    leads: acc.leads + num(e.leads),
    bookings: acc.bookings + num(e.bookings),
    sales: acc.sales + num(e.sales),
    revenue: acc.revenue + num(e.revenue),
    ad_spend: acc.ad_spend + num(e.ad_spend),
  }), { views: 0, reach: 0, impressions: 0, engagement: 0, followers_gained: 0, leads: 0, bookings: 0, sales: 0, revenue: 0, ad_spend: 0 });
}

export function rankContent(metrics: ContentMetric[], posts: { id: string; title: string }[]) {
  if (!metrics.length) return [] as Array<{ id: string; title: string; views: number; engagement: number; tier: "top" | "mid" | "low" }>;
  const titles = new Map(posts.map((p) => [p.id, p.title]));
  const avgViews = metrics.reduce((s, m) => s + num(m.views), 0) / metrics.length;
  return metrics
    .map((m) => {
      const eng = num(m.likes) + num(m.comments) + num(m.shares) + num(m.saves);
      const tier: "top" | "mid" | "low" = num(m.views) >= avgViews * 1.4 ? "top" : num(m.views) <= avgViews * 0.6 ? "low" : "mid";
      return { id: m.content_item_id, title: titles.get(m.content_item_id) || "Untitled", views: num(m.views), engagement: eng, tier, platform: m.platform };
    })
    .sort((a, b) => b.views - a.views);
}

/* ---------- Missing data ---------- */
export type MissingField = { field: string; importance: "high" | "medium" | "low"; reason: string; owner: string };

export function detectMissingData(entries: AnalyticsEntry[]): MissingField[] {
  const out: MissingField[] = [];
  if (!entries.length) {
    out.push({ field: "Analytics entries", importance: "high", reason: "No analytics has been logged for this period.", owner: "Agency" });
    return out;
  }
  const has = (k: keyof AnalyticsEntry) => entries.some((e) => e[k] != null && Number(e[k]) > 0);
  if (!has("followers_gained" as any)) out.push({ field: "Followers gained", importance: "medium", reason: "Needed to measure audience growth.", owner: "Agency" });
  if (!has("leads")) out.push({ field: "Leads", importance: "high", reason: "Critical for ROI and business impact.", owner: "Agency" });
  if (!has("revenue")) out.push({ field: "Revenue", importance: "high", reason: "Required to calculate ROAS / ROI.", owner: "Client" });
  if (!has("ad_spend")) out.push({ field: "Ad spend", importance: "medium", reason: "Needed to calculate ROAS and CPL.", owner: "Agency" });
  if (!has("reach")) out.push({ field: "Reach", importance: "medium", reason: "Distinguishes audience size from impressions.", owner: "Agency" });
  return out;
}

/* ---------- AI insights ---------- */
export async function generateInsights(input: { clientId: string; year: number; month: number }) {
  const { data, error } = await supabase.functions.invoke("analytics-insights", { body: input });
  if (error) throw error;
  return data as {
    best_platform: string | null; worst_platform: string | null;
    top_content: string[]; bottom_content: string[];
    what_worked: string[]; what_dropped: string[];
    recommendations: string[]; next_month_focus: string[];
    missing_data: string[];
  };
}

/* ---------- CSV ---------- */
export type CsvParsed = { headers: string[]; rows: Record<string, string>[] };

export function parseCsv(file: File): Promise<CsvParsed> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => resolve({ headers: res.meta.fields || [], rows: res.data as any }),
      error: (err) => reject(err),
    });
  });
}

export const ANALYTICS_COLUMNS = [
  "platform", "month", "year", "date_start", "date_end",
  "views", "reach", "impressions", "likes", "comments", "shares", "saves", "engagement_rate",
  "followers_start", "followers_end", "followers_gained",
  "profile_visits", "website_clicks", "messages", "calls",
  "leads", "bookings", "sales", "revenue",
  "ad_spend", "roas", "cost_per_lead", "cost_per_purchase", "notes",
];

export const CONTENT_METRIC_COLUMNS = [
  "platform", "views", "reach", "impressions", "likes", "comments", "shares", "saves",
  "watch_time", "average_view_duration", "retention_rate", "hook_rate", "completion_rate",
  "followers_gained", "leads", "sales", "bookings", "revenue", "notes",
];

export function heuristicMapping(headers: string[], target: "analytics_entries" | "content_metrics") {
  const cols = target === "analytics_entries" ? ANALYTICS_COLUMNS : CONTENT_METRIC_COLUMNS;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const result: Record<string, string> = {};
  for (const h of headers) {
    const nh = norm(h);
    const exact = cols.find((c) => norm(c) === nh);
    if (exact) { result[h] = exact; continue; }
    const partial = cols.find((c) => nh.includes(norm(c)) || norm(c).includes(nh));
    if (partial) result[h] = partial;
  }
  return result;
}

export async function suggestCsvMapping(headers: string[], target: "analytics_entries" | "content_metrics") {
  try {
    const { data } = await supabase.functions.invoke("analytics-csv-suggest-mapping", { body: { headers, target } });
    if (data?.mapping) return data.mapping as Record<string, string>;
  } catch { /* fallback */ }
  return heuristicMapping(headers, target);
}

const numericCols = new Set([
  "views", "reach", "impressions", "likes", "comments", "shares", "saves", "engagement_rate",
  "followers_start", "followers_end", "followers_gained", "profile_visits", "website_clicks",
  "messages", "calls", "leads", "bookings", "sales", "revenue",
  "ad_spend", "roas", "cost_per_lead", "cost_per_purchase",
  "watch_time", "average_view_duration", "retention_rate", "hook_rate", "completion_rate",
  "month", "year",
]);

export function buildRowsFromCsv(args: {
  rows: Record<string, string>[];
  mapping: Record<string, string>;
  defaults: Record<string, any>;
  target: "analytics_entries" | "content_metrics";
}) {
  return args.rows.map((row) => {
    const out: Record<string, any> = { ...args.defaults, source: "csv_import" };
    for (const [header, col] of Object.entries(args.mapping)) {
      if (!col) continue;
      const raw = row[header];
      if (raw === undefined || raw === null || raw === "") continue;
      out[col] = numericCols.has(col) ? Number(String(raw).replace(/[, ]/g, "")) : raw;
    }
    return out;
  });
}

export async function importAnalyticsCsv(args: {
  rows: Record<string, string>[];
  mapping: Record<string, string>;
  target: "analytics_entries" | "content_metrics";
  defaults: Record<string, any>;
}) {
  const built = buildRowsFromCsv(args);
  const { error, count } = await supabase.from(args.target as any).insert(built, { count: "exact" } as any);
  if (error) throw error;
  return count ?? built.length;
}
