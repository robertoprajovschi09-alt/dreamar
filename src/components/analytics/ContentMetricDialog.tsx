import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { upsertContentMetric, listContentMetrics, PLATFORMS, PLATFORM_LABEL } from "@/lib/analytics";

type Props = {
  open: boolean; onOpenChange: (v: boolean) => void;
  agencyId: string; clientId: string; contentItemId: string;
  defaultPlatform?: string;
  onSaved?: () => void;
};

const fields = [
  ["views","Views"],["reach","Reach"],["impressions","Impressions"],
  ["likes","Likes"],["comments","Comments"],["shares","Shares"],["saves","Saves"],
  ["watch_time","Watch time (s)"],["average_view_duration","Avg view (s)"],
  ["retention_rate","Retention %"],["hook_rate","Hook %"],["completion_rate","Completion %"],
  ["followers_gained","Followers gained"],
  ["leads","Leads"],["sales","Sales"],["bookings","Bookings"],["revenue","Revenue"],
] as const;

export function ContentMetricDialog({ open, onOpenChange, agencyId, clientId, contentItemId, defaultPlatform, onSaved }: Props) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const existing = await listContentMetrics({ contentItemId });
      const match = existing.find((m) => (m.platform || "") === (defaultPlatform || existing[0]?.platform || ""));
      const e: any = match || {};
      setForm({
        id: e.id, platform: e.platform || defaultPlatform || "instagram", notes: e.notes || "",
        ...Object.fromEntries(fields.map(([k]) => [k, e?.[k] ?? ""])),
      });
    })();
  }, [open, contentItemId, defaultPlatform]);

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = { agency_id: agencyId, client_id: clientId, content_item_id: contentItemId, platform: form.platform, notes: form.notes || null, source: "manual" };
      for (const [k] of fields) { const v = form[k]; payload[k] = v === "" || v == null ? null : Number(v); }
      if (form.id) payload.id = form.id;
      await upsertContentMetric(payload);
      toast.success("Indicatori salvați");
      onSaved?.(); onOpenChange(false);
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Content metrics</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Platform</Label>
            <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p} value={p}>{PLATFORM_LABEL[p]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {fields.map(([k, label]) => (
              <div key={k}><Label className="text-xs">{label}</Label>
                <Input type="number" step="any" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </div>
            ))}
          </div>
          <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Anulează</Button>
          <Button onClick={save} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
