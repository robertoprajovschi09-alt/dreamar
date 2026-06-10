import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, X } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import {
  SWIPE_TYPES, SWIPE_PLATFORMS, SWIPE_VISIBILITY,
  createSwipe, updateSwipe, type SwipeFile, type SwipeType, type SwipeVisibility,
} from "@/lib/swipe";
import { supabase } from "@/integrations/supabase/client";

const Schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  type: z.string().min(1),
  platform: z.string().optional(),
  niche: z.string().optional(),
  hook: z.string().max(500).optional(),
  script: z.string().max(5000).optional(),
  caption: z.string().max(3000).optional(),
  content_angle: z.string().max(300).optional(),
  content_format: z.string().max(150).optional(),
  performance_notes: z.string().max(1000).optional(),
  source_url: z.string().url().or(z.literal("")).optional(),
  visibility: z.string().min(1),
  client_id: z.string().nullable().optional(),
});

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  swipe?: SwipeFile | null;
  defaults?: Partial<SwipeFile>;
  onSaved?: () => void;
};

export function SwipeFormDialog({ open, onOpenChange, swipe, defaults, onSaved }: Props) {
  const { agency, profile } = useUser();
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<any>({});
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!agency || !open) return;
    supabase.from("clients").select("id,name").eq("agency_id", agency.id).order("name")
      .then(({ data }) => setClients(data || []));
  }, [agency, open]);

  useEffect(() => {
    if (!open) return;
    const base: any = swipe
      ? { ...swipe }
      : { type: "hook", visibility: "agency_internal", platform: "instagram", ...defaults };
    setForm(base);
    setTags(base.tags || []);
  }, [open, swipe, defaults]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const addTag = () => {
    const v = tagInput.trim().toLowerCase();
    if (!v || tags.includes(v)) return;
    setTags([...tags, v]); setTagInput("");
  };

  const onSubmit = async () => {
    if (!agency) return;
    const parsed = Schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Invalid form", description: Object.values(parsed.error.flatten().fieldErrors).flat()[0] || "Check fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        agency_id: agency.id,
        client_id: form.client_id || null,
        niche: form.niche || null,
        title: form.title.trim(),
        type: form.type as SwipeType,
        platform: form.platform || null,
        hook: form.hook || null,
        script: form.script || null,
        caption: form.caption || null,
        content_angle: form.content_angle || null,
        content_format: form.content_format || null,
        performance_notes: form.performance_notes || null,
        source_url: form.source_url || null,
        visibility: form.visibility as SwipeVisibility,
        tags,
      };
      if (swipe?.id) {
        await updateSwipe(swipe.id, payload);
        toast({ title: "Swipe updated" });
      } else {
        payload.created_by = profile?.id;
        await createSwipe(payload);
        toast({ title: "Swipe saved" });
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
        <DialogHeader>
          <DialogTitle>{swipe ? "Edit swipe" : "New swipe"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={form.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="e.g. 3 mistakes that cost you sales" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SWIPE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Platform</Label>
              <Select value={form.platform || ""} onValueChange={(v) => set("platform", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{SWIPE_PLATFORMS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Niche (optional)</Label>
              <Input value={form.niche || ""} onChange={(e) => set("niche", e.target.value)} placeholder="real estate, restaurant…" />
            </div>
            <div>
              <Label>Client (optional)</Label>
              <Select value={form.client_id || "none"} onValueChange={(v) => set("client_id", v === "none" ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Hook</Label>
            <Textarea rows={2} value={form.hook || ""} onChange={(e) => set("hook", e.target.value)} placeholder="The opening line that stops the scroll." />
          </div>
          <div>
            <Label>Script</Label>
            <Textarea rows={4} value={form.script || ""} onChange={(e) => set("script", e.target.value)} />
          </div>
          <div>
            <Label>Caption</Label>
            <Textarea rows={2} value={form.caption || ""} onChange={(e) => set("caption", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Content angle</Label>
              <Input value={form.content_angle || ""} onChange={(e) => set("content_angle", e.target.value)} placeholder="pain → solution" />
            </div>
            <div>
              <Label>Format</Label>
              <Input value={form.content_format || ""} onChange={(e) => set("content_format", e.target.value)} placeholder="reel, carousel, ugc…" />
            </div>
          </div>
          <div>
            <Label>Performance notes</Label>
            <Textarea rows={2} value={form.performance_notes || ""} onChange={(e) => set("performance_notes", e.target.value)} placeholder="What metric/result told you it worked?" />
          </div>
          <div>
            <Label>Source URL</Label>
            <Input value={form.source_url || ""} onChange={(e) => set("source_url", e.target.value)} placeholder="https://…" />
          </div>
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
          <div>
            <Label>Visibility</Label>
            <Select value={form.visibility} onValueChange={(v) => set("visibility", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SWIPE_VISIBILITY.filter((v) => v.value !== "global_template" || profile?.is_saas_admin).map((v) => (
                  <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">{SWIPE_VISIBILITY.find((v) => v.value === form.visibility)?.description}</p>
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
