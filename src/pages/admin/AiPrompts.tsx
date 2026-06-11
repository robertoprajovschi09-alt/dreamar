import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Sparkles, FlaskConical, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type P = { id: string; key: string; feature: string | null; version: number; version_name: string | null; content: string; model: string | null; temperature: number | null; is_active: boolean; agency_id: string | null; performance_score: number | null; created_at: string; notes: string | null };
type Score = { prompt_id: string; feature: string; version: number; version_name: string | null; is_active: boolean; agency_id: string | null; runs_count: number; feedback_count: number; avg_rating: number | null; useful_count: number; hallucinated_count: number; negative_count: number; acceptance_rate: number | null; last_used_at: string | null };
type Feedback = { id: string; ai_feature: string | null; rating: number; feedback_type: string | null; comment: string | null; correction: string | null; created_at: string; run_id: string };
type Run = { id: string; feature: string | null; prompt_key: string | null; status: string; error_text: string | null; output_text: string | null; created_at: string };
type LearnEvent = { id: string; agency_id: string | null; event_type: string; source: string; summary: string | null; recommended_change: string | null; proposed_prompt_version_id: string | null; status: string; created_at: string };

export default function AiPrompts() {
  const { profile } = useUser();
  const [prompts, setPrompts] = useState<P[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [failed, setFailed] = useState<Run[]>([]);
  const [events, setEvents] = useState<LearnEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [evalOpen, setEvalOpen] = useState<P | null>(null);
  const [evalDataset, setEvalDataset] = useState('[\n  {"test_name":"basic","input_sample":"Sample input","expected_behavior":"Concise, factual response."}\n]');
  const [evalBusy, setEvalBusy] = useState(false);
  const [proposing, setProposing] = useState<string | null>(null);
  const [form, setForm] = useState({ key: "", content: "", model: "", temperature: "0.4", version_name: "" });

  async function load() {
    const [p, s, f, r, e] = await Promise.all([
      supabase.from("ai_prompts").select("*").order("key").order("version", { ascending: false }),
      supabase.from("ai_prompt_scoreboard").select("*").order("feature").order("version", { ascending: false }),
      supabase.from("ai_feedback").select("id,ai_feature,rating,feedback_type,comment,correction,created_at,run_id").order("created_at", { ascending: false }).limit(100),
      supabase.from("ai_prompt_runs").select("id,feature,prompt_key,status,error_text,output_text,created_at").in("status", ["error", "blocked"]).order("created_at", { ascending: false }).limit(50),
      supabase.from("ai_learning_events").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setPrompts((p.data || []) as P[]);
    setScores((s.data || []) as Score[]);
    setFeedback((f.data || []) as Feedback[]);
    setFailed((r.data || []) as Run[]);
    setEvents((e.data || []) as LearnEvent[]);
  }
  useEffect(() => { load(); }, []);

  const features = useMemo(() => Array.from(new Set(prompts.map(p => p.key))).sort(), [prompts]);
  const scoreByPrompt = useMemo(() => Object.fromEntries(scores.map(s => [s.prompt_id, s])), [scores]);

  async function setActive(p: P) {
    // Deactivate other versions for same key+agency, then activate this one
    const deact = supabase.from("ai_prompts").update({ is_active: false }).eq("key", p.key);
    await (p.agency_id ? deact.eq("agency_id", p.agency_id) : deact.is("agency_id", null));
    const { error } = await supabase.from("ai_prompts").update({ is_active: true }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(`v${p.version} activated for ${p.key}`);
    load();
  }

  async function createNewVersion() {
    if (!form.key || !form.content) return;
    const { data: latest } = await supabase.from("ai_prompts").select("version").eq("key", form.key).is("agency_id", null).order("version", { ascending: false }).limit(1).maybeSingle();
    const next = (latest?.version || 0) + 1;
    const { error } = await supabase.from("ai_prompts").insert({
      key: form.key, feature: form.key, version: next, version_name: form.version_name || null,
      content: form.content, model: form.model || null, temperature: parseFloat(form.temperature) || 0.4,
      is_active: false, agency_id: null,
    });
    if (error) return toast.error(error.message);
    setOpen(false);
    setForm({ key: "", content: "", model: "", temperature: "0.4", version_name: "" });
    load();
  }

  async function proposeImprovement(feature: string) {
    setProposing(feature);
    const { data, error } = await supabase.functions.invoke("ai-propose-prompt-improvement", { body: { feature } });
    setProposing(null);
    if (error) return toast.error(error.message);
    toast.success(`AI a propus v${data?.version} — revezi în tabul Evenimente de învățare`);
    load();
  }

  async function runEvaluation() {
    if (!evalOpen) return;
    let parsedDataset: any[] = [];
    try { parsedDataset = JSON.parse(evalDataset); } catch { return toast.error("Set de date JSON invalid"); }
    setEvalBusy(true);
    const { data, error } = await supabase.functions.invoke("ai-run-evaluation", {
      body: { prompt_version_id: evalOpen.id, dataset: parsedDataset },
    });
    setEvalBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Scor mediu ${(data?.avg_score ?? 0).toFixed(2)} pe ${data?.count} teste`);
    setEvalOpen(null);
    load();
  }

  async function approveEvent(ev: LearnEvent) {
    if (ev.proposed_prompt_version_id) {
      const { data: prop } = await supabase.from("ai_prompts").select("*").eq("id", ev.proposed_prompt_version_id).maybeSingle();
      if (prop) {
        const deact = supabase.from("ai_prompts").update({ is_active: false }).eq("key", prop.key);
        await (prop.agency_id ? deact.eq("agency_id", prop.agency_id) : deact.is("agency_id", null));
        await supabase.from("ai_prompts").update({ is_active: true }).eq("id", prop.id);
      }
    }
    await supabase.from("ai_learning_events").update({ status: "applied", reviewed_by: profile?.id, reviewed_at: new Date().toISOString() }).eq("id", ev.id);
    toast.success("Aprobat și aplicat");
    load();
  }
  async function rejectEvent(ev: LearnEvent) {
    await supabase.from("ai_learning_events").update({ status: "rejected", reviewed_by: profile?.id, reviewed_at: new Date().toISOString() }).eq("id", ev.id);
    load();
  }

  if (!profile?.is_saas_admin) return <div className="p-6 text-sm">Doar admin.</div>;

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="AI Prompts & Learning"
        subtitle="Prompt versions, performance, feedback, failed outputs, and AI-proposed improvements."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Versiune nouă</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Versiune nouă de prompt</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <Input placeholder="cheie funcție (ex. agency_assistant)" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
                <Input placeholder="nume versiune (opțional)" value={form.version_name} onChange={(e) => setForm({ ...form, version_name: e.target.value })} />
                <Textarea rows={10} placeholder="Conținutul promptului de sistem…" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="model (opțional)" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
                  <Input placeholder="temperatură" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} />
                </div>
              </div>
              <DialogFooter><Button onClick={createNewVersion}>Creează</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Tabs defaultValue="versions">
        <TabsList>
          <TabsTrigger value="versions">Versions ({prompts.length})</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="feedback">Feedback ({feedback.length})</TabsTrigger>
          <TabsTrigger value="failed">Failed ({failed.length})</TabsTrigger>
          <TabsTrigger value="events">Learning Events ({events.length})</TabsTrigger>
        </TabsList>

        {/* Versions */}
        <TabsContent value="versions" className="space-y-4">
          {features.map(f => {
            const versions = prompts.filter(p => p.key === f);
            return (
              <div key={f} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">{f}</h3>
                  <Button size="sm" variant="outline" onClick={() => proposeImprovement(f)} disabled={proposing === f}>
                    {proposing === f ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    Propose improvement
                  </Button>
                </div>
                {versions.map(p => {
                  const sc = scoreByPrompt[p.id];
                  return (
                    <Card key={p.id}>
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                          v{p.version} {p.version_name && <span className="text-muted-foreground">— {p.version_name}</span>}
                          {p.agency_id ? <Badge variant="outline">agency</Badge> : <Badge variant="outline">global</Badge>}
                          {p.is_active && <Badge>active</Badge>}
                          {p.performance_score != null && <Badge variant="secondary">score {p.performance_score}</Badge>}
                          {sc && <span className="text-xs text-muted-foreground">{sc.runs_count} runs · ⭐ {sc.avg_rating?.toFixed(2) ?? "—"} · 👍 {sc.useful_count} · ⚠ {sc.hallucinated_count}</span>}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEvalOpen(p)}><FlaskConical className="h-3 w-3 mr-1" />Rulează evaluarea</Button>
                          {!p.is_active && <Button size="sm" onClick={() => setActive(p)}>Setează ca activ</Button>}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-xs whitespace-pre-wrap bg-muted p-2 rounded max-h-48 overflow-auto">{p.content}</pre>
                        {p.notes && <div className="text-xs text-muted-foreground mt-1"><strong>Notes:</strong> {p.notes}</div>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })}
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance" className="space-y-3">
          {features.map(f => {
            const fs = scores.filter(s => s.feature === f);
            const totalRuns = fs.reduce((a, b) => a + (b.runs_count || 0), 0);
            const totalFb = fs.reduce((a, b) => a + (b.feedback_count || 0), 0);
            const useful = fs.reduce((a, b) => a + (b.useful_count || 0), 0);
            const halluc = fs.reduce((a, b) => a + (b.hallucinated_count || 0), 0);
            const best = [...fs].sort((a, b) => (b.acceptance_rate ?? -1) - (a.acceptance_rate ?? -1))[0];
            const worst = [...fs].sort((a, b) => (a.acceptance_rate ?? 999) - (b.acceptance_rate ?? 999))[0];
            return (
              <Card key={f}>
                <CardHeader><CardTitle className="text-sm">{f}</CardTitle></CardHeader>
                <CardContent className="text-xs space-y-1">
                  <div>Runs: <strong>{totalRuns}</strong> · Feedback: <strong>{totalFb}</strong> · Useful: <strong>{useful}</strong> · Hallucinated: <strong className={halluc > 0 ? "text-destructive" : ""}>{halluc}</strong></div>
                  {best && <div>Cea mai bună versiune: <Badge variant="secondary">v{best.version}</Badge> {best.acceptance_rate ?? "—"}% acceptance</div>}
                  {worst && worst.prompt_id !== best?.prompt_id && <div>Cea mai slabă versiune: <Badge variant="outline">v{worst.version}</Badge> {worst.acceptance_rate ?? "—"}% acceptance</div>}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Feedback */}
        <TabsContent value="feedback" className="space-y-2">
          {feedback.length === 0 && <div className="text-sm text-muted-foreground">Niciun feedback încă.</div>}
          {feedback.map(f => (
            <Card key={f.id}>
              <CardContent className="pt-3 text-xs space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={f.rating <= 2 ? "destructive" : f.rating === 3 ? "secondary" : "default"}>★ {f.rating}</Badge>
                  {f.ai_feature && <Badge variant="outline">{f.ai_feature}</Badge>}
                  {f.feedback_type && <Badge variant={f.feedback_type === "hallucinated_data" ? "destructive" : "secondary"}>{f.feedback_type}</Badge>}
                  <span className="text-muted-foreground ml-auto">{new Date(f.created_at).toLocaleString()}</span>
                </div>
                {f.comment && <div className="text-muted-foreground">{f.comment}</div>}
                {f.correction && <div className="bg-muted/40 rounded p-2"><strong>Corecție:</strong> {f.correction}</div>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Failed */}
        <TabsContent value="failed" className="space-y-2">
          {failed.length === 0 && <div className="text-sm text-muted-foreground">Niciun output eșuat.</div>}
          {failed.map(r => (
            <Card key={r.id}>
              <CardContent className="pt-3 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{r.status}</Badge>
                  <Badge variant="outline">{r.feature || r.prompt_key}</Badge>
                  <span className="text-muted-foreground ml-auto">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                {r.error_text && <pre className="text-[11px] whitespace-pre-wrap bg-muted/40 p-2 rounded">{r.error_text}</pre>}
                {r.output_text && <pre className="text-[11px] whitespace-pre-wrap bg-muted/40 p-2 rounded max-h-32 overflow-auto">{r.output_text}</pre>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Learning Events */}
        <TabsContent value="events" className="space-y-2">
          {events.length === 0 && <div className="text-sm text-muted-foreground">Niciun eveniment de învățare.</div>}
          {events.map(ev => (
            <Card key={ev.id}>
              <CardContent className="pt-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <Badge variant={ev.event_type.includes("hallucination") ? "destructive" : "secondary"}>{ev.event_type}</Badge>
                  <Badge variant="outline">{ev.source}</Badge>
                  <Badge>{ev.status}</Badge>
                  <span className="text-muted-foreground ml-auto">{new Date(ev.created_at).toLocaleString()}</span>
                </div>
                {ev.summary && <div className="text-sm">{ev.summary}</div>}
                {ev.recommended_change && <div className="text-xs text-muted-foreground"><strong>Recomandat:</strong> {ev.recommended_change}</div>}
                {ev.status === "new" && (
                  <div className="flex gap-2">
                    {ev.proposed_prompt_version_id && (
                      <Button size="sm" onClick={() => approveEvent(ev)}><CheckCircle2 className="h-3 w-3 mr-1" />Aprobă și aplică</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => rejectEvent(ev)}><XCircle className="h-3 w-3 mr-1" />Respinge</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Run Evaluation dialog */}
      <Dialog open={!!evalOpen} onOpenChange={(o) => !o && setEvalOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Run Evaluation — {evalOpen?.key} v{evalOpen?.version}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Oferă un array JSON de mostre de test. Fiecare: <code>{`{ test_name, input_sample, expected_behavior }`}</code></div>
            <Textarea rows={12} value={evalDataset} onChange={(e) => setEvalDataset(e.target.value)} className="font-mono text-xs" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEvalOpen(null)}>Anulează</Button>
            <Button onClick={runEvaluation} disabled={evalBusy}>
              {evalBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
