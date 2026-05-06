import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, RefreshCw, AlertCircle, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = { agencyId: string; clientId: string };

export function DashboardContextCard({ clientId }: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [ctx, setCtx] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const now = new Date();
    const { data } = await supabase
      .from("client_dashboard_contexts")
      .select("*")
      .eq("client_id", clientId)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle();
    setCtx(data);
    setLoading(false);
    void now;
  };

  const regenerate = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("client-dashboard-context-generate", {
        body: { client_id: clientId },
      });
      if (error) throw error;
      if ((data as any)?.context) setCtx((data as any).context);
      toast.success("Dashboard context regenerated");
    } catch (e: any) {
      toast.error(e.message || "Failed to regenerate");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); }, [clientId]);

  if (loading) return <Card><CardContent className="py-6 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></CardContent></Card>;

  if (!ctx) {
    return (
      <Card>
        <CardContent className="p-5 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-semibold flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-accent" /> AI dashboard context</div>
            <div className="text-xs text-muted-foreground mt-0.5">No AI context yet for this client.</div>
          </div>
          <Button size="sm" onClick={regenerate} disabled={busy} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const period = new Date(ctx.year, (ctx.month || 1) - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-accent" /> AI dashboard context</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] capitalize">{period}</Badge>
            {ctx.confidence_score != null && (
              <Badge variant="secondary" className="text-[10px] font-mono">{Math.round(ctx.confidence_score * 100)}% confidence</Badge>
            )}
            <Button size="sm" variant="ghost" onClick={regenerate} disabled={busy}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${busy ? "animate-spin" : ""}`} /> Regenerate
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        {ctx.generated_summary && <p className="text-sm">{ctx.generated_summary}</p>}

        {Array.isArray(ctx.ai_priorities) && ctx.ai_priorities.length > 0 && (
          <Section title="Priorities">
            <ul className="space-y-1.5">
              {ctx.ai_priorities.map((p: any, i: number) => (
                <li key={i} className="text-sm">
                  <div className="font-medium flex items-center gap-2">
                    <span>{p.title}</span>
                    {p.owner && <Badge variant="outline" className="text-[9px] uppercase">{p.owner}</Badge>}
                  </div>
                  {p.why && <div className="text-xs text-muted-foreground">{p.why}</div>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {Array.isArray(ctx.missing_data) && ctx.missing_data.length > 0 && (
          <Section title="Missing data">
            <div className="flex flex-wrap gap-1.5">
              {ctx.missing_data.map((m: any, i: number) => (
                <Badge key={i} variant="outline" className="text-[10px] gap-1">
                  <AlertCircle className="h-3 w-3 text-amber-500" /> {m.field}
                </Badge>
              ))}
            </div>
          </Section>
        )}

        {ctx.agency_internal_notes && (
          <Section title="Internal notes">
            <p className="text-xs text-muted-foreground whitespace-pre-wrap flex gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
              <span>{ctx.agency_internal_notes}</span>
            </p>
          </Section>
        )}
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">{title}</div>
      {children}
    </div>
  );
}
