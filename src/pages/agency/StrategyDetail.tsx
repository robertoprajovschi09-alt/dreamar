import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Loader2, Save, Sparkles, ListChecks, CalendarPlus, Send, Printer, AlertTriangle, Plus, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  STRATEGY_STATUS_META, createDraftsFromStrategy, createTasksFromStrategy, generateStrategy, getStrategy,
  monthLabel, setStrategyStatus, updateStrategy, type MonthlyStrategy, type StrategyStatus,
} from "@/lib/strategies";
import { supabase } from "@/integrations/supabase/client";

export default function StrategyDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [s, setS] = useState<MonthlyStrategy | null>(null);
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const data = await getStrategy(id);
    setS(data);
    if (data) {
      const { data: c } = await supabase.from("clients").select("id,name,niche").eq("id", data.client_id).maybeSingle();
      setClient(c);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const patch = (p: Partial<MonthlyStrategy>) => setS((prev) => prev ? { ...prev, ...p } as MonthlyStrategy : prev);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    try {
      await updateStrategy(s.id, {
        strategy_title: s.strategy_title,
        executive_summary: s.executive_summary,
        key_insights: s.key_insights,
        what_worked: s.what_worked,
        what_did_not_work: s.what_did_not_work,
        content_to_repeat: s.content_to_repeat,
        content_to_stop: s.content_to_stop,
        new_tests: s.new_tests,
        recommended_hooks: s.recommended_hooks,
        recommended_content_formats: s.recommended_content_formats,
        recommended_campaigns: s.recommended_campaigns,
        suggested_calendar_plan: s.suggested_calendar_plan,
        business_focus: s.business_focus,
        risks: s.risks,
        action_items: s.action_items,
        missing_data: s.missing_data,
      });
      toast.success("Salvat");
    } catch (e: any) { toast.error(e.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const regenerate = async () => {
    if (!s) return;
    if (!confirm("Regenerate the strategy from scratch? This will overwrite current content.")) return;
    setBusy(true);
    try {
      await generateStrategy(s.client_id, s.year, s.month);
      toast.success("Regenerat");
      await load();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setBusy(false); }
  };

  const changeStatus = async (status: StrategyStatus) => {
    if (!s) return;
    setBusy(true);
    try {
      await setStrategyStatus(s, status);
      toast.success(`Status actualizat: ${STRATEGY_STATUS_META[status].label}`);
      await load();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setBusy(false); }
  };

  const makeTasks = async () => {
    if (!s) return;
    setBusy(true);
    try {
      const n = await createTasksFromStrategy(s);
      toast.success(`Am creat ${n} ${n === 1 ? "sarcină" : "sarcini"}`);
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setBusy(false); }
  };

  const makeDrafts = async () => {
    if (!s) return;
    setBusy(true);
    try {
      const n = await createDraftsFromStrategy(s);
      toast.success(`Am creat ${n} ${n === 1 ? "ciornă de conținut" : "ciorne de conținut"}`);
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-accent" /></div>;
  if (!s) return <div className="p-10 text-center text-muted-foreground">Strategia nu a fost găsită.</div>;

  const meta = STRATEGY_STATUS_META[s.status];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link to="/agency/strategies"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
        <Badge className={meta.color}>{meta.label}</Badge>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <Input className="text-2xl font-bold h-auto py-2 border-none px-0 focus-visible:ring-0" value={s.strategy_title} onChange={(e) => patch({ strategy_title: e.target.value })} />
          <div className="text-sm text-muted-foreground">{client?.name || "—"} · {monthLabel(s.month, s.year)}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving} variant="outline"><Save className="h-4 w-4 mr-1" /> Salvează</Button>
          <Button onClick={regenerate} disabled={busy} variant="outline"><Sparkles className="h-4 w-4 mr-1" /> Regenerate</Button>
          <Button onClick={makeTasks} disabled={busy} variant="outline"><ListChecks className="h-4 w-4 mr-1" /> Create tasks</Button>
          <Button onClick={makeDrafts} disabled={busy} variant="outline"><CalendarPlus className="h-4 w-4 mr-1" /> Create drafts</Button>
          <Button onClick={() => window.open(`/agency/strategies/${s.id}/print`, "_blank")} variant="outline"><Printer className="h-4 w-4 mr-1" /> Export PDF</Button>
          {s.status !== "sent_to_client" && (
            <Button onClick={() => changeStatus("sent_to_client")} disabled={busy}><Send className="h-4 w-4 mr-1" /> Send to client</Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Status</Label>
        <Select value={s.status} onValueChange={(v) => changeStatus(v as StrategyStatus)}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(STRATEGY_STATUS_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {s.missing_data?.length > 0 && (
        <Card className="border-yellow-500/40 bg-yellow-500/5">
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <CardTitle className="text-sm">Date lipsă semnalate de AI</CardTitle>
          </CardHeader>
          <CardContent><BulletList items={s.missing_data} muted /></CardContent>
        </Card>
      )}

      <Section title="Executive summary">
        <Textarea value={s.executive_summary || ""} onChange={(e) => patch({ executive_summary: e.target.value })} rows={4} />
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <ListSection title="Business focus" items={s.business_focus} onChange={(v) => patch({ business_focus: v })} />
        <ListSection title="Key insights" items={s.key_insights} onChange={(v) => patch({ key_insights: v })} />
        <ListSection title="Ce a funcționat" items={s.what_worked} onChange={(v) => patch({ what_worked: v })} />
        <ListSection title="Ce nu a funcționat" items={s.what_did_not_work} onChange={(v) => patch({ what_did_not_work: v })} />
        <ListSection title="Content to repeat" items={s.content_to_repeat} onChange={(v) => patch({ content_to_repeat: v })} />
        <ListSection title="Content to stop" items={s.content_to_stop} onChange={(v) => patch({ content_to_stop: v })} />
        <ListSection title="New tests" items={s.new_tests} onChange={(v) => patch({ new_tests: v })} />
        <ListSection title="Recommended hooks" items={s.recommended_hooks} onChange={(v) => patch({ recommended_hooks: v })} />
        <ListSection title="Formate de conținut" items={s.recommended_content_formats} onChange={(v) => patch({ recommended_content_formats: v })} />
        <ListSection title="Risks" items={s.risks} onChange={(v) => patch({ risks: v })} />
      </div>

      <Section title="Recommended campaigns">
        <div className="space-y-2">
          {(s.recommended_campaigns || []).map((c, i) => (
            <Card key={i}>
              <CardContent className="p-3 space-y-2">
                <div className="flex gap-2">
                  <Input value={c.name} onChange={(e) => {
                    const arr = [...s.recommended_campaigns]; arr[i] = { ...c, name: e.target.value }; patch({ recommended_campaigns: arr });
                  }} placeholder="Campaign name" />
                  <Button variant="ghost" size="icon" onClick={() => patch({ recommended_campaigns: s.recommended_campaigns.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <Input value={c.goal} onChange={(e) => {
                  const arr = [...s.recommended_campaigns]; arr[i] = { ...c, goal: e.target.value }; patch({ recommended_campaigns: arr });
                }} placeholder="Goal" />
                <Textarea value={c.description} onChange={(e) => {
                  const arr = [...s.recommended_campaigns]; arr[i] = { ...c, description: e.target.value }; patch({ recommended_campaigns: arr });
                }} placeholder="Descriere" rows={2} />
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={() => patch({ recommended_campaigns: [...(s.recommended_campaigns || []), { name: "", goal: "", description: "" }] })}><Plus className="h-4 w-4 mr-1" /> Add campaign</Button>
        </div>
      </Section>

      <Section title="Suggested calendar plan">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {([
            ["posts_per_week", "Posts/week"], ["reels", "Reels"], ["stories", "Stories"], ["carousels", "Carousels"], ["campaigns", "Campaigns"],
          ] as const).map(([k, label]) => (
            <div key={k}>
              <Label className="text-xs">{label}</Label>
              <Input type="number" value={(s.suggested_calendar_plan as any)?.[k] ?? 0} onChange={(e) => patch({ suggested_calendar_plan: { ...s.suggested_calendar_plan, [k]: Number(e.target.value) } })} />
            </div>
          ))}
        </div>
        <div className="mt-3">
          <Label className="text-xs">Date cheie (una pe linie)</Label>
          <Textarea
            value={(s.suggested_calendar_plan?.key_dates || []).join("\n")}
            onChange={(e) => patch({ suggested_calendar_plan: { ...s.suggested_calendar_plan, key_dates: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) } })}
            rows={3}
          />
        </div>
        <div className="mt-3">
          <Label className="text-xs">Note</Label>
          <Textarea value={s.suggested_calendar_plan?.notes || ""} onChange={(e) => patch({ suggested_calendar_plan: { ...s.suggested_calendar_plan, notes: e.target.value } })} rows={2} />
        </div>
      </Section>

      <Section title="Action items">
        <div className="space-y-2">
          {(s.action_items || []).map((a, i) => (
            <Card key={i}>
              <CardContent className="p-3 space-y-2">
                <div className="flex gap-2">
                  <Input value={a.title} onChange={(e) => { const arr = [...s.action_items]; arr[i] = { ...a, title: e.target.value }; patch({ action_items: arr }); }} placeholder="Task title" />
                  <Select value={a.priority} onValueChange={(v) => { const arr = [...s.action_items]; arr[i] = { ...a, priority: v as any }; patch({ action_items: arr }); }}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => patch({ action_items: s.action_items.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <Textarea value={a.description} onChange={(e) => { const arr = [...s.action_items]; arr[i] = { ...a, description: e.target.value }; patch({ action_items: arr }); }} placeholder="Descriere" rows={2} />
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={() => patch({ action_items: [...(s.action_items || []), { title: "", description: "", priority: "medium" }] })}><Plus className="h-4 w-4 mr-1" /> Add task</Button>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ListSection({ title, items, onChange }: { title: string; items: string[]; onChange: (v: string[]) => void }) {
  return (
    <Section title={title}>
      <div className="space-y-2">
        {(items || []).map((it, i) => (
          <div key={i} className="flex gap-2">
            <Textarea value={it} onChange={(e) => { const arr = [...items]; arr[i] = e.target.value; onChange(arr); }} rows={2} />
            <Button variant="ghost" size="icon" onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange([...(items || []), ""])}><Plus className="h-4 w-4 mr-1" /> Adaugă</Button>
      </div>
    </Section>
  );
}

function BulletList({ items, muted }: { items: string[]; muted?: boolean }) {
  return (
    <ul className={`list-disc pl-5 space-y-1 text-sm ${muted ? "text-muted-foreground" : ""}`}>
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  );
}
