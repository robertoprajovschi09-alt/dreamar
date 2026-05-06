import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, AlertCircle, CheckCircle2, Info, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PriorityKpiCard, type KpiType, type PriorityKpi } from "./PriorityKpiCard";
import { BusinessImpactQuickForm } from "./BusinessImpactQuickForm";

type Personalization = {
  greeting?: string;
  niche_focus?: string;
  priority_metrics?: string[];
  insight_cards?: { title: string; body: string; severity: "info" | "good" | "warning"; missing_data?: string[] }[];
  next_actions?: { label: string; why: string }[];
  generated_at?: string;
};

type Props = {
  agencyId: string;
  clientId: string;
  clientName: string;
  userId: string;
  onStartCheckIn?: () => void;
};

export function ClientDashboard({ agencyId, clientId, clientName, userId, onStartCheckIn }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [personalization, setPersonalization] = useState<Personalization | null>(null);
  const [kpiSchema, setKpiSchema] = useState<any>(null);
  const [recentImpact, setRecentImpact] = useState<any[]>([]);
  const [recentAnalytics, setRecentAnalytics] = useState<any[]>([]);
  const [counts, setCounts] = useState({ scheduled: 0, awaiting: 0, published: 0 });
  const [goals, setGoals] = useState<any[]>([]);
  const [latestReport, setLatestReport] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const since30 = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

    const [client, schema, imp, an, a, b, c, g, rep] = await Promise.all([
      supabase.from("clients").select("ai_strategy_base").eq("id", clientId).maybeSingle(),
      supabase.from("client_kpi_schemas").select("*").eq("client_id", clientId).maybeSingle(),
      supabase.from("business_impact_entries").select("*").eq("client_id", clientId).gte("entry_date", since30),
      supabase.from("analytics_entries").select("*").eq("client_id", clientId).order("date_start", { ascending: false }).limit(12),
      supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "scheduled"),
      supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "sent_for_approval"),
      supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "published").gte("scheduled_for", monthStart.toISOString()),
      supabase.from("monthly_goals").select("*").eq("client_id", clientId).order("month", { ascending: false }).limit(5),
      supabase.from("reports").select("id,title,summary,period_start,period_end,created_at").eq("client_id", clientId).eq("client_visible", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    setKpiSchema(schema.data);
    setRecentImpact((imp.data as any[]) || []);
    setRecentAnalytics((an.data as any[]) || []);
    setCounts({ scheduled: a.count || 0, awaiting: b.count || 0, published: c.count || 0 });
    setGoals(g.data || []);
    setLatestReport(rep.data);

    const p = ((client.data as any)?.ai_strategy_base || {})?.dashboard_personalization as Personalization | undefined;
    setPersonalization(p || null);

    // If never generated or older than 24h, regenerate quietly
    const gen = p?.generated_at ? new Date(p.generated_at).getTime() : 0;
    if (!gen || Date.now() - gen > 86400_000) {
      regenerate(true);
    }
    setLoading(false);
  };

  const regenerate = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const { data } = await supabase.functions.invoke("client-dashboard-personalize", { body: { client_id: clientId } });
      if ((data as any)?.personalization) setPersonalization((data as any).personalization);
    } catch { /* ignore */ }
    if (!silent) setRefreshing(false);
  };

  useEffect(() => { load(); }, [clientId]);

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>;
  }

  // Build KPI cards from schema + recent data aggregations
  const kpiFields: any[] = (kpiSchema?.kpi_fields as any[]) || [];
  const biFields: any[] = (kpiSchema?.business_impact_fields as any[]) || [];

  // Aggregate impact totals over last 30 days for known columns
  const impactTotals: Record<string, number> = {};
  recentImpact.forEach((row) => {
    ["calls", "dms", "bookings", "sales", "appointments", "viewings", "contracts", "orders"].forEach((k) => {
      impactTotals[k] = (impactTotals[k] || 0) + (Number(row[k]) || 0);
    });
    impactTotals["revenue_estimate"] = (impactTotals["revenue_estimate"] || 0) + (Number(row.revenue_estimate) || 0);
  });

  // Latest analytics row totals (most recent)
  const latestAn = recentAnalytics[0] || {};

  const resolveKpiValue = (key: string): { value: any; type: KpiType } => {
    // Try business impact aggregates first
    if (impactTotals[key] != null && impactTotals[key] !== 0) {
      return { value: impactTotals[key], type: key === "revenue_estimate" ? "currency" : "number" };
    }
    // Try recent analytics columns
    const anKeys = ["reach", "impressions", "engagement_rate", "followers_end", "leads", "sales", "revenue"];
    if (anKeys.includes(key) && latestAn[key] != null) {
      const t: KpiType = key === "engagement_rate" ? "percentage" : key === "revenue" ? "currency" : "number";
      return { value: latestAn[key], type: t };
    }
    return { value: null, type: "number" };
  };

  const priorityKeys = personalization?.priority_metrics?.length
    ? personalization.priority_metrics
    : kpiFields.slice(0, 3).map((f: any) => f.key);

  const priorityKpis: PriorityKpi[] = priorityKeys.map((key) => {
    const def = kpiFields.find((f: any) => f.key === key) || biFields.find((f: any) => f.key === key);
    const { value, type } = resolveKpiValue(key);
    const declaredType = (def?.kpi_type || def?.type || type) as KpiType;
    return {
      key,
      label: def?.label || key.replace(/_/g, " "),
      type: declaredType,
      value,
    };
  });

  const insightIcon = (sev: string) =>
    sev === "good" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    : sev === "warning" ? <AlertCircle className="h-4 w-4 text-amber-500" />
    : <Info className="h-4 w-4 text-accent" />;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card>
        <CardContent className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-accent font-semibold">
                <Sparkles className="h-3 w-3" /> Personalized for {clientName}
              </div>
              <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
                {personalization?.greeting || `Welcome back, ${clientName}`}
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl">
                {personalization?.niche_focus || "Your dashboard will personalize as your agency logs more data."}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => regenerate(false)} disabled={refreshing}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh AI
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Priority KPIs */}
      {priorityKpis.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {priorityKpis.map((k) => <PriorityKpiCard key={k.key} kpi={k} />)}
        </div>
      )}

      {/* AI insights */}
      {personalization?.insight_cards && personalization.insight_cards.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">AI insights</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {personalization.insight_cards.map((c, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-md border border-border">
                <div className="mt-0.5">{insightIcon(c.severity)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{c.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{c.body}</div>
                  {c.missing_data && c.missing_data.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.missing_data.map((m) => <Badge key={m} variant="outline" className="text-[10px]">Missing: {m}</Badge>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Goals */}
      <Card>
        <CardHeader><CardTitle className="text-base">Goals this period</CardTitle></CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <div className="text-sm text-muted-foreground">No goals set yet.</div>
          ) : (
            <div className="space-y-2">
              {goals.map((g) => (
                <div key={g.id} className="flex items-center justify-between text-sm">
                  <div className="font-medium">{g.objective}</div>
                  <div className="text-xs text-muted-foreground font-mono">{g.target ?? "—"} {g.metric || ""}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business impact form */}
      <BusinessImpactQuickForm agencyId={agencyId} clientId={clientId} userId={userId} fields={biFields} />

      {/* Content snapshot */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Scheduled", value: counts.scheduled },
          { label: "Awaiting your approval", value: counts.awaiting },
          { label: "Published this month", value: counts.published },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
            <div className="text-2xl font-semibold font-mono mt-1">{s.value}</div>
          </CardContent></Card>
        ))}
      </div>

      {/* Latest report */}
      {latestReport && (
        <Card>
          <CardHeader><CardTitle className="text-base">Latest report</CardTitle></CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{latestReport.title}</div>
            {latestReport.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{latestReport.summary}</p>}
          </CardContent>
        </Card>
      )}

      {/* Next actions */}
      {personalization?.next_actions && personalization.next_actions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Suggested next actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {personalization.next_actions.map((a, i) => (
              <div key={i} className="text-sm">
                <div className="font-medium">{a.label}</div>
                <div className="text-xs text-muted-foreground">{a.why}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
