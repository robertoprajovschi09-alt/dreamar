import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, AlertTriangle, CheckCircle2, Clock, MessageSquareWarning, Timer } from "lucide-react";
import { fetchApprovalKpis, ApprovalKpis, APPROVAL_STATUS_META } from "@/lib/approvals";
import { ApprovalDetailDialog } from "@/components/approvals/ApprovalDetailDialog";
import { cn } from "@/lib/utils";

export default function Approvals() {
  const { agency } = useUser();
  const [tab, setTab] = useState("pending_approval");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<ApprovalKpis | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    if (!agency) return;
    setLoading(true);
    let q = supabase
      .from("content_approvals")
      .select("id,status,requested_at,due_date,responded_at,feedback,comment,content_posts(title,thumbnail_url,platform),clients(name)")
      .eq("agency_id", agency.id)
      .order("requested_at", { ascending: false });
    if (tab !== "all") q = q.eq("status", tab);
    const [{ data }, k] = await Promise.all([q, fetchApprovalKpis(agency.id)]);
    setRows(data || []);
    setKpis(k);
    setLoading(false);
  };

  useEffect(() => { load(); }, [agency, tab]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">Track every content approval request across all clients.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi icon={Clock} label="Pending" value={kpis?.pending ?? "—"} />
        <Kpi icon={AlertTriangle} label="Overdue" value={kpis?.overdue ?? "—"} tone="danger" />
        <Kpi icon={CheckCircle2} label="Approved (7d)" value={kpis?.approvedThisWeek ?? "—"} tone="success" />
        <Kpi icon={MessageSquareWarning} label="Changes req." value={kpis?.changesRequested ?? "—"} tone="warn" />
        <Kpi icon={Timer} label="Avg time" value={kpis?.avgHours != null ? `${kpis.avgHours.toFixed(1)}h` : "—"} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending_approval">Pending</TabsTrigger>
          <TabsTrigger value="changes_requested">Changes requested</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          <Card>
            {loading ? (
              <div className="p-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : rows.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">No approvals here yet.</div>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((r) => {
                  const m = APPROVAL_STATUS_META[r.status as keyof typeof APPROVAL_STATUS_META];
                  const overdue = r.status === "pending_approval" && r.due_date && new Date(r.due_date) < new Date();
                  return (
                    <li key={r.id} className="p-4 flex items-center gap-3 hover:bg-muted/30 cursor-pointer" onClick={() => setOpenId(r.id)}>
                      {r.content_posts?.thumbnail_url ? (
                        <img src={r.content_posts.thumbnail_url} alt="" className="h-12 w-12 rounded object-cover border border-border" />
                      ) : (
                        <div className="h-12 w-12 rounded bg-muted" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{r.content_posts?.title || "(untitled)"}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {r.clients?.name} · {r.content_posts?.platform || "—"} · requested {new Date(r.requested_at).toLocaleDateString()}
                          {r.feedback && ` · "${(r.feedback as string).slice(0, 60)}"`}
                        </div>
                      </div>
                      {overdue && <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-700 dark:text-red-300">Overdue</span>}
                      <span className={cn("px-2 py-0.5 rounded text-[11px] font-medium", m?.color)}>{m?.label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <ApprovalDetailDialog open={!!openId} onOpenChange={(v) => !v && setOpenId(null)} approvalId={openId} onChanged={load} />
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: any; label: string; value: any; tone?: "danger" | "success" | "warn" }) {
  const toneCls =
    tone === "danger" ? "text-red-600 dark:text-red-400" :
    tone === "success" ? "text-emerald-600 dark:text-emerald-400" :
    tone === "warn" ? "text-orange-600 dark:text-orange-400" :
    "text-foreground";
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className={cn("text-2xl font-bold mt-1", toneCls)}>{value}</div>
    </Card>
  );
}
