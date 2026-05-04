import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReportEditor } from "@/components/reports/ReportEditor";
import { formatPeriod, type Report } from "@/lib/reports";
import { FileText, Plus, Eye, EyeOff, Loader2 } from "lucide-react";

export default function Reports() {
  const { agency } = useUser();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [filterClient, setFilterClient] = useState<string>("all");
  const [editing, setEditing] = useState<Report | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!agency) return;
    setLoading(true);
    const [{ data: r }, { data: c }] = await Promise.all([
      supabase.from("reports").select("*").eq("agency_id", agency.id).order("period_end", { ascending: false }),
      supabase.from("clients").select("id,name").eq("agency_id", agency.id).order("name"),
    ]);
    setReports((r || []) as any);
    setClients(c || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [agency]);

  const filtered = useMemo(() => {
    if (filterClient === "all") return reports;
    return reports.filter((r) => r.client_id === filterClient);
  }, [reports, filterClient]);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Reports"
        subtitle="AI-generated monthly client reports."
        action={
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" /> New report
          </Button>
        }
      />

      <div className="flex gap-2">
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          description="Generate your first AI-powered monthly report for a client."
          action={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1.5" /> New report</Button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <Card key={r.id} className="p-4 cursor-pointer hover:border-accent/40 transition-colors" onClick={() => { setEditing(r); setOpen(true); }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{r.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{clientName(r.client_id)}</div>
                </div>
                <Badge variant="secondary" className="text-[10px] uppercase">{r.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-3">{formatPeriod(r.period_start, r.period_end)}</div>
              {r.summary && <p className="text-sm mt-2 line-clamp-3 text-muted-foreground">{r.summary}</p>}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  {r.client_visible ? <><Eye className="h-3 w-3" /> Visible to client</> : <><EyeOff className="h-3 w-3" /> Internal only</>}
                </div>
                <div className="text-[11px] text-muted-foreground">{(r.highlights || []).length} highlights</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ReportEditor
        open={open}
        onOpenChange={setOpen}
        report={editing}
        clients={clients}
        onSaved={load}
      />
    </div>
  );
}
