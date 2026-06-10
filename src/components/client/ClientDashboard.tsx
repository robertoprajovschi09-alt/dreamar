import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, Sparkles, AlertCircle, CheckCircle2, ClipboardList, FileEdit,
  ArrowRight, Calendar as CalendarIcon, FileText, Target, TrendingUp,
  Smile, Meh, Frown, ExternalLink, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getNicheDashboardCopy } from "@/lib/nicheDashboard";
import { PENDING_POST_STATUSES } from "@/lib/approvals";
import {
  fmtMonthYearRO, healthStatusLabel, goalStatusLabel,
  metricLabel, NICHE_RO,
} from "@/lib/i18nLabels";

type InsightCard = {
  title: string;
  body?: string;
  body_plain_language?: string;
  severity?: "info" | "good" | "warning";
  tone?: "good" | "warning" | "info";
};

type NextAction = { label?: string; title?: string; why?: string; deadline?: string; owner?: "agency" | "client" };

type Personalization = {
  greeting?: string;
  niche_focus?: string;
  priority_metrics?: string[];
  insight_cards?: InsightCard[];
  next_actions?: NextAction[];
  generated_at?: string;
};

type Props = {
  agencyId: string;
  clientId: string;
  clientName: string;
  userId: string;
  onStartCheckIn?: () => void;
  onOpenCalendar?: () => void;
  onOpenApprovals?: () => void;
  onOpenReports?: () => void;
};

const monthLabel = (d = new Date()) => fmtMonthYearRO(d);

const NICHE_BADGES: Record<string, string> = NICHE_RO;

