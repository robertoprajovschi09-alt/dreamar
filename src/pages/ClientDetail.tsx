import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Globe, Mail, Phone, Building2 } from "lucide-react";
import { fmtEur, initials } from "@/lib/format";
import { toast } from "sonner";
import { NicheDashboard } from "@/components/niches/NicheDashboard";
import { ClientCalendar } from "@/components/client/ClientCalendar";
import { ClientVideos } from "@/components/client/ClientVideos";
import { ClientImpact } from "@/components/client/ClientImpact";
import { ClientDocuments } from "@/components/client/ClientDocuments";
import { ClientTasks } from "@/components/client/ClientTasks";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];

export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    const { data } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
    setClient(data as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="container mx-auto px-6 py-8 text-sm text-muted-foreground">Loading…</div>;
  if (!client) return <div className="container mx-auto px-6 py-8">Client not found.</div>;

  return (
    <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-7xl">
      <Link to="/app/clients" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"><ArrowLeft className="h-3 w-3" /> All clients</Link>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-lg bg-accent/10 text-accent font-bold text-xl flex items-center justify-center">{initials(client.name)}</div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
              <Badge variant="outline" className="text-[10px] uppercase capitalize">{client.niche.replace("_", " ")}</Badge>
              {client.city && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {client.city}</span>}
              {client.website && <a href={client.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-accent"><Globe className="h-3 w-3" /> Website</a>}
              {client.contact_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {client.contact_email}</span>}
              {client.contact_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {client.contact_phone}</span>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Monthly retainer</div>
          <div className="text-2xl font-bold metric-number">{fmtEur(Number(client.monthly_retainer))}</div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4 flex flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="niche">Niche Dashboard</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="impact">Business Impact</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><Overview client={client} /></TabsContent>
        <TabsContent value="niche"><NicheDashboard client={client} /></TabsContent>
        <TabsContent value="calendar"><ClientCalendar client={client} /></TabsContent>
        <TabsContent value="videos"><ClientVideos client={client} /></TabsContent>
        <TabsContent value="impact"><ClientImpact client={client} /></TabsContent>
        <TabsContent value="documents"><ClientDocuments client={client} /></TabsContent>
        <TabsContent value="tasks"><ClientTasks client={client} /></TabsContent>
        <TabsContent value="settings"><Settings client={client} onSaved={load} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Overview({ client }: { client: Client }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Section title="Objectives">{client.objectives || <em className="text-muted-foreground">None set yet.</em>}</Section>
      <Section title="Brand voice">{client.brand_voice || <em className="text-muted-foreground">None set yet.</em>}</Section>
      <Section title="Platforms">
        {client.platforms?.length ? <div className="flex flex-wrap gap-2">{client.platforms.map((p) => <Badge key={p} variant="secondary">{p}</Badge>)}</div> : <em className="text-muted-foreground">None.</em>}
      </Section>
      <Section title="Notes">{client.notes || <em className="text-muted-foreground">No notes.</em>}</Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">{title}</div>
      <div className="text-sm whitespace-pre-wrap">{children}</div>
    </div>
  );
}

function Settings({ client, onSaved }: { client: Client; onSaved: () => void }) {
  const [f, setF] = useState({
    name: client.name, city: client.city || "", website: client.website || "",
    contact_person: client.contact_person || "", contact_email: client.contact_email || "", contact_phone: client.contact_phone || "",
    monthly_retainer: client.monthly_retainer?.toString() || "",
    status: client.status, objectives: client.objectives || "", brand_voice: client.brand_voice || "",
    platforms: client.platforms?.join(", ") || "", notes: client.notes || "",
    health_score: client.health_score?.toString() || "75",
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("clients").update({
      name: f.name, city: f.city || null, website: f.website || null,
      contact_person: f.contact_person || null, contact_email: f.contact_email || null, contact_phone: f.contact_phone || null,
      monthly_retainer: f.monthly_retainer ? Number(f.monthly_retainer) : null,
      status: f.status, objectives: f.objectives || null, brand_voice: f.brand_voice || null,
      platforms: f.platforms.split(",").map((s) => s.trim()).filter(Boolean),
      notes: f.notes || null, health_score: Number(f.health_score) || 75,
    }).eq("id", client.id);
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Saved"); onSaved(); }
  };

  const remove = async () => {
    if (!confirm(`Delete ${client.name}? This removes all related data.`)) return;
    const { error } = await supabase.from("clients").delete().eq("id", client.id);
    if (error) toast.error(error.message); else { toast.success("Client deleted"); window.location.href = "/app/clients"; }
  };

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 max-w-3xl">
      <F label="Name *"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></F>
      <F label="Status">
        <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as any })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="churned">Churned</SelectItem>
          </SelectContent>
        </Select>
      </F>
      <F label="City"><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></F>
      <F label="Website"><Input value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></F>
      <F label="Monthly retainer (€)"><Input type="number" value={f.monthly_retainer} onChange={(e) => setF({ ...f, monthly_retainer: e.target.value })} /></F>
      <F label="Health score (0-100)"><Input type="number" min={0} max={100} value={f.health_score} onChange={(e) => setF({ ...f, health_score: e.target.value })} /></F>
      <F label="Contact person"><Input value={f.contact_person} onChange={(e) => setF({ ...f, contact_person: e.target.value })} /></F>
      <F label="Contact email"><Input value={f.contact_email} onChange={(e) => setF({ ...f, contact_email: e.target.value })} /></F>
      <F label="Contact phone"><Input value={f.contact_phone} onChange={(e) => setF({ ...f, contact_phone: e.target.value })} /></F>
      <F label="Platforms (comma)"><Input value={f.platforms} onChange={(e) => setF({ ...f, platforms: e.target.value })} /></F>
      <F label="Objectives" full><Textarea rows={3} value={f.objectives} onChange={(e) => setF({ ...f, objectives: e.target.value })} /></F>
      <F label="Brand voice" full><Textarea rows={3} value={f.brand_voice} onChange={(e) => setF({ ...f, brand_voice: e.target.value })} /></F>
      <F label="Notes" full><Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></F>
      <div className="md:col-span-2 flex justify-between">
        <Button variant="outline" className="text-accent border-accent/40" onClick={remove}>Delete client</Button>
        <Button onClick={save} disabled={busy} className="bg-accent hover:bg-accent/90 text-accent-foreground"><Save className="h-4 w-4 mr-2" /> Save changes</Button>
      </div>
    </div>
  );
}

function F({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <div className={full ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}><Label className="text-xs">{label}</Label>{children}</div>;
}
