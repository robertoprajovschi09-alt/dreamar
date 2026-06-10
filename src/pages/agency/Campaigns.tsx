import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Save, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { CAMPAIGN_STATUSES, statusFor } from "@/lib/operations";

const empty = { name: "", client_id: "", objective: "", status: "planned", start_date: "", end_date: "", budget: "" as string, channels: "", description: "" };

export default function Campaigns() {
  const { agency } = useUser();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const load = async () => {
    if (!agency) return;
    setLoading(true);
    const [{ data: cs }, { data: cl }] = await Promise.all([
      supabase.from("campaigns").select("*, clients(name)").eq("agency_id", agency.id).order("start_date", { ascending: false, nullsFirst: false }),
      supabase.from("clients").select("id,name").eq("agency_id", agency.id).order("name"),
    ]);
    setItems(cs || []); setClients(cl || []); setLoading(false);
  };
  useEffect(() => { load(); }, [agency]);

  const filtered = items.filter((c) => statusFilter === "all" || c.status === statusFilter);

  if (!agency) return null;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Campanii</h1>
          <p className="text-sm text-muted-foreground mt-1">Planifică și urmărește campanii pentru clienții tăi.</p>
        </div>
        <Button onClick={() => { setEditing(null); setEditorOpen(true); }} className="bg-accent hover:bg-accent/90 text-accent-foreground"><Plus className="h-4 w-4 mr-1.5" /> Campanie nouă</Button>
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toate statusurile</SelectItem>
          {CAMPAIGN_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Nicio campanie încă.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((c) => {
            const s = statusFor(CAMPAIGN_STATUSES, c.status);
            return (
              <Card key={c.id} className="cursor-pointer hover:border-accent transition-colors" onClick={() => { setEditing(c); setEditorOpen(true); }}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.clients?.name || "—"}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${s.color}`}>{s.label}</span>
                  </div>
                  {c.objective && <div className="text-sm text-muted-foreground">{c.objective}</div>}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                    {(c.start_date || c.end_date) && (
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />
                        {c.start_date ? new Date(c.start_date).toLocaleDateString() : "—"} → {c.end_date ? new Date(c.end_date).toLocaleDateString() : "—"}
                      </span>
                    )}
                    {c.budget != null && <span>€{Number(c.budget).toLocaleString()}</span>}
                    {c.channels?.length > 0 && <span>{c.channels.join(", ")}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CampaignEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        agencyId={agency.id}
        editing={editing}
        clients={clients}
        onSaved={load}
      />
    </div>
  );
}

function CampaignEditor({ open, onOpenChange, agencyId, editing, clients, onSaved }: any) {
  const [form, setForm] = useState<any>(empty);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        ...empty, ...editing,
        budget: editing.budget ?? "",
        channels: (editing.channels || []).join(", "),
        start_date: editing.start_date || "",
        end_date: editing.end_date || "",
        objective: editing.objective || "",
        description: editing.description || "",
      });
    } else setForm(empty);
  }, [open, editing]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.client_id) return toast.error("Numele și clientul sunt obligatorii");
    setBusy(true);
    const payload: any = {
      agency_id: agencyId,
      client_id: form.client_id,
      name: form.name.trim(),
      objective: form.objective || null,
      status: form.status,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      budget: form.budget === "" ? null : Number(form.budget),
      channels: form.channels ? form.channels.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      description: form.description || null,
    };
    const { error } = editing
      ? await supabase.from("campaigns").update(payload).eq("id", editing.id)
      : await supabase.from("campaigns").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved"); onSaved?.(); onOpenChange(false);
  };
  const remove = async () => {
    if (!editing || !confirm("Delete campaign?")) return;
    const { error } = await supabase.from("campaigns").delete().eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); onSaved?.(); onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>{editing ? "Edit campaign" : "New campaign"}</SheetTitle></SheetHeader>
        <form onSubmit={save} className="space-y-4 mt-4">
          <Field label="Name *"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Client *">
            <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
              <SelectTrigger><SelectValue placeholder="Pick client" /></SelectTrigger>
              <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Objective"><Input value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="e.g. Generate 50 leads" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CAMPAIGN_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Budget (€)"><Input type="number" step="0.01" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date"><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
            <Field label="End date"><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></Field>
          </div>
          <Field label="Channels (comma separated)"><Input value={form.channels} onChange={(e) => setForm({ ...form, channels: e.target.value })} placeholder="instagram, tiktok, ads" /></Field>
          <Field label="Description / brief"><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>

          <div className="flex justify-between pt-4 border-t border-border">
            {editing ? <Button type="button" variant="ghost" className="text-destructive" onClick={remove}><Trash2 className="h-4 w-4 mr-1.5" /> Șterge</Button> : <span />}
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