const STATUS_COLORS: Record<string, string> = {
  excellent: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  healthy: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  at_risk: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  critical: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

export function ClientDashboard({
  agencyId, clientId, clientName, userId,
  onStartCheckIn, onOpenCalendar, onOpenApprovals, onOpenReports,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [niche, setNiche] = useState<string | null>(null);
  const [personalization, setPersonalization] = useState<Personalization | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [latestCheckin, setLatestCheckin] = useState<any>(null);
  const [mainGoal, setMainGoal] = useState<any>(null);
  const [behindGoals, setBehindGoals] = useState<any[]>([]);
  const [counts, setCounts] = useState({ awaiting: 0, scheduledMonth: 0 });
  const [topContent, setTopContent] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [latestReport, setLatestReport] = useState<any>(null);
  const [strategy, setStrategy] = useState<any>(null);
  const [impactTotals, setImpactTotals] = useState<Record<string, number>>({});
  const [missingData, setMissingData] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const monthStart = new Date(year, month - 1, 1).toISOString();
      const monthStartDate = new Date(year, month - 1, 1).toISOString().slice(0, 10);
      const since30 = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

      const [client, ctx, hs, ci, goals, awaitCount, scheduledMonth, posts, upcomingPosts, rep, strat, impact] = await Promise.all([
        supabase.from("clients").select("niche, ai_strategy_base").eq("id", clientId).maybeSingle(),
        supabase.from("client_dashboard_contexts").select("*").eq("client_id", clientId).eq("year", year).eq("month", month).maybeSingle(),
        supabase.from("client_health_scores").select("total_score, score_status, summary").eq("client_id", clientId).eq("year", year).eq("month", month).maybeSingle(),
        supabase.from("client_checkins").select("satisfaction_score, created_at, year, month").eq("client_id", clientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("monthly_goals").select("id, objective, metric, target, progress, deadline, status").eq("client_id", clientId).eq("month", monthStartDate),
        supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("client_id", clientId).in("status", PENDING_POST_STATUSES as any),
        supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "published").gte("scheduled_for", monthStart),
        supabase.from("content_posts").select("id, title, platform, thumbnail_url, scheduled_for").eq("client_id", clientId).eq("status", "published").gte("scheduled_for", monthStart).order("scheduled_for", { ascending: false }).limit(20),
        supabase.from("content_posts").select("id, title, platform, scheduled_for, status, approval_status").eq("client_id", clientId).gte("scheduled_for", new Date().toISOString()).in("status", ["scheduled", "approved", ...PENDING_POST_STATUSES] as any).order("scheduled_for", { ascending: true }).limit(5),
        supabase.from("reports").select("id, title, summary, period_start, period_end, created_at").eq("client_id", clientId).eq("client_visible", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("monthly_strategies").select("strategy_title, executive_summary, content_to_repeat, business_focus").eq("client_id", clientId).eq("year", year).eq("month", month).maybeSingle(),
        supabase.from("business_impact_entries").select("calls, dms, bookings, sales, appointments, viewings, contracts, orders, revenue_estimate").eq("client_id", clientId).gte("entry_date", since30),
      ]);

      if (cancelled) return;

      setNiche((client.data as any)?.niche ?? null);
      setHealth(hs.data);
      setLatestCheckin(ci.data);
      setCounts({ awaiting: awaitCount.count || 0, scheduledMonth: scheduledMonth.count || 0 });
      setUpcoming((upcomingPosts.data as any[]) || []);
      setLatestReport(rep.data);
      setStrategy(strat.data);

      // Goals
      const goalRows = (goals.data as any[]) || [];
      const sortedGoals = [...goalRows].sort((a, b) => (Number(b.target || 0)) - (Number(a.target || 0)));
      setMainGoal(sortedGoals[0] || null);
      setBehindGoals(
        goalRows.filter((g) => {
          if (g.status === "done" || g.status === "completed") return false;
          const target = Number(g.target || 0);
          const progress = Number(g.progress || 0);
          if (!target) return false;
          // expected by mid-late month
          const dayOfMonth = now.getDate();
          const daysInMonth = new Date(year, month, 0).getDate();
          const expected = (dayOfMonth / daysInMonth) * target;
          return progress < expected * 0.7;
        }).slice(0, 3)
      );

      // Top content: fetch metrics
      const postIds = ((posts.data as any[]) || []).map((p) => p.id);
      let metricsByPost: Record<string, { score: number; views: number; engagement: number }> = {};
      if (postIds.length) {
        const { data: metrics } = await supabase
          .from("content_metrics")
          .select("content_item_id, views, reach, impressions, likes, comments, shares, saves")
          .in("content_item_id", postIds);
        ((metrics as any[]) || []).forEach((m) => {
          const views = Number(m.views || m.reach || m.impressions || 0);
          const eng = Number(m.likes || 0) + Number(m.comments || 0) + Number(m.shares || 0) + Number(m.saves || 0);
          const prev = metricsByPost[m.content_item_id] || { score: 0, views: 0, engagement: 0 };
          metricsByPost[m.content_item_id] = {
            views: prev.views + views,
            engagement: prev.engagement + eng,
            score: prev.score + views + eng * 5,
          };
        });
      }
      const ranked = ((posts.data as any[]) || [])
        .map((p) => ({ ...p, _m: metricsByPost[p.id] || { score: 0, views: 0, engagement: 0 } }))
        .sort((a, b) => b._m.score - a._m.score)
        .slice(0, 3);
      setTopContent(ranked);

      // Impact totals
      const totals: Record<string, number> = {};
      ((impact.data as any[]) || []).forEach((row) => {
        ["calls", "dms", "bookings", "sales", "appointments", "viewings", "contracts", "orders", "revenue_estimate"].forEach((k) => {
          totals[k] = (totals[k] || 0) + (Number(row[k]) || 0);
        });
      });
      setImpactTotals(totals);

      // Personalization
      let p: Personalization | null = null;
      const cd: any = ctx.data;
      if (cd) {
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
              }))
            : [],
          next_actions: Array.isArray(cd.ai_priorities)
            ? cd.ai_priorities.map((pr: any) => ({ label: pr.title || pr.label || "", why: pr.why || "", deadline: pr.deadline, owner: pr.owner }))
            : [],
          generated_at: cd.updated_at || cd.created_at,
        };
        setMissingData(Array.isArray(cd.missing_data) ? cd.missing_data.map((m: any) => (typeof m === "string" ? m : m.field || m.label)).filter(Boolean) : []);
      } else {
        p = ((client.data as any)?.ai_strategy_base || {})?.dashboard_personalization || null;
      }
      setPersonalization(p);

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  const copy = useMemo(() => getNicheDashboardCopy(niche), [niche]);

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>;
  }

  // Derive Main Result KPI
  const mainResultKey = personalization?.priority_metrics?.[0] || copy.primary_kpi_keys?.[0];
  const mainResultValue = mainResultKey ? (impactTotals[mainResultKey] ?? null) : null;
  const mainResultLabel = mainResultKey ? metricLabel(mainResultKey) : "Rezultat principal";

  // Business impact total
  const totalLeads = (impactTotals.calls || 0) + (impactTotals.dms || 0) + (impactTotals.bookings || 0)
    + (impactTotals.appointments || 0) + (impactTotals.viewings || 0);
  const totalSales = (impactTotals.sales || 0) + (impactTotals.contracts || 0) + (impactTotals.orders || 0);
  const totalRevenue = impactTotals.revenue_estimate || 0;

  // Insights split
  const goodInsights = (personalization?.insight_cards || []).filter((i) => i.severity === "good").slice(0, 3);
  const warnInsights = (personalization?.insight_cards || []).filter((i) => i.severity === "warning").slice(0, 3);

  // Next actions split
  const allNext = personalization?.next_actions || [];
  const agencyActions = allNext.filter((a) => a.owner !== "client").slice(0, 4);
  const clientActions: { label: string; reason?: string }[] = [];
  if (counts.awaiting > 0) clientActions.push({ label: `Aprobă ${counts.awaiting} ${counts.awaiting === 1 ? "postare" : "postări"}`, reason: "În așteptare" });
  const isCheckinThisMonth = latestCheckin && latestCheckin.year === new Date().getFullYear() && latestCheckin.month === new Date().getMonth() + 1;
  if (!isCheckinThisMonth) clientActions.push({ label: "Completează check-in-ul lunar", reason: "7 întrebări, ~2 minute" });
  allNext.filter((a) => a.owner === "client").forEach((a) => clientActions.push({ label: a.label || a.title || "", reason: a.why }));

  const SatIcon = (latestCheckin?.satisfaction_score ?? 0) >= 4 ? Smile
    : (latestCheckin?.satisfaction_score ?? 0) >= 3 ? Meh : Frown;
  const satColor = (latestCheckin?.satisfaction_score ?? 0) >= 4 ? "text-emerald-500"
    : (latestCheckin?.satisfaction_score ?? 0) >= 3 ? "text-amber-500" : "text-rose-500";

  return (
    <div className="space-y-5">
      {/* TOP BAR */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start gap-4 justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{clientName}</h2>
                {niche && <Badge variant="outline" className="text-[10px]">{NICHE_BADGES[niche] || niche}</Badge>}
              </div>
              <div className="text-xs text-muted-foreground capitalize">{monthLabel()}</div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {health && (
                <div className="flex items-center gap-2">
                  <div className="text-right leading-tight">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Sănătate</div>
                    <div className="text-lg font-semibold tabular-nums">{Math.round(Number(health.total_score) || 0)}</div>
                  </div>
                  <Badge className={STATUS_COLORS[health.score_status] || ""} variant="outline">
                    {healthStatusLabel(health.score_status)}
                  </Badge>
                </div>
              )}
              {latestCheckin?.satisfaction_score != null && (
                <div className="flex items-center gap-1.5">
                  <SatIcon className={`h-4 w-4 ${satColor}`} />
                  <span className="text-xs text-muted-foreground">{latestCheckin.satisfaction_score}/5</span>
                </div>
              )}
              {isCheckinThisMonth ? (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Check-in completat
                </Badge>
              ) : (
                onStartCheckIn && (
                  <Button size="sm" variant="outline" onClick={onStartCheckIn}>
                    <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> Check-in
                  </Button>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 1: This Month Snapshot */}
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2 font-semibold">Luna aceasta</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SnapshotCard
            icon={<Target className="h-4 w-4 text-accent" />}
            label="Obiectiv principal"
            value={mainGoal?.objective || "—"}
            sub={mainGoal?.metric ? `${mainGoal.progress || 0} / ${mainGoal.target || "?"} ${mainGoal.metric}` : "Niciun obiectiv setat"}
          />
          <SnapshotCard
            icon={<TrendingUp className="h-4 w-4 text-accent" />}
            label={mainResultLabel}
            value={mainResultValue != null ? String(mainResultValue) : "—"}
            sub={mainResultValue == null ? "Lipsă date" : "Ultimele 30 zile"}
          />
          <SnapshotCard
            icon={<Sparkles className="h-4 w-4 text-accent" />}
            label="Impact business"
            value={totalRevenue > 0 ? `${totalRevenue.toLocaleString("ro-RO")} lei` : `${totalLeads + totalSales}`}
            sub={totalRevenue > 0 ? `${totalLeads} lead-uri · ${totalSales} vânzări` : `${totalLeads} lead-uri · ${totalSales} vânzări`}
          />
          <SnapshotCard
            icon={<FileEdit className="h-4 w-4 text-amber-500" />}
            label="Aprobări în așteptare"
            value={String(counts.awaiting)}
            sub={counts.awaiting > 0 ? "Acțiune necesară" : "La zi"}
            action={counts.awaiting > 0 && onOpenApprovals ? { label: "Aprobă", onClick: onOpenApprovals } : undefined}
            highlight={counts.awaiting > 0}
          />
        </div>
      </div>

      {/* SECTION 2: What's Working */}
      {(topContent.length > 0 || goodInsights.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Ce merge bine
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topContent.length > 0 && (
              <div className="space-y-2">
                {topContent.map((p, i) => (
                  <div key={p.id} className="flex items-start gap-3 p-2 rounded-md bg-muted/40">
                    <div className="text-xs font-mono text-muted-foreground w-5 mt-0.5">#{i + 1}</div>
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {p.platform || "—"} · {p._m.views.toLocaleString("ro-RO")} vizualizări · {p._m.engagement} reacții
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {goodInsights.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {goodInsights.map((c, i) => (
                  <div key={i} className="text-sm">
                    <div className="font-medium">{c.title}</div>
                    {c.body && <div className="text-xs text-muted-foreground">{c.body}</div>}
                  </div>
                ))}
              </div>
            )}
            {strategy?.content_to_repeat && Array.isArray(strategy.content_to_repeat) && strategy.content_to_repeat.length > 0 && (
              <div className="border-t pt-2">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">De repetat</div>
                <ul className="text-xs space-y-0.5 list-disc list-inside text-muted-foreground">
                  {strategy.content_to_repeat.slice(0, 3).map((s: any, i: number) => (
                    <li key={i}>{typeof s === "string" ? s : s.title || s.label || JSON.stringify(s)}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SECTION 3: Needs Attention */}
      {(missingData.length > 0 || warnInsights.length > 0 || behindGoals.length > 0 || counts.awaiting > 0) && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" /> Ce necesită atenție
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {warnInsights.map((c, i) => (
              <div key={i} className="text-sm">
                <div className="font-medium">{c.title}</div>
                {c.body && <div className="text-xs text-muted-foreground">{c.body}</div>}
              </div>
            ))}
            {behindGoals.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Obiective în urmă</div>
                {behindGoals.map((g) => (
                  <div key={g.id} className="text-xs flex justify-between gap-2">
                    <span className="truncate">{g.objective}</span>
                    <span className="text-muted-foreground tabular-nums shrink-0">{g.progress || 0} / {g.target}</span>
                  </div>
                ))}
              </div>
            )}
            {missingData.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Date lipsă</div>
                <div className="flex flex-wrap gap-1">
                  {missingData.slice(0, 6).map((m, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{m}</Badge>
                  ))}
                </div>
              </div>
            )}
            {counts.awaiting > 0 && onOpenApprovals && (
              <Button size="sm" variant="outline" onClick={onOpenApprovals}>
                Vezi {counts.awaiting} aprobări <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* SECTION 4: Next Actions */}
      {(agencyActions.length > 0 || clientActions.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {agencyActions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-accent" /> Ce face agenția
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {agencyActions.map((a, i) => (
                  <div key={i} className="text-sm">
                    <div className="font-medium">{a.label || a.title}</div>
                    {a.why && <div className="text-xs text-muted-foreground">{a.why}</div>}
                    {a.deadline && (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" /> {new Date(a.deadline).toLocaleDateString("ro-RO")}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {clientActions.length > 0 && (
            <Card className="border-accent/40 bg-accent/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-accent" /> Ce trebuie să faci tu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {clientActions.map((a, i) => (
                  <div key={i} className="text-sm">
                    <div className="font-medium">{a.label}</div>
                    {a.reason && <div className="text-xs text-muted-foreground">{a.reason}</div>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* SECTION 5: Calendar Preview */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-accent" /> Următoarele postări
          </CardTitle>
          {onOpenCalendar && (
            <Button size="sm" variant="ghost" onClick={onOpenCalendar}>
              Vezi calendar <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Nicio postare programată în perioada următoare.</p>
          ) : (
            <div className="space-y-1.5">
              {upcoming.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(p.scheduled_for).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {p.platform ? ` · ${p.platform}` : ""}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      p.approval_status === "approved" ? "text-emerald-600 border-emerald-500/30 text-[10px]"
                      : (PENDING_POST_STATUSES as string[]).includes(p.status) ? "text-amber-600 border-amber-500/30 text-[10px]"
                      : "text-[10px]"
                    }
                  >
                    {p.approval_status === "approved" ? "aprobat" : (PENDING_POST_STATUSES as string[]).includes(p.status) ? "de aprobat" : "programat"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 6: Report / Strategy */}
      {(latestReport || strategy) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {latestReport && (
            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent" /> Ultimul raport
                </CardTitle>
                {onOpenReports && (
                  <Button size="sm" variant="ghost" onClick={onOpenReports}>
                    Vezi <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">{latestReport.title}</div>
                {latestReport.summary && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{latestReport.summary}</p>
                )}
              </CardContent>
            </Card>
          )}
          {strategy && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" /> Strategia lunii
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">{strategy.strategy_title}</div>
                {strategy.executive_summary && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{strategy.executive_summary}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function SnapshotCard({
  icon, label, value, sub, action, highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  action?: { label: string; onClick: () => void };
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-amber-500/40 bg-amber-500/5" : ""}>
      <CardContent className="p-4 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
          {icon} <span>{label}</span>
        </div>
        <div className="text-lg font-semibold tabular-nums leading-tight line-clamp-2">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
        {action && (
          <Button size="sm" variant="outline" className="mt-1 h-7 text-xs" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
