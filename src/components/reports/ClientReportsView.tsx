import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, FileText } from "lucide-react";
import { formatPeriod, type Report } from "@/lib/reports";
import { EmptyState } from "@/components/EmptyState";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function ClientReportsView({ clientId }: { clientId: string }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Report | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("reports")
        .select("*")
        .eq("client_id", clientId)
        .eq("client_visible", true)
        .order("period_end", { ascending: false });
      setReports((data || []) as any);
      setLoading(false);
    })();
  }, [clientId]);

  if (loading) return <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (reports.length === 0) return <EmptyState icon={FileText} title="No reports yet" description="Reports shared by your agency will appear here." />;

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <Card key={r.id} className="p-4 cursor-pointer hover:border-accent/40" onClick={() => setActive(r)}>
          <div className="font-semibold">{r.title}</div>
          <div className="text-xs text-muted-foreground mt-1">{formatPeriod(r.period_start, r.period_end)}</div>
          {r.summary && <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">{r.summary}</p>}
        </Card>
      ))}

      <Sheet open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{active?.title}</SheetTitle>
          </SheetHeader>
          {active && (
            <div className="mt-6 space-y-5">
              <div className="text-xs text-muted-foreground">{formatPeriod(active.period_start, active.period_end)}</div>

              {active.summary && (
                <div>
                  <h3 className="text-sm font-semibold mb-1">Summary</h3>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{active.summary}</p>
                </div>
              )}

              {!!active.metrics && Object.keys(active.metrics).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Metrics</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(active.metrics).map(([k, v]) => (
                      <div key={k} className="border border-border rounded-md p-2">
                        <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{k.replace(/_/g, " ")}</div>
                        <div className="text-sm font-mono font-semibold">{String(v)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(active.highlights || []).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Highlights</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {active.highlights.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
              )}

              {(active.recommendations || []).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Recommendations</h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {active.recommendations.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
