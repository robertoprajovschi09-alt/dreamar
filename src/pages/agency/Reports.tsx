import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { ErrorState } from "@/components/ui/error-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReportEditor } from "@/components/reports/ReportEditor";
import { ReportView } from "@/components/reports/ReportView";
import { formatPeriod, statusKind, statusLabel, REPORT_STATUSES, type Report } from "@/lib/reports";
import { FileText, Plus, Eye, EyeOff, Loader2 } from "lucide-react";

export default function Reports() {
  const { agency } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string; logo_url: string | null }[]>([]);
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [editing, setEditing] = useState<Report | null>(null);
  const [viewing, setViewing] = useState<Report | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  const load = async () => {
    if (!agency) return;
    setLoading(true);
    setError(null);
    try {
      const [{ data: r, error: rErr }, { data: c, error: cErr }] = await Promise.all([
        supabase.from("reports").select("*").eq("agency_id", agency.id).order("period_end", { ascending: false }),
        supabase.from("clients").select("id,name,logo_url").eq("agency_id", agency.id).order("name"),
      ]);
      if (rErr) throw rErr;
      if (cErr) throw cErr;
      setReports((r || []) as any);
      setClients((c || []) as any);
    } catch (e: any) {
      setError(e.message || "Nu am putut încărca rapoartele");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [agency]);

  const filtered = useMemo(() => {
    let list = reports;
    if (filterClient !== "all") list = list.filter((r) => r.client_id === filterClient);
    if (filterStatus !== "all") list = list.filter((r) => r.status === filterStatus);
    if (filterPeriod !== "all") {
      const months = Number(filterPeriod);
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - months);
      list = list.filter((r) => new Date(r.period_end) >= cutoff);
    }
    return list;
  }, [reports, filterClient, filterStatus, filterPeriod]);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";
  const clientLogo = (id: string) => clients.find((c) => c.id === id)?.logo_url ?? null;

  const openView = (r: Report) => { setViewing(r); setViewOpen(true); };
  const openEditor = (r: Report | null) => { setEditing(r); setEditorOpen(true); };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Rapoarte"
        subtitle="Rapoarte lunare generate cu AI pentru clienții tăi."
        action={
          <Button onClick={() => openEditor(null)}>
            <Plus className="h-4 w-4 mr-1.5" /> Raport nou
          </Button>
        }
      />

      <div className="flex gap-2 flex-wrap">
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toți clienții</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate statusurile</SelectItem>
            {REPORT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toată perioada</SelectItem>
            <SelectItem value="3">Ultimele 3 luni</SelectItem>
            <SelectItem value="6">Ultimele 6 luni</SelectItem>
            <SelectItem value="12">Ultimul an</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <Card className="p-4"><ErrorState message={error} onRetry={load} /></Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Niciun raport încă"
          description="Generează primul raport lunar cu AI pentru un client."
          action={<Button onClick={() => openEditor(null)}><Plus className="h-4 w-4 mr-1.5" /> Raport nou</Button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <Card key={r.id} className="p-4 cursor-pointer hover:border-accent/40 transition-colors rounded-2xl" onClick={() => openView(r)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{r.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{clientName(r.client_id)}</div>
                </div>
                <StatusPill kind={statusKind(r.status)}>{statusLabel(r.status)}</StatusPill>
              </div>
              <div className="text-xs text-muted-foreground mt-3">{formatPeriod(r.period_start, r.period_end)}</div>
              {r.summary && <p className="text-sm mt-2 line-clamp-3 text-muted-foreground">{r.summary}</p>}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  {r.client_visible ? <><Eye className="h-3 w-3" /> Vizibil pentru client</> : <><EyeOff className="h-3 w-3" /> Doar intern</>}
                </div>
                <div className="text-[11px] text-muted-foreground">{(r.highlights || []).length} momente</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ReportEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        report={editing}
        clients={clients}
        onSaved={load}
      />

      <ReportView
        open={viewOpen}
        onOpenChange={setViewOpen}
        report={viewing}
        clientName={viewing ? clientName(viewing.client_id) : undefined}
        agencyLogoUrl={agency?.logo_url ?? null}
        clientLogoUrl={viewing ? clientLogo(viewing.client_id) : null}
        printHref={(id) => `/agency/reports/${id}/print`}
        onEdit={(r) => { setViewOpen(false); openEditor(r); }}
      />
    </div>
  );
}
