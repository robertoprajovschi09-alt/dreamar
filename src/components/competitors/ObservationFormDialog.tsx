import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, X, Upload } from "lucide-react";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import {
  createObservation, updateObservation, uploadScreenshot,
  COMP_PLATFORMS, COMP_CONTENT_TYPES, COMP_PERFORMANCE,
  type CompetitorObservation,
} from "@/lib/competitors";
import { useUser } from "@/contexts/UserContext";

const Schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  platform: z.string().optional(),
  content_type: z.string().optional(),
  content_url: z.string().url().or(z.literal("")).optional(),
  observed_date: z.string().optional(),
  hook: z.string().max(500).optional(),
  caption: z.string().max(3000).optional(),
  offer: z.string().max(500).optional(),
  content_angle: z.string().max(300).optional(),
  estimated_performance: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  agencyId: string;
  clientId: string;
  competitorId: string;
  observation?: CompetitorObservation | null;
  onSaved?: () => void;
};

export function ObservationFormDialog({ open, onOpenChange, agencyId, clientId, competitorId, observation, onSaved }: Props) {
  const { profile } = useUser();
  const [form, setForm] = useState<any>({});
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const base: any = observation
      ? { ...observation }
      : { title: "", platform: "instagram", content_type: "reel", observed_date: new Date().toISOString().slice(0, 10), visible_to_client: false };
    setForm(base);
    setTags(base.tags || []);
    setFile(null);
  }, [open, observation]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const addTag = () => {
    const v = tagInput.trim().toLowerCase();
    if (!v || tags.includes(v)) return;
    setTags([...tags, v]); setTagInput("");
  };

  const onSubmit = async () => {
    const parsed = Schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Invalid form", description: Object.values(parsed.error.flatten().fieldErrors).flat()[0] || "Check fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let screenshot_url = form.screenshot_url || null;
      if (file) {
        screenshot_url = await uploadScreenshot(agencyId, clientId, competitorId, file);
      }
      const payload: any = {
        agency_id: agencyId, client_id: clientId, competitor_id: competitorId,
        title: form.title.trim(),
        platform: form.platform || null,
        content_type: form.content_type || null,
        content_url: form.content_url || null,
        screenshot_url,
        observed_date: form.observed_date || new Date().toISOString().slice(0, 10),
        hook: form.hook || null,
        caption: form.caption || null,
        offer: form.offer || null,
        content_angle: form.content_angle || null,
        estimated_performance: form.estimated_performance || null,
        notes: form.notes || null,
        tags,
        visible_to_client: !!form.visible_to_client,
      };
      if (observation?.id) {
        await updateObservation(observation.id, payload);
        toast({ title: "Observation updated" });
      } else {
        payload.created_by = profile?.id;
        await createObservation(payload);
        toast({ title: "Observation added" });
      }
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{observation ? "Edit observation" : "New observation"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={form.title || ""} onChange={(e) => set("title", e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Platform</Label>
              <Select value={form.platform || ""} onValueChange={(v) => set("platform", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COMP_PLATFORMS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Content type</Label>
              <Select value={form.content_type || ""} onValueChange={(v) => set("content_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COMP_CONTENT_TYPES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={form.observed_date || ""} onChange={(e) => set("observed_date", e.target.value)} /></div>
          </div>
          <div><Label>Content URL</Label><Input value={form.content_url || ""} onChange={(e) => set("content_url", e.target.value)} placeholder="https://" /></div>
          <div>
            <Label>Screenshot</Label>
            <div className="flex items-center gap-2">
              <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              {form.screenshot_url && !file && <span className="text-xs text-muted-foreground">Existing image kept</span>}
              {file && <span className="text-xs text-muted-foreground"><Upload className="h-3 w-3 inline mr-1" />Will replace</span>}
            </div>
          </div>
          <div><Label>Hook</Label><Textarea rows={2} value={form.hook || ""} onChange={(e) => set("hook", e.target.value)} /></div>
          <div><Label>Caption</Label><Textarea rows={2} value={form.caption || ""} onChange={(e) => set("caption", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Offer</Label><Input value={form.offer || ""} onChange={(e) => set("offer", e.target.value)} /></div>
            <div><Label>Content angle</Label><Input value={form.content_angle || ""} onChange={(e) => set("content_angle", e.target.value)} /></div>
          </div>
          <div>
            <Label>Estimated performance</Label>
            <Select value={form.estimated_performance || ""} onValueChange={(v) => set("estimated_performance", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{COMP_PERFORMANCE.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Notes</Label><Textarea rows={2} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} /></div>
          <div>
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="Press Enter to add" />
              <Button type="button" variant="outline" onClick={addTag}>Adaugă</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-2">
                {tags.map((t) => (
                  <span key={t} className="text-xs px-2 py-1 rounded bg-muted flex items-center gap-1">#{t}<button onClick={() => setTags(tags.filter((x) => x !== t))}><X className="h-3 w-3" /></button></span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 pt-2 border-t">
            <Switch checked={!!form.visible_to_client} onCheckedChange={(v) => set("visible_to_client", v)} />
            <div>
              <Label>Visible to client</Label>
              <p className="text-[11px] text-muted-foreground">If on, this observation appears in the client portal under Market Insights.</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Anulează</Button>
          <Button onClick={onSubmit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
