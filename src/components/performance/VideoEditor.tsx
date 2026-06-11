import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, Trash2 } from "lucide-react";
import { VIDEO_PLATFORMS, VIDEO_FORMATS, VIDEO_OBJECTIVES, RECOMMENDATIONS } from "@/lib/performance";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agencyId: string;
  clientId?: string | null;
  videoId?: string | null;
  clients?: { id: string; name: string }[];
  onSaved?: () => void;
}

const empty = {
  client_id: "",
  platform: "instagram",
  format: "Reel",
  objective: "Engagement",
  publish_date: "",
  video_url: "",
  hook: "",
  body_angle: "",
  cta: "",
  duration_seconds: "" as string,
  views: "" as string,
  reach: "" as string,
  likes: "" as string,
  comments: "" as string,
  shares: "" as string,
  saves: "" as string,
  watch_time_seconds: "" as string,
  retention_3s: "" as string,
  retention_50pct: "" as string,
  completion_rate: "" as string,
  calls: "" as string,
  dms: "" as string,
  estimated_sales_impact: "" as string,
  recommendation: "" as string,
  ai_insight: "",
  client_feedback: "",
};

export function VideoEditor({ open, onOpenChange, agencyId, clientId, videoId, clients, onSaved }: Props) {
  const [form, setForm] = useState<any>({ ...empty, client_id: clientId || "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (videoId) {
      (async () => {
        const { data } = await supabase.from("videos").select("*").eq("id", videoId).maybeSingle();
        if (data) {
          setForm({
            ...empty,
            ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? ""])),
            client_id: data.client_id,
          });
        }
      })();
    } else {
      setForm({ ...empty, client_id: clientId || "" });
    }
  }, [open, videoId, clientId]);

  const num = (v: any) => (v === "" || v == null ? null : Number(v));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_id) return toast.error("Alege un client");
    setBusy(true);
    const payload: any = {
      agency_id: agencyId,
      client_id: form.client_id,
      platform: form.platform || null,
      format: form.format || null,
      objective: form.objective || null,
      publish_date: form.publish_date || null,
      video_url: form.video_url || null,
      hook: form.hook || null,
      body_angle: form.body_angle || null,
      cta: form.cta || null,
      duration_seconds: num(form.duration_seconds),
      views: num(form.views) ?? 0,
      reach: num(form.reach) ?? 0,
      likes: num(form.likes) ?? 0,
      comments: num(form.comments) ?? 0,
      shares: num(form.shares) ?? 0,
      saves: num(form.saves) ?? 0,
      watch_time_seconds: num(form.watch_time_seconds) ?? 0,
      retention_3s: num(form.retention_3s),
      retention_50pct: num(form.retention_50pct),
      completion_rate: num(form.completion_rate),
      calls: num(form.calls) ?? 0,
      dms: num(form.dms) ?? 0,
      estimated_sales_impact: num(form.estimated_sales_impact),
      recommendation: form.recommendation || null,
      ai_insight: form.ai_insight || null,
      client_feedback: form.client_feedback || null,
    };
    const { error } = videoId
      ? await supabase.from("videos").update(payload).eq("id", videoId)
      : await supabase.from("videos").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Salvat");
    onSaved?.();
    onOpenChange(false);
  };

  const remove = async () => {
    if (!videoId || !confirm("Delete this video?")) return;
    const { error } = await supabase.from("videos").delete().eq("id", videoId);
    if (error) return toast.error(error.message);
    toast.success("Șters");
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader><SheetTitle>{videoId ? "Edit video" : "Add video"}</SheetTitle></SheetHeader>
        <form onSubmit={save} className="space-y-4 mt-4">
          {clients && clients.length > 0 && (
            <Field label="Client *">
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pick client" /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          )}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Platform">
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VIDEO_PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Format">
              <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VIDEO_FORMATS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Obiectiv">
              <Select value={form.objective} onValueChange={(v) => setForm({ ...form, objective: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VIDEO_OBJECTIVES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Publish date"><Input type="date" value={form.publish_date} onChange={(e) => setForm({ ...form, publish_date: e.target.value })} /></Field>
            <Field label="Duration (sec)"><Input type="number" value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: e.target.value })} /></Field>
          </div>
          <Field label="Video URL"><Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://..." /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Hook"><Input value={form.hook} onChange={(e) => setForm({ ...form, hook: e.target.value })} /></Field>
            <Field label="Body angle"><Input value={form.body_angle} onChange={(e) => setForm({ ...form, body_angle: e.target.value })} /></Field>
            <Field label="CTA"><Input value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} /></Field>
          </div>

          <div className="text-xs uppercase tracking-wide text-muted-foreground pt-2 border-t border-border">Metrici de acoperire</div>
          <div className="grid grid-cols-4 gap-3">
            <Field label="Views"><Input type="number" value={form.views} onChange={(e) => setForm({ ...form, views: e.target.value })} /></Field>
            <Field label="Reach"><Input type="number" value={form.reach} onChange={(e) => setForm({ ...form, reach: e.target.value })} /></Field>
            <Field label="Watch time (s)"><Input type="number" value={form.watch_time_seconds} onChange={(e) => setForm({ ...form, watch_time_seconds: e.target.value })} /></Field>
            <Field label="Completion %"><Input type="number" step="0.1" value={form.completion_rate} onChange={(e) => setForm({ ...form, completion_rate: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Field label="Likes"><Input type="number" value={form.likes} onChange={(e) => setForm({ ...form, likes: e.target.value })} /></Field>
            <Field label="Comments"><Input type="number" value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} /></Field>
            <Field label="Shares"><Input type="number" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} /></Field>
            <Field label="Saves"><Input type="number" value={form.saves} onChange={(e) => setForm({ ...form, saves: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Retention 3s %"><Input type="number" step="0.1" value={form.retention_3s} onChange={(e) => setForm({ ...form, retention_3s: e.target.value })} /></Field>
            <Field label="Retention 50% %"><Input type="number" step="0.1" value={form.retention_50pct} onChange={(e) => setForm({ ...form, retention_50pct: e.target.value })} /></Field>
          </div>

          <div className="text-xs uppercase tracking-wide text-muted-foreground pt-2 border-t border-border">Impact business</div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Calls"><Input type="number" value={form.calls} onChange={(e) => setForm({ ...form, calls: e.target.value })} /></Field>
            <Field label="DMs"><Input type="number" value={form.dms} onChange={(e) => setForm({ ...form, dms: e.target.value })} /></Field>
            <Field label="Sales impact (€)"><Input type="number" step="0.01" value={form.estimated_sales_impact} onChange={(e) => setForm({ ...form, estimated_sales_impact: e.target.value })} /></Field>
          </div>

          <Field label="Recommendation">
            <Select value={form.recommendation || "_none"} onValueChange={(v) => setForm({ ...form, recommendation: v === "_none" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">—</SelectItem>
                {RECOMMENDATIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="AI / internal insight"><Textarea rows={2} value={form.ai_insight} onChange={(e) => setForm({ ...form, ai_insight: e.target.value })} /></Field>
          <Field label="Client feedback"><Textarea rows={2} value={form.client_feedback} onChange={(e) => setForm({ ...form, client_feedback: e.target.value })} /></Field>

          <div className="flex justify-between pt-4 border-t border-border">
            {videoId ? (
              <Button type="button" variant="ghost" className="text-destructive" onClick={remove}><Trash2 className="h-4 w-4 mr-1.5" /> Șterge</Button>
            ) : <span />}
            <Button type="submit" disabled={busy} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Salvează</>}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
