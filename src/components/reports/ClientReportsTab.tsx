import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Plus, FileText, Eye, EyeOff, Loader2 } from "lucide-react";
import { ReportEditor } from "@/components/reports/ReportEditor";
import { ReportView } from "@/components/reports/ReportView";
import { formatPeriod, statusKind, statusLabel, type Report } from "@/lib/reports";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ui/error-state";
import { useUser } from "@/contexts/UserContext";

export function ClientReportsTab({ client }: { client: { id: string; name: string; logo_url?: string | null } }) {
  const { agency } = useUser();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editing, setEditing] = useState<Report | null>(null);
  const [viewing, setViewing] = useState<Report | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from("reports").select("*").eq("client_id", client.id).order("period_end", { ascending: false });
      if (error) throw error;
      setReports((data || []) as any);
    } catch (e: any) {
      setError(e.message || "Nu am putut încărca rapoartele");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [client.id]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Rapoarte</h2>
          <p className="text-xs text-muted-foreground">Rapoarte lunare cu AI pentru acest client.</p>
        </div>
        <Button onClick={() => { setEditing(null); setEditorOpen(true); }}><Plus className="h-4 w-4 mr-1.5" /> Raport nou</Button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <Card className="p-4"><ErrorState message={error} onRetry={load} /></Card>
      ) : reports.length === 0 ? (
        <EmptyState icon={FileText} title="Niciun raport încă" description="Generează un raport lunar cu AI pentru acest client." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {reports.map((r) => (
            <Card key={r.id} className="p-4 cursor-pointer hover:border-accent/40 rounded-2xl" onClick={() => { setViewing(r); setViewOpen(true); }}>
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold truncate">{r.title}</div>
                <StatusPill kind={statusKind(r.status)}>{statusLabel(r.status)}</StatusPill>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{formatPeriod(r.period_start, r.period_end)}</div>
              {r.summary && <p className="text-sm mt-2 line-clamp-3 text-muted-foreground">{r.summary}</p>}
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-3 pt-3 border-t border-border">
                {r.client_visible ? <><Eye className="h-3 w-3" /> Vizibil pentru client</> : <><EyeOff className="h-3 w-3" /> Doar intern</>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <ReportEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        report={editing}
        defaultClientId={client.id}
        clients={[{ id: client.id, name: client.name }]}
        onSaved={load}
      />

      <ReportView
        open={viewOpen}
        onOpenChange={setViewOpen}
        report={viewing}
        clientName={client.name}
        agencyLogoUrl={agency?.logo_url ?? null}
        clientLogoUrl={client.logo_url ?? null}
        printHref={(id) => `/agency/reports/${id}/print`}
        onEdit={(r) => { setViewOpen(false); setEditing(r); setEditorOpen(true); }}
      />
    </div>
  );
}
