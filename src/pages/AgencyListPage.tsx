import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAgency } from "@/contexts/AgencyContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Calendar, Video, TrendingUp, FileText, ListChecks } from "lucide-react";
import { fmtDateShort, fmtNum, fmtEur, fmtDate } from "@/lib/format";

type Kind = "calendar" | "videos" | "impact" | "documents" | "tasks";
const META: Record<Kind, { icon: any; title: string; subtitle: string; table: string; emptyTitle: string; emptyDesc: string }> = {
  calendar: { icon: Calendar, title: "Content Calendar", subtitle: "All scheduled content across your clients", table: "content_posts", emptyTitle: "No posts planned", emptyDesc: "Open a client to add posts to their calendar." },
  videos: { icon: Video, title: "Video Tracker", subtitle: "Performance for every video across the agency", table: "videos", emptyTitle: "No videos tracked", emptyDesc: "Open a client to log video performance." },
  impact: { icon: TrendingUp, title: "Business Impact", subtitle: "Real outcomes logged across all clients", table: "business_impact_entries", emptyTitle: "No impact yet", emptyDesc: "Open a client to log calls, DMs, sales and revenue." },
  documents: { icon: FileText, title: "Documents", subtitle: "All files across your agency", table: "documents", emptyTitle: "No documents", emptyDesc: "Open a client to upload briefs and brand files." },
  tasks: { icon: ListChecks, title: "Tasks", subtitle: "All tasks across your agency", table: "tasks", emptyTitle: "No tasks", emptyDesc: "Open a client to create tasks." },
};

export default function AgencyListPage({ kind }: { kind: Kind }) {
  const { currentAgency } = useAgency();
  const m = META[kind];
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentAgency) return;
    setLoading(true);
    (async () => {
      const { data } = await (supabase.from(m.table) as any)
        .select("*, client:clients(id,name)")
        .eq("agency_id", currentAgency.id)
        .order("created_at", { ascending: false })
        .limit(200);
      setRows(data || []); setLoading(false);
    })();
  }, [currentAgency, kind]);

  return (
    <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-7xl">
      <PageHeader title={m.title} subtitle={m.subtitle} />
      {loading ? <div className="text-sm text-muted-foreground">Loading…</div>
        : rows.length === 0 ? <EmptyState icon={m.icon} title={m.emptyTitle} description={m.emptyDesc} />
        : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted-foreground">
                {kind === "calendar" && <tr><th className="text-left px-3 py-2">Title</th><th className="text-left px-3 py-2">Client</th><th className="text-left px-3 py-2">Platform</th><th className="text-left px-3 py-2">Scheduled</th><th className="text-left px-3 py-2">Status</th></tr>}
                {kind === "videos" && <tr><th className="text-left px-3 py-2">Date</th><th className="text-left px-3 py-2">Client</th><th className="text-left px-3 py-2">Hook</th><th className="text-right px-3 py-2">Views</th><th className="text-right px-3 py-2">DMs</th></tr>}
                {kind === "impact" && <tr><th className="text-left px-3 py-2">Date</th><th className="text-left px-3 py-2">Client</th><th className="text-right px-3 py-2">Calls</th><th className="text-right px-3 py-2">Sales</th><th className="text-right px-3 py-2">Revenue</th></tr>}
                {kind === "documents" && <tr><th className="text-left px-3 py-2">Name</th><th className="text-left px-3 py-2">Client</th><th className="text-left px-3 py-2">Uploaded</th></tr>}
                {kind === "tasks" && <tr><th className="text-left px-3 py-2">Title</th><th className="text-left px-3 py-2">Client</th><th className="text-left px-3 py-2">Status</th><th className="text-left px-3 py-2">Priority</th><th className="text-left px-3 py-2">Deadline</th></tr>}
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-surface-1">
                    {kind === "calendar" && <><td className="px-3 py-2">{r.title}</td><td className="px-3 py-2"><Link to={`/app/clients/${r.client?.id}`} className="hover:text-accent">{r.client?.name || "—"}</Link></td><td className="px-3 py-2">{r.platform || "—"}</td><td className="px-3 py-2">{r.scheduled_for ? fmtDateShort(r.scheduled_for) : "—"}</td><td className="px-3 py-2"><Badge variant="outline">{r.status.replace(/_/g," ")}</Badge></td></>}
                    {kind === "videos" && <><td className="px-3 py-2">{r.publish_date ? fmtDate(r.publish_date) : "—"}</td><td className="px-3 py-2"><Link to={`/app/clients/${r.client?.id}`} className="hover:text-accent">{r.client?.name || "—"}</Link></td><td className="px-3 py-2 max-w-[280px] truncate">{r.hook || "—"}</td><td className="px-3 py-2 text-right metric-number">{fmtNum(r.views)}</td><td className="px-3 py-2 text-right metric-number">{fmtNum(r.dms)}</td></>}
                    {kind === "impact" && <><td className="px-3 py-2">{fmtDate(r.entry_date)}</td><td className="px-3 py-2"><Link to={`/app/clients/${r.client?.id}`} className="hover:text-accent">{r.client?.name || "—"}</Link></td><td className="px-3 py-2 text-right metric-number">{fmtNum(r.calls)}</td><td className="px-3 py-2 text-right metric-number">{fmtNum(r.sales)}</td><td className="px-3 py-2 text-right metric-number">{fmtEur(r.revenue_estimate)}</td></>}
                    {kind === "documents" && <><td className="px-3 py-2">{r.name}</td><td className="px-3 py-2"><Link to={`/app/clients/${r.client?.id}`} className="hover:text-accent">{r.client?.name || "—"}</Link></td><td className="px-3 py-2">{fmtDate(r.created_at)}</td></>}
                    {kind === "tasks" && <><td className="px-3 py-2">{r.title}</td><td className="px-3 py-2"><Link to={`/app/clients/${r.client?.id}`} className="hover:text-accent">{r.client?.name || "—"}</Link></td><td className="px-3 py-2"><Badge variant="outline">{r.status.replace(/_/g," ")}</Badge></td><td className="px-3 py-2">{r.priority}</td><td className="px-3 py-2">{r.deadline ? fmtDateShort(r.deadline) : "—"}</td></>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
