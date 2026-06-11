import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { generateInsights } from "@/lib/analytics";
import { toast } from "sonner";

export function AnalyticsInsightsPanel({ clientId, year, month }: { clientId: string; year: number; month: number }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof generateInsights>> | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try { setData(await generateInsights({ clientId, year, month })); }
    catch (e: any) { toast.error(e.message || "Failed to generate insights"); }
    finally { setLoading(false); }
  };

  useEffect(() => { setData(null); }, [clientId, year, month]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> AI insights</CardTitle>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
          {data ? "Regenerate" : "Generate"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!data && !loading && <p className="text-muted-foreground text-sm">Click Generate to get AI insights based only on the data logged for this period.</p>}
        {data && (
          <>
            <div className="grid md:grid-cols-2 gap-3">
              <Stat label="Best platform" value={data.best_platform || "—"} />
              <Stat label="Worst platform" value={data.worst_platform || "—"} />
            </div>
            <Section title="Ce a funcționat" items={data.what_worked} />
            <Section title="What dropped" items={data.what_dropped} />
            <Section title="Top content" items={data.top_content} />
            <Section title="Bottom content" items={data.bottom_content} />
            <Section title="Recommendations" items={data.recommendations} />
            <Section title="Next month focus" items={data.next_month_focus} />
            {data.missing_data?.length > 0 && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 mb-1">Date lipsă</div>
                <ul className="list-disc pl-5 text-sm">{data.missing_data.map((m, i) => <li key={i}>{m}</li>)}</ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{title}</div>
      <ul className="list-disc pl-5 space-y-0.5">{items.map((s, i) => <li key={i}>{s}</li>)}</ul>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-border p-3"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="font-semibold mt-0.5">{value}</div></div>;
}
