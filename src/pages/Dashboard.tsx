import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAgency } from "@/contexts/AgencyContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { Users, Calendar, CheckCircle2, AlertTriangle, Video, TrendingUp, ListChecks, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtNum, fmtDateShort, fmtEur } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";

export default function Dashboard() {
  const { currentAgency, plan } = useAgency();
  const [stats, setStats] = useState<any>({ clients: 0, scheduled: 0, pendingApprovals: 0, overdueTasks: 0, totalRevenue: 0 });
  const [topVideos, setTopVideos] = useState<any[]>([]);
  const [underperformers, setUnderperformers] = useState<any[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentAgency) return;
    const aId = currentAgency.id;
    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 86400000).toISOString();

    (async () => {
      setLoading(true);
      const [clientsRes, scheduledRes, postsApprovalRes, tasksOverdueRes, impactRes, topVidsRes, lowVidsRes, overdueRes] = await Promise.all([
        supabase.from("clients").select("id,health_score,monthly_retainer", { count: "exact" }).eq("agency_id", aId),
        supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("agency_id", aId).gte("scheduled_for", now.toISOString()).lte("scheduled_for", weekAhead),
        supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("agency_id", aId).eq("approval_status", "pending"),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("agency_id", aId).lt("deadline", now.toISOString()).neq("status", "done"),
        supabase.from("business_impact_entries").select("revenue_estimate").eq("agency_id", aId),
        supabase.from("videos").select("id,hook,views,likes,client:clients(name)").eq("agency_id", aId).order("views", { ascending: false }).limit(5),
        supabase.from("clients").select("id,name,health_score,niche").eq("agency_id", aId).lt("health_score", 50).limit(5),
        supabase.from("tasks").select("id,title,deadline,priority,client:clients(name)").eq("agency_id", aId).lt("deadline", now.toISOString()).neq("status","done").order("deadline").limit(5),
      ]);

      const totalRevenue = (clientsRes.data || []).reduce((s: number, c: any) => s + Number(c.monthly_retainer || 0), 0);
      const monthRev = (impactRes.data || []).reduce((s: number, e: any) => s + Number(e.revenue_estimate || 0), 0);

      setStats({
        clients: clientsRes.count || 0,
        scheduled: scheduledRes.count || 0,
        pendingApprovals: postsApprovalRes.count || 0,
        overdueTasks: tasksOverdueRes.count || 0,
        totalRevenue,
        impactRevenue: monthRev,
      });
      setTopVideos(topVidsRes.data || []);
      setUnderperformers(lowVidsRes.data || []);
      setOverdueTasks(overdueRes.data || []);
      setLoading(false);
    })();
  }, [currentAgency]);

  return (
    <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-7xl">
      <PageHeader
        title={`Welcome back${currentAgency ? `, ${currentAgency.name}` : ""}`}
        subtitle="Here's what's happening across your agency right now."
        action={<Badge className="bg-accent/10 text-accent border-accent/30" variant="outline"><Sparkles className="h-3 w-3 mr-1" />{plan?.name || "—"}</Badge>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Active Clients" value={fmtNum(stats.clients)} icon={Users} accent />
        <MetricCard label="Posts This Week" value={fmtNum(stats.scheduled)} icon={Calendar} hint="Next 7 days" />
        <MetricCard label="Pending Approvals" value={fmtNum(stats.pendingApprovals)} icon={CheckCircle2} />
        <MetricCard label="Overdue Tasks" value={fmtNum(stats.overdueTasks)} icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <MetricCard label="Monthly Retainer (MRR)" value={fmtEur(stats.totalRevenue)} icon={TrendingUp} hint="Sum of all client retainers" />
        <MetricCard label="Tracked Business Impact" value={fmtEur(stats.impactRevenue)} icon={TrendingUp} hint="From manual impact entries" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><Video className="h-4 w-4 text-accent" /> Top Performing Videos</h2>
            <Link to="/app/videos" className="text-xs text-accent hover:underline">View all</Link>
          </div>
          {loading ? <div className="text-sm text-muted-foreground">Loading…</div>
            : topVideos.length === 0 ? <EmptyState icon={Video} title="No videos yet" description="Add video performance data to see top performers." />
            : (
              <ul className="space-y-3">
                {topVideos.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{v.hook || "(no hook)"}</div>
                      <div className="text-xs text-muted-foreground truncate">{v.client?.name}</div>
                    </div>
                    <div className="metric-number font-semibold tabular-nums">{fmtNum(v.views)}</div>
                  </li>
                ))}
              </ul>
            )}
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-accent" /> Underperforming Clients</h2>
            <Link to="/app/clients" className="text-xs text-accent hover:underline">View all</Link>
          </div>
          {loading ? <div className="text-sm text-muted-foreground">Loading…</div>
            : underperformers.length === 0 ? <EmptyState icon={Users} title="All healthy" description="No clients with health score below 50." />
            : (
              <ul className="space-y-3">
                {underperformers.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                    <Link to={`/app/clients/${c.id}`} className="flex-1 min-w-0">
                      <div className="font-medium truncate hover:text-accent">{c.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{c.niche.replace("_", " ")}</div>
                    </Link>
                    <Badge variant="outline" className="border-accent/40 text-accent">Health {c.health_score}</Badge>
                  </li>
                ))}
              </ul>
            )}
        </div>

        <div className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><ListChecks className="h-4 w-4 text-accent" /> Overdue Tasks</h2>
            <Link to="/app/tasks" className="text-xs text-accent hover:underline">View all</Link>
          </div>
          {loading ? <div className="text-sm text-muted-foreground">Loading…</div>
            : overdueTasks.length === 0 ? <EmptyState icon={ListChecks} title="Nothing overdue" description="Great — your agency is on top of everything." />
            : (
              <ul className="divide-y divide-border">
                {overdueTasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{t.title}</div>
                      <div className="text-xs text-muted-foreground">{t.client?.name || "—"}</div>
                    </div>
                    <Badge variant="outline" className="border-accent/40 text-accent">Due {fmtDateShort(t.deadline)}</Badge>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </div>

      {(!currentAgency || stats.clients === 0) && !loading && (
        <div className="mt-6">
          <EmptyState
            icon={Users}
            title="Add your first client"
            description="Get started by adding a client. You'll be able to track content, performance, and business impact."
            action={<Link to="/app/clients"><Button className="bg-accent hover:bg-accent/90 text-accent-foreground">Add a client</Button></Link>}
          />
        </div>
      )}
    </div>
  );
}
