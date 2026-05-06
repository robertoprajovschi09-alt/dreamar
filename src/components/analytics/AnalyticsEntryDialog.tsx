import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { upsertAnalyticsEntry, PLATFORMS, PLATFORM_LABEL, type AnalyticsEntry } from "@/lib/analytics";

type Props = {
  open: boolean; onOpenChange: (v: boolean) => void;
  agencyId: string; clientId: string;
  defaultMonth?: number; defaultYear?: number; defaultPlatform?: string;
  initial?: Partial<AnalyticsEntry>;
  onSaved?: () => void;
};

const numFields = [
  ["views","Views"],["reach","Reach"],["impressions","Impressions"],
  ["likes","Likes"],["comments","Comments"],["shares","Shares"],["saves","Saves"],
  ["engagement_rate","Engagement rate %"],
  ["followers_start","Followers start"],["followers_end","Followers end"],["followers_gained","Followers gained"],
  ["profile_visits","Profile visits"],["website_clicks","Website clicks"],
  ["messages","Messages"],["calls","Calls"],
  ["leads","Leads"],["bookings","Bookings"],["sales","Sales"],["revenue","Revenue"],
  ["ad_spend","Ad spend"],["roas","ROAS"],["cost_per_lead","CPL"],["cost_per_purchase","CPP"],
] as const;

export function AnalyticsEntryDialog({ open, onOpenChange, agencyId, clientId, defaultMonth, defaultYear, defaultPlatform, initial, onSaved }: Props) {
  const now = new Date();
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (!open) return;
    setForm({
      platform: initial?.platform || defaultPlatform || "instagram",
      month: initial?.month || defaultMonth || now.getMonth() + 1,
      year: initial?.year || defaultYear || now.getFullYear(),
      period_type: initial?.period_type || "month",
      date_start: initial?.date_start || "",
      date_end: initial?.date_end || "",
      notes: initial?.notes || "",
      ...Object.fromEntries(numFields.map(([k]) => [k, (initial as any)?.[k] ?? ""])),
      id: initial?.id,
    });
  }, [open, initial, defaultMonth, defaultYear, defaultPlatform]);

  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = { agency_id: agencyId, client_id: clientId, source: "manual" };
      payload.platform = form.platform; payload.period_type = form.period_type;
      payload.month = Number(form.month) || null; payload.year = Number(form.year) || null;
      payload.date_start = form.date_start || null; payload.date_end = form.date_end || null;
      payload.notes = form.notes || null;
      for (const [k] of numFields) {
        const v = form[k];
        payload[k] = v === "" || v == null ? null : Number(v);
      }
      if (form.id) payload.id = form.id;
      await upsertAnalyticsEntry(payload);
      toast.success("Saved");
      onSaved?.(); onOpenChange(false);
    } catch (e: any) { toast.error(e.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{form.id ? "Edit" : "Add"} analytics entry</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><Label>Platform</Label>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p} value={p}>{PLATFORM_LABEL[p]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Period</Label>
              <Select value={form.period_type} onValueChange={(v) => setForm({ ...form, period_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Month</Label><Input type="number" min={1} max={12} value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></div>
            <div><Label>Year</Label><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div>
            <div><Label>Date start</Label><Input type="date" value={form.date_start} onChange={(e) => setForm({ ...form, date_start: e.target.value })} /></div>
            <div><Label>Date end</Label><Input type="date" value={form.date_end} onChange={(e) => setForm({ ...form, date_end: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {numFields.map(([k, label]) => (
              <div key={k}><Label className="text-xs">{label}</Label>
                <Input type="number" step="any" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </div>
            ))}
          </div>
          <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">{saving ? "Saving..." : "Save entry"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
