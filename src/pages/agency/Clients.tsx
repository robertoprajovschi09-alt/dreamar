import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Loader2, Users, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { NICHES, STATUSES, displayNiche } from "@/lib/niches";
import { AddClientWizard } from "@/components/client/AddClientWizard";
import { QuickAddClientDialog } from "@/components/client/QuickAddClientDialog";
import { fetchCollectingClientIds } from "@/lib/clientStatus";
import { CollectingDataBadge } from "@/components/health/CollectingDataBadge";
import { DeleteClientDialog } from "@/components/client/DeleteClientDialog";

type Client = {
  id: string; name: string; niche: string; custom_niche: string | null; niche_id: string | null; city: string | null;
  website: string | null; status: string; created_at: string;
};

const emptyForm = { name: "", niche: "custom", city: "", website: "", status: "active" };

export default function Clients() {
  const { agency } = useUser();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [collecting, setCollecting] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false); // edit dialog
  const [wizardOpen, setWizardOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);

  const load = async () => {
    if (!agency) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("id,name,niche,custom_niche,niche_id,city,website,status,created_at")
      .eq("agency_id", agency.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setClients((data || []) as Client[]);
    try { setCollecting(await fetchCollectingClientIds(agency.id)); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [agency]);

  const openCreate = () => { setWizardOpen(true); };
  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({ name: c.name, niche: c.niche, city: c.city || "", website: c.website || "", status: c.status });
    setOpen(true);
  };


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agency || !form.name.trim()) return;
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      niche: form.niche as any,
      city: form.city.trim() || null,
      website: form.website.trim() || null,
      status: form.status as any,
    };
    const { error } = editing
      ? await supabase.from("clients").update({ ...payload, niche_id: editing.niche_id }).eq("id", editing.id)
      : await supabase.from("clients").insert({ ...payload, agency_id: agency.id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Client actualizat" : "Client creat");
    setOpen(false);
    load();
  };

  const handleDelete = async (c: Client) => {
    if (!confirm(`Ștergi "${c.name}"? Această acțiune nu poate fi anulată.`)) return;
    const { error } = await supabase.from("clients").delete().eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Client șters");
    load();
  };


  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Clienți</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestionează toți clienții din {agency?.name}.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setQuickAddOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Plus className="h-4 w-4 mr-1.5" /> Adaugă client
          </Button>
        </div>
        {agency && (
          <>
            <QuickAddClientDialog
              open={quickAddOpen}
              onOpenChange={setQuickAddOpen}
              agencyId={agency.id}
              onCreated={() => load()}
              onOpenManual={() => setWizardOpen(true)}
            />
            <AddClientWizard
              open={wizardOpen}
              onOpenChange={setWizardOpen}
              agencyId={agency.id}
              onCreated={() => load()}
            />
          </>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editează client</DialogTitle></DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nume client *</Label>
                <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nișă</Label>
                  <Select value={form.niche} onValueChange={(v) => setForm({ ...form, niche: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NICHES.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">Oraș</Label>
                <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="website">Website</Label>
                <Input id="website" type="url" placeholder="https://" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Anulează</Button>
                <Button type="submit" disabled={busy} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvează"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold">Niciun client încă</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Adaugă primul tău client ca să începi.</p>
            <Button onClick={openCreate} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Plus className="h-4 w-4 mr-1.5" /> Adaugă client
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Nume</th>
                  <th className="text-left px-4 py-3 font-medium">Nișă</th>
                  <th className="text-left px-4 py-3 font-medium">Oraș</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <Link to={`/agency/clients/${c.id}`} className="hover:underline">{c.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{displayNiche(c.niche, c.custom_niche)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.city || "—"}</td>
                    <td className="px-4 py-3">{collecting.has(c.id) ? <CollectingDataBadge /> : <span className="text-xs uppercase tracking-wide">{c.status}</span>}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/agency/clients/${c.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="h-3.5 w-3.5" /></Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(c)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
