import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Eye, EyeOff, Loader2 } from "lucide-react";
import { ReportEditor } from "@/components/reports/ReportEditor";
import { formatPeriod, type Report } from "@/lib/reports";
import { EmptyState } from "@/components/EmptyState";

export function ClientReportsTab({ client }: { client: { id: string; name: string } }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Report | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("reports").select("*").eq("client_id", client.id).order("period_end", { ascending: false });
    setReports((data || []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, [client.id]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Reports</h2>
          <p className="text-xs text-muted-foreground">Monthly AI-generated reports for this client.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1.5" /> New report</Button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : reports.length === 0 ? (
        <EmptyState icon={FileText} title="No reports yet" description="Generate a monthly AI report for this client." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {reports.map((r) => (
            <Card key={r.id} className="p-4 cursor-pointer hover:border-accent/40" onClick={() => { setEditing(r); setOpen(true); }}>
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold truncate">{r.title}</div>
                <Badge variant="secondary" className="text-[10px] uppercase">{r.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{formatPeriod(r.period_start, r.period_end)}</div>
              {r.summary && <p className="text-sm mt-2 line-clamp-3 text-muted-foreground">{r.summary}</p>}
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-3 pt-3 border-t border-border">
                {r.client_visible ? <><Eye className="h-3 w-3" /> Visible to client</> : <><EyeOff className="h-3 w-3" /> Internal only</>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <ReportEditor
        open={open}
        onOpenChange={setOpen}
        report={editing}
        defaultClientId={client.id}
        clients={[{ id: client.id, name: client.name }]}
        onSaved={load}
      />
    </div>
  );
}
