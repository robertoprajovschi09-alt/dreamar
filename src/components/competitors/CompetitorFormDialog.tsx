import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { createCompetitor, updateCompetitor, type Competitor } from "@/lib/competitors";
import { useUser } from "@/contexts/UserContext";

const url = z.string().url().or(z.literal("")).optional();
const Schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  website: url, instagram_url: url, tiktok_url: url, facebook_url: url, youtube_url: url, linkedin_url: url,
  niche: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  clientId: string;
  competitor?: Competitor | null;
  onSaved?: () => void;
};

export function CompetitorFormDialog({ open, onOpenChange, clientId, competitor, onSaved }: Props) {
  const { agency, profile } = useUser();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(competitor ? { ...competitor } : { name: "" });
  }, [open, competitor]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

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
        agency_id: agency.id, client_id: clientId,
        name: form.name.trim(),
        website: form.website || null,
        instagram_url: form.instagram_url || null,
        tiktok_url: form.tiktok_url || null,
        facebook_url: form.facebook_url || null,
        youtube_url: form.youtube_url || null,
        linkedin_url: form.linkedin_url || null,
        niche: form.niche || null,
        notes: form.notes || null,
      };
      if (competitor?.id) {
        await updateCompetitor(competitor.id, payload);
        toast({ title: "Competitor updated" });
      } else {
        payload.created_by = profile?.id;
        await createCompetitor(payload);
        toast({ title: "Competitor added" });
      }
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{competitor ? "Edit competitor" : "Add competitor"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={form.name || ""} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Niche</Label><Input value={form.niche || ""} onChange={(e) => set("niche", e.target.value)} /></div>
            <div><Label>Website</Label><Input value={form.website || ""} onChange={(e) => set("website", e.target.value)} placeholder="https://" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Instagram</Label><Input value={form.instagram_url || ""} onChange={(e) => set("instagram_url", e.target.value)} placeholder="https://" /></div>
            <div><Label>TikTok</Label><Input value={form.tiktok_url || ""} onChange={(e) => set("tiktok_url", e.target.value)} placeholder="https://" /></div>
            <div><Label>Facebook</Label><Input value={form.facebook_url || ""} onChange={(e) => set("facebook_url", e.target.value)} placeholder="https://" /></div>
            <div><Label>YouTube</Label><Input value={form.youtube_url || ""} onChange={(e) => set("youtube_url", e.target.value)} placeholder="https://" /></div>
            <div className="col-span-2"><Label>LinkedIn</Label><Input value={form.linkedin_url || ""} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="https://" /></div>
          </div>
          <div><Label>Notes</Label><Textarea rows={3} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
