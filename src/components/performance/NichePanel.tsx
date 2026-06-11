import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fmtNum, sumField } from "@/lib/performance";

type Schema = {
  table: string;
  title: string;
  nameField: string; // primary text field key
  namePlaceholder: string;
  numericFields: { key: string; label: string }[];
};

const SCHEMAS: Record<string, Schema> = {
  real_estate: {
    table: "niche_real_estate_properties",
    title: "Properties tracked",
    nameField: "title",
    namePlaceholder: "Property title",
    numericFields: [
      { key: "price", label: "Price" },
      { key: "views", label: "Views" },
      { key: "messages", label: "Messages" },
      { key: "viewings_booked", label: "Viewings" },
      { key: "offers_received", label: "Offers" },
    ],
  },
  restaurant: {
    table: "niche_restaurant_items",
    title: "Menu items / promos",
    nameField: "name",
    namePlaceholder: "Dish or promo",
    numericFields: [
      { key: "reservations", label: "Reservations" },
      { key: "orders", label: "Orders" },
      { key: "foot_traffic", label: "Foot traffic" },
      { key: "events", label: "Events" },
      { key: "estimated_sales_impact", label: "Sales €" },
    ],
  },
  dental: {
    table: "niche_dental_treatments",
    title: "Treatments promoted",
    nameField: "treatment",
    namePlaceholder: "Treatment name",
    numericFields: [
      { key: "qualified_leads", label: "Leads" },
      { key: "appointments_booked", label: "Bookings" },
      { key: "patients_arrived", label: "Arrived" },
      { key: "treatment_interest", label: "Interest" },
      { key: "cost_per_appointment", label: "CPA €" },
    ],
  },
  fitness: {
    table: "niche_fitness_offerings",
    title: "Offerings & classes",
    nameField: "name",
    namePlaceholder: "Class / package",
    numericFields: [
      { key: "trial_sessions", label: "Trials" },
      { key: "memberships_sold", label: "Memberships" },
      { key: "messages_received", label: "Messages" },
      { key: "new_members_influenced", label: "New members" },
      { key: "transformations", label: "Transformations" },
    ],
  },
};

export function NichePanel({ niche, agencyId, clientId }: { niche: string; agencyId: string; clientId: string }) {
  const schema = SCHEMAS[niche];
  if (!schema) return <CustomMetricsPanel agencyId={agencyId} clientId={clientId} />;
  return <NicheTable schema={schema} agencyId={agencyId} clientId={clientId} />;
}

function NicheTable({ schema, agencyId, clientId }: { schema: Schema; agencyId: string; clientId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<any>({ [schema.nameField]: "" });

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from(schema.table).select("*").eq("client_id", clientId).order("created_at", { ascending: false });
    setRows(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, [clientId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form[schema.nameField]?.trim()) return;
    const payload: any = { agency_id: agencyId, client_id: clientId, [schema.nameField]: form[schema.nameField].trim() };
    schema.numericFields.forEach((f) => { if (form[f.key] !== "" && form[f.key] != null) payload[f.key] = Number(form[f.key]); });
    const { error } = await (supabase as any).from(schema.table).insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Adăugat"); setForm({ [schema.nameField]: "" }); setAdding(false); load();
  };
  const updateCell = async (id: string, key: string, value: any) => {
    const v = value === "" ? null : Number(value);
    const { error } = await (supabase as any).from(schema.table).update({ [key]: v }).eq("id", id);
    if (error) toast.error(error.message);
  };
  const remove = async (id: string) => {
    if (!confirm("Delete entry?")) return;
    const { error } = await (supabase as any).from(schema.table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{schema.title}</h3>
        {!adding && <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Adaugă</Button>}
      </div>
      {adding && (
        <Card><CardContent className="pt-4">
          <form onSubmit={create} className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Name *</Label>
              <Input required placeholder={schema.namePlaceholder} value={form[schema.nameField] || ""} onChange={(e) => setForm({ ...form, [schema.nameField]: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {schema.numericFields.map((f) => (
                <div key={f.key} className="space-y-1"><Label className="text-[10px] text-muted-foreground">{f.label}</Label>
                  <Input type="number" step="0.01" value={form[f.key] || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">Salvează</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setAdding(false)}>Anulează</Button>
            </div>
          </form>
        </CardContent></Card>
      )}

      {rows.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nicio intrare încă.</CardContent></Card>
      ) : (
        <>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
            {schema.numericFields.map((f) => (
              <Card key={f.key}><CardContent className="pt-3">
                <div className="text-[10px] uppercase text-muted-foreground">{f.label}</div>
                <div className="text-xl font-bold font-mono mt-0.5">{fmtNum(sumField(rows, f.key as any))}</div>
              </CardContent></Card>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left p-2.5">Name</th>
                  {schema.numericFields.map((f) => <th key={f.key} className="text-right p-2.5">{f.label}</th>)}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-2.5 font-medium">{r[schema.nameField]}</td>
                    {schema.numericFields.map((f) => (
                      <td key={f.key} className="p-1">
                        <Input className="h-8 text-right font-mono text-xs" type="number" step="0.01" defaultValue={r[f.key] ?? ""} onBlur={(e) => updateCell(r.id, f.key, e.target.value)} />
                      </td>
                    ))}
                    <td className="p-2.5 text-right">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function CustomMetricsPanel({ agencyId, clientId }: { agencyId: string; clientId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ label: "", value: "", unit: "", notes: "" });
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("niche_custom_metrics").select("*").eq("client_id", clientId).order("recorded_at", { ascending: false });
    setRows(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, [clientId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim()) return;
    const { error } = await supabase.from("niche_custom_metrics").insert({
      agency_id: agencyId, client_id: clientId,
      label: form.label.trim(),
      value: form.value === "" ? null : Number(form.value),
      unit: form.unit || null,
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Adăugat"); setForm({ label: "", value: "", unit: "", notes: "" }); setAdding(false); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("niche_custom_metrics").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };
  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">Custom KPIs</h3>
        {!adding && <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Adaugă KPI</Button>}
      </div>
      {adding && (
        <Card><CardContent className="pt-4">
          <form onSubmit={create} className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1"><Label className="text-xs">Label *</Label><Input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Value</Label><Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="€, %, ..." /></div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">Salvează</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setAdding(false)}>Anulează</Button>
            </div>
          </form>
        </CardContent></Card>
      )}
      {rows.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No custom KPIs yet.</CardContent></Card>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-lg">
          {rows.map((r) => (
            <li key={r.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{r.label}</div>
                <div className="text-xs text-muted-foreground">{r.recorded_at ? new Date(r.recorded_at).toLocaleDateString() : ""}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="font-mono text-base">{r.value ?? "—"} <span className="text-xs text-muted-foreground">{r.unit}</span></div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
