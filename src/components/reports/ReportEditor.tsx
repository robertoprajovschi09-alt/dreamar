import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import { Loader2, Sparkles, Trash2, Plus, X } from "lucide-react";
import { defaultPeriod, REPORT_STATUSES, type Report } from "@/lib/reports";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  report: Report | null;
  defaultClientId?: string | null;
  clients: { id: string; name: string }[];
  onSaved: () => void;
};

export function ReportEditor({ open, onOpenChange, report, defaultClientId, clients, onSaved }: Props) {
  const { agency } = useUser();
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (!open) return;
    if (report) {
      setForm({ ...report });
    } else {
      const { period_start, period_end } = defaultPeriod();
      setForm({
        title: "Monthly report",
        client_id: defaultClientId ?? "",
        period_start, period_end,
        status: "draft",
        client_visible: false,
        summary: "",
        highlights: [],
        recommendations: [],
        metrics: {},
      });
    }
  }, [open, report, defaultClientId]);

  const update = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  async function generate() {
    if (!form.client_id || !form.period_start || !form.period_end) {
      toast.error("Pick client and period first");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-report", {
        body: { client_id: form.client_id, period_start: form.period_start, period_end: form.period_end },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setForm((p: any) => ({
        ...p,
        summary: data.summary,
        highlights: data.highlights || [],
        recommendations: data.recommendations || [],
        metrics: data.metrics || {},
        status: "ready",
      }));
      toast.success("Report generated");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate");
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    if (!agency || !form.client_id || !form.title) {
      toast.error("Missing fields");
      return;
    }
    setSaving(true);
    const payload = {
      agency_id: agency.id,
      client_id: form.client_id,
      title: form.title,
      period_start: form.period_start,
      period_end: form.period_end,
      status: form.status,
      summary: form.summary,
      highlights: form.highlights,
      recommendations: form.recommendations,
      metrics: form.metrics,
      client_visible: form.client_visible,
    };
    const { error } = report
      ? await supabase.from("reports").update(payload).eq("id", report.id)
      : await supabase.from("reports").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onSaved();
    onOpenChange(false);
  }

  async function remove() {
    if (!report) return;
    if (!confirm("Delete this report?")) return;
    const { error } = await supabase.from("reports").delete().eq("id", report.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    onSaved();
    onOpenChange(false);
  }

  const editList = (key: "highlights" | "recommendations") => {
    const list: string[] = form[key] || [];
    return (
      <div className="space-y-2">
        {list.map((item, i) => (
          <div key={i} className="flex gap-2">
            <Textarea value={item} onChange={(e) => {
              const next = [...list]; next[i] = e.target.value; update(key, next);
            }} rows={2} />
            <Button size="icon" variant="ghost" onClick={() => update(key, list.filter((_, j) => j !== i))}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => update(key, [...list, ""])}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add
        </Button>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{report ? "Edit report" : "New report"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          <div>
            <Label>Title</Label>
            <Input value={form.title || ""} onChange={(e) => update("title", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Client</Label>
              <Select value={form.client_id || ""} onValueChange={(v) => update("client_id", v)}>
                <SelectTrigger><SelectValue placeholder="Pick client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status || "draft"} onValueChange={(v) => update("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Period start</Label><Input type="date" value={form.period_start || ""} onChange={(e) => update("period_start", e.target.value)} /></div>
            <div><Label>Period end</Label><Input type="date" value={form.period_end || ""} onChange={(e) => update("period_end", e.target.value)} /></div>
          </div>

          <div className="flex items-center justify-between border border-border rounded-md p-3">
            <div>
              <div className="text-sm font-medium">Visible to client</div>
              <div className="text-xs text-muted-foreground">Allow the client to view this report in their portal.</div>
            </div>
            <Switch checked={!!form.client_visible} onCheckedChange={(v) => update("client_visible", v)} />
          </div>

          <div className="border border-dashed border-accent/40 rounded-md p-4 bg-accent/5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> AI generation</div>
                <div className="text-xs text-muted-foreground">Pull metrics and synthesize a draft report for the chosen client and period.</div>
              </div>
              <Button onClick={generate} disabled={generating || !form.client_id}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate
              </Button>
            </div>
          </div>

          <div>
            <Label>Summary</Label>
            <Textarea value={form.summary || ""} onChange={(e) => update("summary", e.target.value)} rows={5} />
          </div>

          <div>
            <Label>Highlights</Label>
            {editList("highlights")}
          </div>

          <div>
            <Label>Recommendations</Label>
            {editList("recommendations")}
          </div>

          {form.metrics && Object.keys(form.metrics).length > 0 && (
            <div>
              <Label>Metrics snapshot</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {Object.entries(form.metrics).map(([k, v]) => (
                  <div key={k} className="border border-border rounded-md p-2">
                    <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{k.replace(/_/g, " ")}</div>
                    <div className="text-sm font-mono font-semibold">{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-border">
            <div>
              {report && (
                <Button variant="ghost" className="text-destructive" onClick={remove}>
                  <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
