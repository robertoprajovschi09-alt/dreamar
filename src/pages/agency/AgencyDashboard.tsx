import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Plus, Loader2, MessageSquare, FileCheck, AlertTriangle,
  TrendingUp, TrendingDown, FileText, ListTodo, Sparkles, Heart,
} from "lucide-react";
import { fetchAgencyLatest, type HealthScore } from "@/lib/healthScore";
import { HealthScoreMini } from "@/components/health/HealthScoreMini";

type Stats = {
  clients: number;
  publishedThisMonth: number;
  pendingApprovals: number;
  urgentTasks: number;
};

export default function AgencyDashboard() {
  const { agency } = useUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ clients: 0, publishedThisMonth: 0, pendingApprovals: 0, urgentTasks: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<any[]>([]);
  const [missingBriefs, setMissingBriefs] = useState<any[]>([]);
  const [healthScores, setHealthScores] = useState<HealthScore[]>([]);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!agency) return;
    (async () => {
      setLoading(true);
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
      const in7 = new Date(); in7.setDate(in7.getDate() + 7);

      const [
        { count: clientsCount },
        { count: publishedCount },
        { count: pendingCount, data: pendingList },
        { count: tasksCount, data: tasksList },
        { data: clientsList },
        { data: videosList },
        { data: briefsList },
      ] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("agency_id", agency.id),
        supabase.from("content_posts").select("id", { count: "exact", head: true })
          .eq("agency_id", agency.id).eq("status", "published")
          .gte("scheduled_for", monthStart.toISOString()),
        supabase.from("content_posts").select("id,title,client_id,scheduled_for,clients:client_id(name)", { count: "exact" })
          .eq("agency_id", agency.id).eq("status", "sent_for_approval")
          .order("scheduled_for", { ascending: true, nullsFirst: false }).limit(5),
        supabase.from("tasks").select("id,title,deadline,status,client_id", { count: "exact" })
          .eq("agency_id", agency.id).neq("status", "done")
          .not("deadline", "is", null).lte("deadline", in7.toISOString())
          .order("deadline").limit(5),
        supabase.from("clients").select("id,name,niche,city,status,created_at").eq("agency_id", agency.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("videos").select("client_id,views,clients:client_id(name)").eq("agency_id", agency.id).gte("publish_date", monthStart.toISOString().slice(0,10)),
        (supabase as any).from("client_briefs").select("client_id,completed").eq("agency_id", agency.id),
      ]);

      // Aggregate views per client
      const byClient = new Map<string, { id: string; name: string; views: number }>();
      (videosList || []).forEach((v: any) => {
        const cur = byClient.get(v.client_id) || { id: v.client_id, name: v.clients?.name || "—", views: 0 };
        cur.views += Number(v.views || 0);
        byClient.set(v.client_id, cur);
      });
      const top = [...byClient.values()].sort((a, b) => b.views - a.views).slice(0, 3);

      // Missing briefs = clients without a completed brief
      const completedSet = new Set((briefsList || []).filter((b: any) => b.completed).map((b: any) => b.client_id));
      const missing = (clientsList || []).filter((c: any) => !completedSet.has(c.id)).slice(0, 5);

      setStats({
        clients: clientsCount ?? 0,
        publishedThisMonth: publishedCount ?? 0,
        pendingApprovals: pendingCount ?? 0,
        urgentTasks: tasksCount ?? 0,
      });
      setRecent(clientsList || []);
      setTopPerformers(top);
      setPendingApprovals(pendingList || []);
      setUrgentTasks(tasksList || []);
      setMissingBriefs(missing);

      // Health scores (latest per client, sorted ascending so risk first)
      const hs = await fetchAgencyLatest(agency.id);
      hs.sort((a, b) => Number(a.total_score) - Number(b.total_score));
      setHealthScores(hs.slice(0, 6));
      const names: Record<string, string> = {};
      (clientsList || []).forEach((c: any) => { names[c.id] = c.name; });
      setClientNames(names);

      setLoading(false);
    })();
  }, [agency]);

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome to {agency?.name}.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/agency/reports"><Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1.5" /> Generate report</Button></Link>
          <Link to="/agency/clients"><Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground"><Plus className="h-4 w-4 mr-1.5" /> Add client</Button></Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Users className="h-4 w-4" />} label="Active clients" value={stats.clients} to="/agency/clients" />
        <Kpi icon={<MessageSquare className="h-4 w-4" />} label="Published this month" value={stats.publishedThisMonth} to="/agency/content" />
        <Kpi icon={<FileCheck className="h-4 w-4" />} label="Pending approvals" value={stats.pendingApprovals} to="/agency/content" accent={stats.pendingApprovals > 0} />
        <Kpi icon={<AlertTriangle className="h-4 w-4" />} label="Urgent tasks (<7d)" value={stats.urgentTasks} to="/agency/tasks" accent={stats.urgentTasks > 0} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-accent" /> Top performers (this month)</CardTitle></CardHeader>
          <CardContent>
            {topPerformers.length === 0 ? <Empty text="No video data this month yet." />
              : <ul className="divide-y divide-border">
                {topPerformers.map((p, i) => (
                  <li key={p.id} className="py-2.5 flex items-center justify-between">
                    <Link to={`/agency/clients/${p.id}`} className="flex items-center gap-2 hover:underline">
                      <span className="text-xs font-mono text-muted-foreground w-5">#{i+1}</span>
                      <span className="font-medium text-sm">{p.name}</span>
                    </Link>
                    <span className="text-sm font-mono">{p.views.toLocaleString()} views</span>
                  </li>
                ))}
              </ul>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileCheck className="h-4 w-4 text-accent" /> Awaiting client approval</CardTitle></CardHeader>
          <CardContent>
            {pendingApprovals.length === 0 ? <Empty text="No content waiting for approval." />
              : <ul className="divide-y divide-border">
                {pendingApprovals.map((p: any) => (
                  <li key={p.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{p.title}</div>
                      <div className="text-[11px] text-muted-foreground">{p.clients?.name || "—"} · {p.scheduled_for ? new Date(p.scheduled_for).toLocaleDateString() : "no date"}</div>
                    </div>
                    <Link to={`/agency/content`}><Button size="sm" variant="ghost">Review</Button></Link>
                  </li>
                ))}
              </ul>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ListTodo className="h-4 w-4 text-accent" /> Urgent tasks</CardTitle></CardHeader>
          <CardContent>
            {urgentTasks.length === 0 ? <Empty text="Nothing urgent. Nice." />
              : <ul className="divide-y divide-border">
                {urgentTasks.map((t: any) => (
                  <li key={t.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{t.title}</div>
                      <div className="text-[11px] text-muted-foreground">Due {new Date(t.deadline).toLocaleDateString()}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase">{t.status.replace("_"," ")}</Badge>
                  </li>
                ))}
              </ul>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> Briefs to chase</CardTitle></CardHeader>
          <CardContent>
            {missingBriefs.length === 0 ? <Empty text="All briefs submitted." />
              : <ul className="divide-y divide-border">
                {missingBriefs.map((c: any) => (
                  <li key={c.id} className="py-2.5 flex items-center justify-between">
                    <Link to={`/agency/clients/${c.id}`} className="font-medium text-sm hover:underline">{c.name}</Link>
                    <span className="text-[11px] text-muted-foreground">No brief yet</span>
                  </li>
                ))}
              </ul>}
          </CardContent>
        </Card>
      </div>

      {healthScores.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4 text-accent" /> Client Health
              <span className="text-xs font-normal text-muted-foreground">— sorted by risk</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {healthScores.map((s) => (
                <HealthScoreMini key={s.id} score={s} clientName={clientNames[s.client_id] || "Client"} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Recent clients</CardTitle></CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No clients yet. <Link to="/agency/clients" className="text-accent underline">Add your first one</Link>.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((c) => (
                <li key={c.id} className="py-3 flex items-center justify-between">
                  <Link to={`/agency/clients/${c.id}`} className="hover:underline">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.niche} {c.city ? `· ${c.city}` : ""}</div>
                  </Link>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{c.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value, to, accent }: { icon: React.ReactNode; label: string; value: number; to: string; accent?: boolean }) {
  return (
    <Link to={to}>
      <Card className="hover:border-accent transition">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">{icon} {label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold font-mono ${accent ? "text-accent" : ""}`}>{value}</div>
        </CardContent>
      </Card>
    </Link>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="py-6 text-center text-sm text-muted-foreground">{text}</div>;
}
