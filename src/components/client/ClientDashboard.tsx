import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Sparkles, AlertCircle, CheckCircle2, Info, RefreshCw,
  ClipboardList, ThumbsUp, Wrench, ArrowRight, FileEdit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PriorityKpiCard, type KpiType, type PriorityKpi } from "./PriorityKpiCard";
import { BusinessImpactQuickForm } from "./BusinessImpactQuickForm";
import { getNicheDashboardCopy } from "@/lib/nicheDashboard";
import { RealEstateDashboardSection } from "./RealEstateDashboardSection";
import { NicheDashboardSection } from "./NicheDashboardSection";
import { CustomNicheDashboardSection } from "./CustomNicheDashboardSection";
import { getNicheConfig } from "@/lib/nicheDashboardConfigs";

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
  const [latestReport, setLatestReport] = useState<any>(null);
  const [niche, setNiche] = useState<string | null>(null);
  const [checkInDone, setCheckInDone] = useState(false);

  const load = async () => {
    setLoading(true);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const monthDateStr = monthStart.toISOString().slice(0, 10);
    const since30 = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;

    const [client, schema, imp, an, a, b, c, rep, ci, ctx] = await Promise.all([
      supabase.from("clients").select("ai_strategy_base, niche, custom_niche").eq("id", clientId).maybeSingle(),
      supabase.from("client_kpi_schemas").select("*").eq("client_id", clientId).maybeSingle(),
      supabase.from("business_impact_entries").select("*").eq("client_id", clientId).gte("entry_date", since30),
      supabase.from("analytics_entries").select("*").eq("client_id", clientId).order("date_start", { ascending: false }).limit(12),
      supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "scheduled"),
      supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "sent_for_approval"),
      supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "published").gte("scheduled_for", monthStart.toISOString()),
      supabase.from("reports").select("id,title,summary,period_start,period_end,created_at").eq("client_id", clientId).eq("client_visible", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("client_feedback").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("month", monthDateStr),
      supabase.from("client_dashboard_contexts").select("*").eq("client_id", clientId).eq("year", curYear).eq("month", curMonth).maybeSingle(),
    ]);

    setKpiSchema(schema.data);
    setRecentImpact((imp.data as any[]) || []);
    setRecentAnalytics((an.data as any[]) || []);
    setCounts({ scheduled: a.count || 0, awaiting: b.count || 0, published: c.count || 0 });
    setLatestReport(rep.data);
    setCheckInDone((ci.count || 0) > 0);
    setNiche((client.data as any)?.niche ?? null);

    let p: Personalization | null = null;
    if (ctx.data) {
      const cd: any = ctx.data;
      p = {
        niche_focus: cd.generated_summary || undefined,
        priority_metrics: Array.isArray(cd.recommended_widgets)
          ? cd.recommended_widgets.map((w: any) => w?.key).filter(Boolean).slice(0, 3)
          : [],
        insight_cards: Array.isArray(cd.client_friendly_insights)
          ? cd.client_friendly_insights.map((i: any) => ({
              title: i.title || "",
              body: i.body_plain_language || i.body || "",
              severity: (i.tone === "good" ? "good" : i.tone === "warning" ? "warning" : "info") as any,
              missing_data: Array.isArray(cd.missing_data) ? cd.missing_data.map((m: any) => m.field).filter(Boolean) : undefined,
            }))
          : [],
        next_actions: Array.isArray(cd.ai_priorities)
          ? cd.ai_priorities.map((pr: any) => ({ label: pr.title || "", why: pr.why || "" }))
          : [],
        generated_at: cd.updated_at || cd.created_at,
      };
    } else {
      p = ((client.data as any)?.ai_strategy_base || {})?.dashboard_personalization as Personalization | undefined ?? null;
    }
    setPersonalization(p);

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

  const copy = getNicheDashboardCopy(niche);
  const kpiFields: any[] = (kpiSchema?.kpi_fields as any[]) || [];
  const biFields: any[] = (kpiSchema?.business_impact_fields as any[]) || [];

  // Aggregate impact totals (last 30d)
  const impactTotals: Record<string, number> = {};
  recentImpact.forEach((row) => {
    ["calls", "dms", "bookings", "sales", "appointments", "viewings", "contracts", "orders"].forEach((k) => {
      impactTotals[k] = (impactTotals[k] || 0) + (Number(row[k]) || 0);
    });
    impactTotals["revenue_estimate"] = (impactTotals["revenue_estimate"] || 0) + (Number(row.revenue_estimate) || 0);
  });
  const latestAn = recentAnalytics[0] || {};

  const resolveKpiValue = (key: string): { value: any; type: KpiType } => {
    if (impactTotals[key] != null && impactTotals[key] !== 0) {
      return { value: impactTotals[key], type: key === "revenue_estimate" ? "currency" : "number" };
    }
    const anKeys = ["reach", "impressions", "engagement_rate", "followers_end", "leads", "sales", "revenue"];
    if (anKeys.includes(key) && latestAn[key] != null) {
      const t: KpiType = key === "engagement_rate" ? "percentage" : key === "revenue" ? "currency" : "number";
      return { value: latestAn[key], type: t };
    }
    return { value: null, type: "number" };
  };

  // Priority KPIs: AI > niche-recommended fallback > schema first 3
  const priorityKeys = (personalization?.priority_metrics?.length
    ? personalization.priority_metrics
    : (copy.primary_kpi_keys.length
        ? copy.primary_kpi_keys
        : kpiFields.slice(0, 3).map((f: any) => f.key))
  ).slice(0, 3);

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

  // Split AI insights into "what works" / "needs improvement"
  const insights = personalization?.insight_cards || [];
  const goodInsights = insights.filter((i) => i.severity === "good").slice(0, 3);
  const warnInsights = insights.filter((i) => i.severity === "warning").slice(0, 3);
  const infoInsights = insights.filter((i) => i.severity === "info").slice(0, 2);

  const insightIcon = (sev: string) =>
    sev === "good" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    : sev === "warning" ? <AlertCircle className="h-4 w-4 text-amber-500" />
    : <Info className="h-4 w-4 text-accent" />;

  return (
    <div className="space-y-5">
      {/* 1. Hero — what happened this month */}
      <Card>
        <CardContent className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-accent font-semibold">
                <Sparkles className="h-3 w-3" /> {copy.hero_eyebrow}
              </div>
              <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
                {personalization?.greeting || `Salut, ${clientName}`}
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl">
                {personalization?.niche_focus || copy.hero_fallback_summary}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => regenerate(false)} disabled={refreshing}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Things to do — check-in + approvals */}
      {(!checkInDone || counts.awaiting > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {!checkInDone && onStartCheckIn && (
            <Card className="border-accent/40 bg-accent/5">
              <CardContent className="p-4 flex items-center gap-3">
                <ClipboardList className="h-5 w-5 text-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">Check-in lunar</div>
                  <div className="text-xs text-muted-foreground">7 întrebări scurte. Sub 2 minute.</div>
                </div>
                <Button size="sm" onClick={onStartCheckIn} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  Start
                </Button>
              </CardContent>
            </Card>
          )}
          {counts.awaiting > 0 && niche !== "real_estate" && (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <FileEdit className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{copy.approvals_label}</div>
                  <div className="text-xs text-muted-foreground">{counts.awaiting} {counts.awaiting === 1 ? "postare așteaptă" : "postări așteaptă"} aprobarea ta.</div>
                </div>
                <Badge variant="outline" className="font-mono">{counts.awaiting}</Badge>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 3. Niche-specialized section (Real Estate) replaces generic KPIs */}
      {niche === "real_estate" ? (
        <RealEstateDashboardSection
          agencyId={agencyId}
          clientId={clientId}
          awaitingApproval={counts.awaiting}
          insights={personalization?.insight_cards}
          nextActions={personalization?.next_actions}
          missingData={(personalization?.insight_cards || []).flatMap((i) => i.missing_data || [])}
        />
      ) : (
        priorityKpis.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2 font-semibold">{copy.kpi_section_title}</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {priorityKpis.map((k) => <PriorityKpiCard key={k.key} kpi={k} />)}
            </div>
          </div>
        )
      )}

      {/* 4. What works / Needs improvement */}
      {(goodInsights.length > 0 || warnInsights.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {goodInsights.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><ThumbsUp className="h-4 w-4 text-emerald-500" /> {copy.what_works_title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {goodInsights.map((c, i) => (
                  <div key={i} className="text-sm">
                    <div className="font-medium">{c.title}</div>
                    {c.body && <div className="text-xs text-muted-foreground mt-0.5">{c.body}</div>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {warnInsights.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Wrench className="h-4 w-4 text-amber-500" /> {copy.needs_improvement_title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {warnInsights.map((c, i) => (
                  <div key={i} className="text-sm">
                    <div className="font-medium">{c.title}</div>
                    {c.body && <div className="text-xs text-muted-foreground mt-0.5">{c.body}</div>}
                    {c.missing_data && c.missing_data.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.missing_data.map((m) => <Badge key={m} variant="outline" className="text-[10px]">Lipsește: {m}</Badge>)}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 5. Optional info insights */}
      {infoInsights.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{copy.insights_title}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {infoInsights.map((c, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <div className="mt-0.5">{insightIcon(c.severity)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{c.title}</div>
                  {c.body && <div className="text-xs text-muted-foreground mt-0.5">{c.body}</div>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 6. Business impact quick form — niche-specific */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{copy.impact_section_title}</CardTitle>
          <p className="text-xs text-muted-foreground">{copy.impact_section_help}</p>
        </CardHeader>
        <CardContent>
          <BusinessImpactQuickForm agencyId={agencyId} clientId={clientId} userId={userId} fields={biFields} />
        </CardContent>
      </Card>

      {/* 7. What the agency does next */}
      {personalization?.next_actions && personalization.next_actions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><ArrowRight className="h-4 w-4 text-accent" /> {copy.next_actions_title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {personalization.next_actions.slice(0, 4).map((a, i) => (
              <div key={i} className="text-sm">
                <div className="font-medium">{a.label}</div>
                {a.why && <div className="text-xs text-muted-foreground">{a.why}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Latest report — light, hidden for niches that don't need it */}
      {copy.show_latest_report && latestReport && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Ultimul raport</CardTitle></CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{latestReport.title}</div>
            {latestReport.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{latestReport.summary}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
