import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Plus, Loader2, FileCheck, AlertTriangle, TrendingUp, FileText,
  CalendarClock, Sparkles, Heart, BarChart3, ClipboardList, CheckCircle2, Circle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { fetchAgencyLatest, type HealthScore } from "@/lib/healthScore";
import { HealthScoreMini } from "@/components/health/HealthScoreMini";
import { fetchAgencyAlerts, detectForAgency, type RiskAlert } from "@/lib/risk";
import { RiskAlertCard } from "@/components/risk/RiskAlertCard";
import { isCollectingData } from "@/lib/clientStatus";

export default function AgencyDashboard() {
  const { agency } = useUser();
  const [loading, setLoading] = useState(true);
  const [clientCount, setClientCount] = useState(0);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [healthScores, setHealthScores] = useState<HealthScore[]>([]);
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [missingAnalytics, setMissingAnalytics] = useState<any[]>([]);
  const [reportsToGenerate, setReportsToGenerate] = useState<any[]>([]);
  const [topContent, setTopContent] = useState<any[]>([]);
  const [upcomingContent, setUpcomingContent] = useState<any[]>([]);
  const [aiRecs, setAiRecs] = useState<{ client_id: string; text: string }[]>([]);
  const [collecting, setCollecting] = useState<Set<string>>(new Set());
  const [hasPlatforms, setHasPlatforms] = useState(false);
  const [hasAnalytics, setHasAnalytics] = useState(false);
  const [hasReports, setHasReports] = useState(false);


  useEffect(() => {
    if (!agency) return;
    (async () => {
      setLoading(true);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const [
        { count: clientsCount },
        { data: clientsList },
        { data: pendingList },
        { data: analyticsThisMonth },
        { data: analyticsAny },
        { data: businessImpactAny },
        { data: prevReports },
        { data: contentMetrics },
        { data: upcomingPosts },
        { data: latestStrategies },
        { data: platformsAny },
        { data: reportsAny },
      ] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("agency_id", agency.id),
        supabase.from("clients").select("id,name,created_at").eq("agency_id", agency.id),
        supabase.from("content_approvals").select("id,status,due_date,created_at,content_post_id,client_id,content_posts:content_post_id(title),clients:client_id(name)").eq("agency_id", agency.id).eq("status", "pending_approval").order("created_at", { ascending: true }).limit(6),
        supabase.from("analytics_entries").select("client_id").eq("agency_id", agency.id).gte("created_at", monthStart.toISOString()),
        supabase.from("analytics_entries").select("client_id").eq("agency_id", agency.id),
        (supabase as any).from("business_impact_entries").select("client_id").eq("agency_id", agency.id),
        supabase.from("reports").select("client_id").eq("agency_id", agency.id).gte("period_start", prevMonth.toISOString().slice(0, 10)).lte("period_end", prevMonthEnd.toISOString().slice(0, 10)),
        supabase.from("content_metrics").select("content_item_id,client_id,views,platform,content_posts:content_item_id(title)").eq("agency_id", agency.id).gte("created_at", monthStart.toISOString()).order("views", { ascending: false }).limit(5),
        supabase.from("content_posts").select("id,title,client_id,scheduled_for,platform,clients:client_id(name)").eq("agency_id", agency.id).gte("scheduled_for", now.toISOString()).order("scheduled_for", { ascending: true }).limit(5),
        supabase.from("monthly_strategies").select("client_id,key_insights,action_items,status,created_at").eq("agency_id", agency.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("client_platforms").select("id").eq("agency_id", agency.id).limit(1),
        supabase.from("reports").select("id").eq("agency_id", agency.id).limit(1),
      ]);

      setHasPlatforms((platformsAny || []).length > 0);
      setHasAnalytics((analyticsAny || []).length > 0);
      setHasReports((reportsAny || []).length > 0);



      // Compute "Collecting data" client set (lifetime presence of analytics/business-impact)
      const hasAnyAnalytics = new Set((analyticsAny || []).map((a: any) => a.client_id));
      const hasAnyBI = new Set((businessImpactAny || []).map((a: any) => a.client_id));
      const collectingSet = new Set<string>();
      (clientsList || []).forEach((c: any) => {
        if (isCollectingData(c, hasAnyAnalytics.has(c.id), hasAnyBI.has(c.id))) collectingSet.add(c.id);
      });
      setCollecting(collectingSet);

      const names: Record<string, string> = {};
      (clientsList || []).forEach((c: any) => { names[c.id] = c.name; });
      setClientNames(names);
      setClientCount(clientsCount || 0);
      setPendingApprovals(pendingList || []);

      const haveAnalytics = new Set((analyticsThisMonth || []).map((a: any) => a.client_id));
      setMissingAnalytics((clientsList || []).filter((c: any) => !haveAnalytics.has(c.id)).slice(0, 6));

      const haveReports = new Set((prevReports || []).map((r: any) => r.client_id));
      setReportsToGenerate((clientsList || []).filter((c: any) => !haveReports.has(c.id)).slice(0, 6));

      setTopContent(contentMetrics || []);
      setUpcomingContent(upcomingPosts || []);

      // AI recs from latest strategy per client
      const seen = new Set<string>();
      const recs: { client_id: string; text: string }[] = [];
      for (const s of latestStrategies || []) {
        if (seen.has(s.client_id)) continue;
        seen.add(s.client_id);
        const items = (Array.isArray(s.action_items) ? s.action_items : []) as any[];
        const first = items[0];
        const text = first?.title || (Array.isArray(s.key_insights) && s.key_insights[0]) || null;
        if (text) recs.push({ client_id: s.client_id, text: typeof text === "string" ? text : (text.title || JSON.stringify(text)) });
      }
      setAiRecs(recs.slice(0, 5));

      // Health scores
      const hs = await fetchAgencyLatest(agency.id);
      hs.sort((a, b) => Number(a.total_score) - Number(b.total_score));
      setHealthScores(hs);

      // Auto-detect risk if last run > 24h
      const lastKey = `risk_last_run_${agency.id}`;
      const lastRun = Number(localStorage.getItem(lastKey) || 0);
      if (Date.now() - lastRun > 86400000) {
        try { await detectForAgency(agency.id); localStorage.setItem(lastKey, String(Date.now())); } catch {}
      }
      const ra = await fetchAgencyAlerts(agency.id, "active");
      setRiskAlerts(ra.filter((a) => !collectingSet.has(a.client_id)).slice(0, 4));

      setLoading(false);
    })();
  }, [agency, tick]);

  // Realtime: refresh dashboard on any live signal from clients
  useEffect(() => {
    if (!agency) return;
    const filter = `agency_id=eq.${agency.id}`;
    const ch = supabase.channel(`agency-dash-${agency.id}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "client_feedback", filter } as any, () => setTick((t) => t + 1))
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "monthly_goals", filter } as any, () => setTick((t) => t + 1))
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "content_approvals", filter } as any, () => setTick((t) => t + 1))
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "client_briefs", filter } as any, () => setTick((t) => t + 1))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [agency?.id]);

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const scoredHealth = healthScores.filter((h) => !collecting.has(h.client_id));
  const avgHealth = scoredHealth.length ? Math.round(scoredHealth.reduce((s, h) => s + Number(h.total_score), 0) / scoredHealth.length) : 0;
  const healthy = scoredHealth.filter((h) => h.score_status === "healthy").length;
  const atRisk = scoredHealth.filter((h) => h.score_status === "at_risk").length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Panou</h1>
          <p className="text-sm text-muted-foreground mt-1">Bun venit la {agency?.name}.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/agency/reports"><Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1.5" /> Generează raport</Button></Link>
          <Link to="/agency/clients"><Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground"><Plus className="h-4 w-4 mr-1.5" /> Adaugă client</Button></Link>
        </div>
      </div>

      {/* Getting started checklist */}
      <GettingStarted
        items={[
          { label: "Adaugă primul client", done: clientCount > 0, to: "/agency/clients" },
          { label: "Adaugă platforme și conturi", done: hasPlatforms, to: clientCount > 0 ? "/agency/clients" : undefined },
          { label: "Importă primele date analitice", done: hasAnalytics, to: "/agency/analytics" },
          { label: "Generează primul raport", done: hasReports, to: "/agency/reports" },
        ]}
      />

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Users className="h-4 w-4" />} label="Clienți activi" value={clientCount} to="/agency/clients" />
        <Kpi icon={<Heart className="h-4 w-4" />} label="Scor mediu de sănătate" value={avgHealth} accent={avgHealth >= 70} />
        <Kpi icon={<FileCheck className="h-4 w-4" />} label="Aprobări în așteptare" value={pendingApprovals.length} to="/agency/approvals" accent={pendingApprovals.length > 0} />
        <Kpi icon={<AlertTriangle className="h-4 w-4" />} label="Clienți cu risc" value={atRisk} to="/agency/clients" accent={atRisk > 0} />
      </div>

      {/* Health overview */}
      {healthScores.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2"><Heart className="h-4 w-4 text-accent" /> Sănătate clienți</CardTitle>
            <span className="text-xs text-muted-foreground">{healthy} sănătoși · {atRisk} cu risc · {scoredHealth.length - healthy - atRisk} de urmărit</span>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {healthScores.slice(0, 6).map((s) => (
                <HealthScoreMini key={s.id} score={s} clientName={clientNames[s.client_id] || "Client"} collecting={collecting.has(s.client_id)} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk */}
      {riskAlerts.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Clienți cu risc</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {riskAlerts.map((a) => (
                <RiskAlertCard key={a.id} alert={a} clientName={clientNames[a.client_id] || "Client"} healthScore={healthScores.find((h) => h.client_id === a.client_id)?.total_score} onChange={() => {}} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two-column lists */}
      <div className="grid gap-4 md:grid-cols-2">
        <ListCard
          title="Aprobări în așteptare"
          icon={<FileCheck className="h-4 w-4 text-accent" />}
          empty="Niciun conținut în așteptare de aprobare."
          items={pendingApprovals}
          render={(p: any) => {
            const overdue = p.due_date && new Date(p.due_date) < new Date();
            return (
              <li key={p.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{p.content_posts?.title || "—"}</div>
                  <div className="text-[11px] text-muted-foreground">{p.clients?.name || "—"}</div>
                </div>
                {overdue ? <Badge variant="destructive" className="text-[10px]">Întârziat</Badge> : <Link to="/agency/approvals"><Button size="sm" variant="ghost">Vezi</Button></Link>}
              </li>
            );
          }}
        />

        <ListCard
          title="Date analitice lipsă"
          icon={<BarChart3 className="h-4 w-4 text-accent" />}
          empty="Toți clienții au analitice luna aceasta."
          items={missingAnalytics}
          render={(c: any) => (
            <li key={c.id} className="py-2.5 flex items-center justify-between">
              <Link to={`/agency/clients/${c.id}`} className="font-medium text-sm hover:underline">{c.name}</Link>
              <Link to={`/agency/clients/${c.id}`}><Button size="sm" variant="ghost">Adaugă date</Button></Link>
            </li>
          )}
        />

        <ListCard
          title="Rapoarte de generat"
          icon={<ClipboardList className="h-4 w-4 text-accent" />}
          empty="Toate rapoartele lunii trecute sunt gata."
          items={reportsToGenerate}
          render={(c: any) => (
            <li key={c.id} className="py-2.5 flex items-center justify-between">
              <Link to={`/agency/clients/${c.id}`} className="font-medium text-sm hover:underline">{c.name}</Link>
              <Link to="/agency/reports"><Button size="sm" variant="ghost">Generează</Button></Link>
            </li>
          )}
        />

        <ListCard
          title="Conținut cu cele mai bune performanțe"
          icon={<TrendingUp className="h-4 w-4 text-accent" />}
          empty="Nicio metrică de conținut luna aceasta."
          items={topContent}
          render={(m: any, i: number) => (
            <li key={m.content_item_id} className="py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono text-muted-foreground w-5">#{i + 1}</span>
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{m.content_posts?.title || "—"}</div>
                  <div className="text-[11px] text-muted-foreground">{clientNames[m.client_id] || "—"} · {m.platform || "—"}</div>
                </div>
              </div>
              <span className="text-sm font-mono">{Number(m.views || 0).toLocaleString()}</span>
            </li>
          )}
        />

        <ListCard
          title="Conținut programat"
          icon={<CalendarClock className="h-4 w-4 text-accent" />}
          empty="Nimic programat."
          items={upcomingContent}
          render={(p: any) => (
            <li key={p.id} className="py-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{p.title}</div>
                <div className="text-[11px] text-muted-foreground">{p.clients?.name || "—"} · {p.platform || "—"}</div>
              </div>
              <span className="text-[11px] text-muted-foreground">{new Date(p.scheduled_for).toLocaleDateString()}</span>
            </li>
          )}
        />

        <ListCard
          title="Recomandări AI"
          icon={<Sparkles className="h-4 w-4 text-accent" />}
          empty="Generează o strategie pentru a vedea recomandări AI."
          items={aiRecs}
          render={(r: any, i: number) => (
            <li key={i} className="py-2.5">
              <Link to={`/agency/clients/${r.client_id}`} className="text-[11px] text-muted-foreground hover:underline">{clientNames[r.client_id] || "Client"}</Link>
              <div className="text-sm mt-0.5">{r.text}</div>
            </li>
          )}
        />
      </div>
    </div>
  );
}

function GettingStarted({ items }: { items: { label: string; done: boolean; to?: string }[] }) {
  const done = items.filter((i) => i.done).length;
  if (done === items.length) return null;
  const pct = Math.round((done / items.length) * 100);
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> Pași de început</CardTitle>
          <span className="text-xs text-muted-foreground font-mono">{done}/{items.length}</span>
        </div>
        <Progress value={pct} className="h-2 mt-3" />
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((it, i) => {
            const inner = (
              <div className="flex items-center gap-2.5 text-sm">
                {it.done
                  ? <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                  : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                <span className={it.done ? "text-muted-foreground line-through" : ""}>{it.label}</span>
              </div>
            );
            return (
              <li key={i}>
                {!it.done && it.to ? <Link to={it.to} className="hover:underline">{inner}</Link> : inner}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function Kpi({ icon, label, value, to, accent }: { icon: React.ReactNode; label: string; value: number; to?: string; accent?: boolean }) {
  const card = (
    <Card className="hover:border-accent transition">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">{icon} {label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold font-mono ${accent ? "text-accent" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}

function ListCard({ title, icon, items, empty, render }: { title: string; icon: React.ReactNode; items: any[]; empty: string; render: (item: any, i: number) => React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2">{icon} {title}</CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 ? <div className="py-6 text-center text-sm text-muted-foreground">{empty}</div>
          : <ul className="divide-y divide-border">{items.map((it, i) => render(it, i))}</ul>}
      </CardContent>
    </Card>
  );
}
