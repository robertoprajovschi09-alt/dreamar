import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Building2, UtensilsCrossed, Stethoscope, Dumbbell, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { MetricCard } from "@/components/MetricCard";
import { fmtNum, fmtEur } from "@/lib/format";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];

const NICHE_TABLES: Record<string, { table: any; fields: { key: string; label: string; type?: string; metric?: boolean }[] }> = {
  real_estate: {
    table: "niche_real_estate_properties",
    fields: [
      { key: "title", label: "Property title" }, { key: "property_type", label: "Type" },
      { key: "price", label: "Price (€)", type: "number", metric: true }, { key: "area_sqm", label: "Area (sqm)", type: "number" },
      { key: "views", label: "Views", type: "number", metric: true }, { key: "messages", label: "Messages", type: "number", metric: true },
      { key: "viewings_booked", label: "Viewings", type: "number", metric: true }, { key: "offers_received", label: "Offers", type: "number", metric: true },
      { key: "cost_per_lead", label: "Cost per lead (€)", type: "number" },
    ],
  },
  restaurant: {
    table: "niche_restaurant_items",
    fields: [
      { key: "name", label: "Item / Promotion" }, { key: "category", label: "Category" },
      { key: "reservations", label: "Reservations", type: "number", metric: true }, { key: "orders", label: "Orders", type: "number", metric: true },
      { key: "foot_traffic", label: "Foot traffic", type: "number", metric: true }, { key: "events", label: "Events", type: "number" },
      { key: "buying_intent_comments", label: "Intent comments", type: "number" },
      { key: "estimated_sales_impact", label: "Sales impact (€)", type: "number" },
    ],
  },
  dental: {
    table: "niche_dental_treatments",
    fields: [
      { key: "treatment", label: "Treatment" },
      { key: "qualified_leads", label: "Qualified leads", type: "number", metric: true },
      { key: "appointments_booked", label: "Appointments", type: "number", metric: true },
      { key: "patients_arrived", label: "Patients arrived", type: "number", metric: true },
      { key: "treatment_interest", label: "Interest", type: "number" },
      { key: "cost_per_appointment", label: "Cost per appt (€)", type: "number" },
      { key: "conversion_status", label: "Conversion status" },
    ],
  },
  fitness: {
    table: "niche_fitness_offerings",
    fields: [
      { key: "name", label: "Offering" }, { key: "offering_type", label: "Type" },
      { key: "memberships_sold", label: "Memberships sold", type: "number", metric: true },
      { key: "trial_sessions", label: "Trial sessions", type: "number", metric: true },
      { key: "classes_promoted", label: "Classes promoted", type: "number" },
      { key: "transformations", label: "Transformations", type: "number" },
      { key: "messages_received", label: "Messages", type: "number", metric: true },
      { key: "new_members_influenced", label: "New members from content", type: "number", metric: true },
    ],
  },
  custom: {
    table: "niche_custom_metrics",
    fields: [
      { key: "label", label: "Metric label" },
      { key: "value", label: "Value", type: "number", metric: true },
      { key: "unit", label: "Unit" },
      { key: "notes", label: "Notes" },
    ],
  },
};

const NICHE_ICONS: Record<string, any> = { real_estate: Building2, restaurant: UtensilsCrossed, dental: Stethoscope, fitness: Dumbbell, custom: Sparkles };

export function NicheDashboard({ client }: { client: Client }) {
  const cfg = NICHE_TABLES[client.niche] || NICHE_TABLES.custom;
  const Icon = NICHE_ICONS[client.niche] || Sparkles;
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from(cfg.table) as any).select("*").eq("client_id", client.id).order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); setForm({}); /* eslint-disable-next-line */ }, [client.id, client.niche]);

  const save = async () => {
    const payload: any = { client_id: client.id, agency_id: client.agency_id };
    cfg.fields.forEach((f) => {
      const v = form[f.key];
      if (v !== undefined && v !== "") payload[f.key] = f.type === "number" ? Number(v) : v;
    });
    const { error } = await (supabase.from(cfg.table) as any).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Added");
    setOpen(false); setForm({}); load();
  };

  const metricFields = cfg.fields.filter((f) => f.metric);
  const totals = metricFields.map((f) => ({
    ...f,
    total: rows.reduce((s, r) => s + Number(r[f.key] || 0), 0),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-accent" />
          <h2 className="font-semibold capitalize">{client.niche.replace("_", " ")} dashboard</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground"><Plus className="h-4 w-4 mr-2" /> Add entry</Button></DialogTrigger>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New entry</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              {cfg.fields.map((f) => (
                <div key={f.key} className={["notes","objectives","brand_voice"].includes(f.key) ? "col-span-2 space-y-1.5" : "space-y-1.5"}>
                  <Label className="text-xs">{f.label}</Label>
                  <Input type={f.type === "number" ? "number" : "text"} value={form[f.key] || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                </div>
              ))}
            </div>
            <DialogFooter><Button onClick={save} className="bg-accent hover:bg-accent/90 text-accent-foreground">Add</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {totals.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {totals.map((t) => (
            <MetricCard key={t.key} label={t.label} value={t.label.includes("€") ? fmtEur(t.total) : fmtNum(t.total)} />
          ))}
        </div>
      )}

      {loading ? <div className="text-sm text-muted-foreground">Loading…</div>
        : rows.length === 0 ? <EmptyState icon={Icon} title="No entries yet" description={`Add ${client.niche.replace("_", " ")} data to start tracking metrics.`} />
        : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>{cfg.fields.map((f) => <th key={f.key} className="text-left px-3 py-2 font-medium">{f.label}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-surface-1">
                    {cfg.fields.map((f) => (
                      <td key={f.key} className="px-3 py-2">{f.type === "number" ? (f.label.includes("€") ? fmtEur(r[f.key]) : fmtNum(r[f.key])) : (r[f.key] || "—")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
