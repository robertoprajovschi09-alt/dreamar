import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { listRuns, runEngine, measureRunAgain, type CieRun, type CieRunType } from "@/lib/continuousImprovement";

const RUN_TYPES: CieRunType[] = ["manual","weekly_agency","monthly_strategy","platform"];

function delta(before: any, after: any, key: string) {
  const b = Number(before?.[key]); const a = Number(after?.[key]);
  if (isNaN(b) || isNaN(a)) return null;
  const d = a - b;
  const sign = d > 0 ? "+" : "";
  return `${sign}${d.toFixed(2)}`;
}

export default function ContinuousImprovement() {
  const { agency, profile } = useUser() as any;
  const isAdmin = !!profile?.is_saas_admin;
  const [runs, setRuns] = useState<CieRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [type, setType] = useState<CieRunType>("manual");
  const [scope, setScope] = useState<"agency" | "platform">("agency");
  const [sinceDays, setSinceDays] = useState<number>(14);
  const [selected, setSelected] = useState<CieRun | null>(null);

  async function load() {
    setLoading(true);
    try { setRuns(await listRuns(scope === "platform" ? null : agency?.id)); }
    catch (e: any) { toast.error(e.message || "Failed to load runs"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [agency?.id, scope]);

  async function run() {
    setRunning(true);
    try {
      const res: any = await runEngine({
        run_type: type,
        agency_id: scope === "platform" ? null : agency?.id ?? null,
        since_days: sinceDays,
      });
      toast.success(`Rulare finalizată — ${res?.patterns?.length ?? 0} tipare, ${res?.queued_for_review ?? 0} acțiuni adăugate la coadă`);
      load();
    } catch (e: any) { toast.error(e.message || "Run failed"); }
    finally { setRunning(false); }
  }

  async function measure(r: CieRun) {
    try {
      await measureRunAgain(r.id, sinceDays);
      toast.success("Re-measured");
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Continuous Improvement Engine"
        subtitle="7-step controlled loop: collect → evaluate → detect patterns → recommend → human review → implement → measure."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={type} onValueChange={(v) => setType(v as CieRunType)}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>{RUN_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            {isAdmin && (
              <Select value={scope} onValueChange={(v) => setScope(v as any)}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agency">This agency</SelectItem>
                  <SelectItem value="platform">Platform-wide</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select value={String(sinceDays)} onValueChange={(v) => setSinceDays(Number(v))}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[7,14,30,60,90].map(d => <SelectItem key={d} value={String(d)}>{d} days</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={run} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Run Improvement Engine
            </Button>
          </div>
        }
      />

      <div className="space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Se încarcă…</p>}
        {!loading && runs.length === 0 && (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No runs yet. Click "Run Improvement Engine" to start.</CardContent></Card>
        )}
        {runs.map(r => (
          <Card key={r.id} className="cursor-pointer hover:bg-accent/30" onClick={() => setSelected(r)}>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">
                  {r.run_type} <span className="text-muted-foreground text-xs ml-2">{new Date(r.created_at).toLocaleString()}</span>
                </CardTitle>
                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge variant="outline">{r.status}</Badge>
                  <Badge variant="secondary">{(r.detected_patterns || []).length} patterns</Badge>
                  <Badge variant="secondary">{(r.recommended_improvements || []).length} recs</Badge>
                  {r.agency_id ? <Badge variant="outline">agency scope</Badge> : <Badge variant="outline">platform</Badge>}
                  {r.performance_after && Object.keys(r.performance_after).length > 0 && (
                    <>
                      <Badge>Δ avg_rating {delta(r.performance_before, r.performance_after, "avg_rating")}</Badge>
                      <Badge>Δ useful {delta(r.performance_before, r.performance_after, "useful_ratio")}</Badge>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="outline" onClick={() => measure(r)}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Measure again
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="w-[640px] sm:max-w-none overflow-y-auto">
          <SheetHeader><SheetTitle>Run details</SheetTitle></SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <section>
                <h4 className="font-semibold mb-2">Input summary</h4>
                <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(selected.input_summary, null, 2)}</pre>
              </section>
              <section>
                <h4 className="font-semibold mb-2">Detected patterns ({(selected.detected_patterns || []).length})</h4>
                <pre className="text-xs bg-muted p-3 rounded max-h-64 overflow-auto">{JSON.stringify(selected.detected_patterns, null, 2)}</pre>
              </section>
              <section>
                <h4 className="font-semibold mb-2">Recommended improvements ({(selected.recommended_improvements || []).length})</h4>
                <ul className="space-y-2">
                  {(selected.recommended_improvements || []).map((r: any, i: number) => (
                    <li key={i} className="border rounded p-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{r.action_type}</Badge>
                        <Badge>{r.risk_level}</Badge>
                        <span className="text-sm font-medium">{r.title}</span>
                      </div>
                      {r.reasoning && <p className="text-sm text-muted-foreground mt-1">{r.reasoning}</p>}
                    </li>
                  ))}
                </ul>
                <Link to="/agency/admin/ai-actions" className="text-sm underline mt-2 inline-block">
                  Open approval queue →
                </Link>
              </section>
              <section className="grid grid-cols-2 gap-3">
                <div>
                  <h4 className="font-semibold mb-2">Before</h4>
                  <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(selected.performance_before, null, 2)}</pre>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">After</h4>
                  <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(selected.performance_after, null, 2)}</pre>
                </div>
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
