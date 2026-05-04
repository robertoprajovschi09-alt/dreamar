import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAgency } from "@/contexts/AgencyContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Users, Search, Building2 } from "lucide-react";
import { fmtEur, fmtDate, initials } from "@/lib/format";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];
type Niche = Database["public"]["Enums"]["niche"];

const NICHES: { value: Niche; label: string }[] = [
  { value: "real_estate", label: "Real Estate" },
  { value: "restaurant", label: "Restaurant" },
  { value: "lounge", label: "Lounge" },
  { value: "dental", label: "Dental Clinic" },
  { value: "fitness", label: "Fitness Gym" },
  { value: "local_store", label: "Local Store" },
  { value: "beauty", label: "Beauty" },
  { value: "auto", label: "Auto" },
  { value: "hotel", label: "Hotel" },
  { value: "custom", label: "Custom" },
];

export default function Clients() {
  const { currentAgency, plan } = useAgency();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // form
  const [form, setForm] = useState({
    name: "", niche: "custom" as Niche, city: "", website: "", contact_person: "", contact_email: "",
    contact_phone: "", monthly_retainer: "", objectives: "", brand_voice: "", platforms: "", notes: "",
  });

  const load = async () => {
    if (!currentAgency) return;
    setLoading(true);
    const { data } = await supabase.from("clients").select("*").eq("agency_id", currentAgency.id).order("created_at", { ascending: false });
    setClients(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [currentAgency]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAgency) return;
    const { error } = await supabase.from("clients").insert({
      agency_id: currentAgency.id,
      name: form.name,
      niche: form.niche,
      city: form.city || null,
      website: form.website || null,
      contact_person: form.contact_person || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      monthly_retainer: form.monthly_retainer ? Number(form.monthly_retainer) : null,
      objectives: form.objectives || null,
      brand_voice: form.brand_voice || null,
      notes: form.notes || null,
      platforms: form.platforms ? form.platforms.split(",").map((s) => s.trim()).filter(Boolean) : [],
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Client created");
    setOpen(false);
    setForm({ name: "", niche: "custom", city: "", website: "", contact_person: "", contact_email: "", contact_phone: "", monthly_retainer: "", objectives: "", brand_voice: "", platforms: "", notes: "" });
    load();
  };

  const filtered = clients.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.city?.toLowerCase().includes(search.toLowerCase()),
  );

  const atLimit = plan?.max_clients !== null && plan?.max_clients !== undefined && clients.length >= (plan.max_clients || 0);

  return (
    <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-7xl">
      <PageHeader
        title="Clients"
        subtitle={`${clients.length}${plan?.max_clients ? ` / ${plan.max_clients}` : ""} ${plan?.max_clients ? "on your plan" : "(unlimited)"}`}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={atLimit}>
                <Plus className="h-4 w-4 mr-2" /> {atLimit ? "Plan limit reached" : "Add Client"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add a new client</DialogTitle>
                <DialogDescription>You can edit any field later from the client page.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <Field label="Client name *" full><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="Niche *">
                  <Select value={form.niche} onValueChange={(v) => setForm({ ...form, niche: v as Niche })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{NICHES.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
                <Field label="Website"><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" /></Field>
                <Field label="Monthly retainer (€)"><Input type="number" value={form.monthly_retainer} onChange={(e) => setForm({ ...form, monthly_retainer: e.target.value })} /></Field>
                <Field label="Contact person"><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></Field>
                <Field label="Contact email"><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></Field>
                <Field label="Contact phone"><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></Field>
                <Field label="Platforms (comma-separated)" full><Input value={form.platforms} onChange={(e) => setForm({ ...form, platforms: e.target.value })} placeholder="Instagram, TikTok, YouTube" /></Field>
                <Field label="Objectives" full><Textarea rows={2} value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} placeholder="What is the client trying to achieve?" /></Field>
                <Field label="Brand voice" full><Textarea rows={2} value={form.brand_voice} onChange={(e) => setForm({ ...form, brand_voice: e.target.value })} placeholder="Tone, style, do's and don'ts" /></Field>
                <Field label="Notes" full><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
                <DialogFooter className="md:col-span-2">
                  <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">Create client</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients…" className="pl-9" />
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Loading…</div>
        : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No clients yet"
            description="Add your first client to start tracking content, videos, and business impact."
            action={<Button onClick={() => setOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground"><Plus className="h-4 w-4 mr-2" /> Add Client</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((c) => (
              <Link key={c.id} to={`/app/clients/${c.id}`} className="group rounded-lg border border-border bg-card p-5 hover:border-accent/40 hover:shadow-glow transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-md bg-accent/10 text-accent font-bold flex items-center justify-center">{initials(c.name)}</div>
                  <Badge variant="outline" className="text-[10px] uppercase capitalize">{c.niche.replace("_", " ")}</Badge>
                </div>
                <div className="font-semibold group-hover:text-accent">{c.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Building2 className="h-3 w-3" /> {c.city || "No city"}</div>
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-border">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Retainer</div>
                    <div className="text-sm font-semibold metric-number">{fmtEur(Number(c.monthly_retainer))}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Started</div>
                    <div className="text-sm font-semibold">{c.start_date ? fmtDate(c.start_date) : fmtDate(c.created_at)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
