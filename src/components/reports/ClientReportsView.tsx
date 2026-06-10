import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, FileText } from "lucide-react";
import { formatPeriod, type Report } from "@/lib/reports";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ui/error-state";
import { ReportView } from "@/components/reports/ReportView";

export function ClientReportsView({ clientId }: { clientId: string }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Report | null>(null);
  const [agency, setAgency] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [client, setClient] = useState<{ name: string; logo_url: string | null } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("client_id", clientId)
        .eq("client_visible", true)
        .order("period_end", { ascending: false });
      if (error) throw error;
      setReports((data || []) as any);
      const { data: c } = await supabase.from("clients").select("name,logo_url,agency_id").eq("id", clientId).maybeSingle();
      if (c) {
        setClient({ name: c.name, logo_url: c.logo_url });
        const { data: a } = await supabase.from("agencies").select("name,logo_url").eq("id", c.agency_id).maybeSingle();
        setAgency(a as any);
      }
    } catch (e: any) {
      setError(e.message || "Nu am putut încărca rapoartele");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [clientId]);

  if (loading) return <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (error) return <Card className="p-4"><ErrorState message={error} onRetry={load} /></Card>;
  if (reports.length === 0) return <EmptyState icon={FileText} title="Niciun raport încă" description="Rapoartele trimise de agenția ta apar aici." />;

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <Card key={r.id} className="p-4 cursor-pointer hover:border-accent/40 rounded-2xl" onClick={() => setActive(r)}>
          <div className="font-semibold">{r.title}</div>
          <div className="text-xs text-muted-foreground mt-1">{formatPeriod(r.period_start, r.period_end)}</div>
          {r.summary && <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">{r.summary}</p>}
        </Card>
      ))}

      <ReportView
        open={!!active}
        onOpenChange={(v) => !v && setActive(null)}
        report={active}
        clientName={client?.name}
        agencyLogoUrl={agency?.logo_url ?? null}
        clientLogoUrl={client?.logo_url ?? null}
        printHref={(id) => `/client/reports/${id}/print`}
      />
    </div>
  );
}
