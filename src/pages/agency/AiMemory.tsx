import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, BookOpen, Database, FileUp } from "lucide-react";
import { toast } from "sonner";
import {
  listMemories, listKnowledgeSources, upsertMemory, setMemoryActive, deleteMemory,
  ingestKnowledgeSource, type AiMemoryItem, type AiKnowledgeSource, type MemoryType, type MemoryVisibility,
} from "@/lib/aiMemory";

const MEMORY_TYPES: MemoryType[] = [
  "agency_preference","client_brand_voice","client_goal","niche_insight","content_pattern",
  "winning_hook","failed_hook","reporting_preference","business_context","audience_insight","competitor_insight",
];
const VISIBILITIES: MemoryVisibility[] = ["internal_agency","client_visible","super_admin_only"];
const SOURCE_TYPES = ["manual","document","report","brief","feedback","analytics","competitor"];

export default function AiMemory() {
  const { agency, profile } = useUser() as any;
  const isAdmin = !!profile?.is_saas_admin;
  const [memories, setMemories] = useState<AiMemoryItem[]>([]);
  const [sources, setSources] = useState<AiKnowledgeSource[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const [filterType, setFilterType] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterVisibility, setFilterVisibility] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);

  const [openMem, setOpenMem] = useState(false);
  const [editing, setEditing] = useState<Partial<AiMemoryItem> | null>(null);

  const [openIngest, setOpenIngest] = useState(false);
  const [ingest, setIngest] = useState({
    source_type: "document", source_id: "", title: "", raw_content: "", client_id: "",
  });

  async function load() {
    if (!agency) return;
    setLoading(true);
    try {
      const [m, s, c] = await Promise.all([
        listMemories(agency.id),
        listKnowledgeSources(agency.id),
        supabase.from("clients").select("id,name").eq("agency_id", agency.id).order("name"),
      ]);
      setMemories(m);
      setSources(s);
      setClients((c.data || []) as any);
    } catch (e: any) {
      toast.error(e.message || "Failed to load");
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [agency?.id]);

  const filtered = useMemo(() => memories.filter(m => {
    if (!showInactive && !m.is_active) return false;
    if (filterType !== "all" && m.memory_type !== filterType) return false;
    if (filterClient !== "all" && (filterClient === "_none" ? m.client_id !== null : m.client_id !== filterClient)) return false;
    if (filterVisibility !== "all" && m.visibility !== filterVisibility) return false;
    return true;
  }), [memories, filterType, filterClient, filterVisibility, showInactive]);

  function startNew() {
    setEditing({
      agency_id: agency!.id,
      memory_type: "agency_preference",
      title: "",
      content: "",
      source_type: "manual",
      source_id: "",
      confidence_score: 0.7,
      visibility: "internal_agency",
      is_active: true,
      client_id: null,
    });
    setOpenMem(true);
  }

  async function save() {
    if (!editing) return;
    if (!editing.title?.trim() || !editing.content?.trim()) { toast.error("Titlul și conținutul sunt obligatorii"); return; }
    if (!editing.source_type?.trim() || !editing.source_id?.trim()) {
      toast.error("Tipul și ID-ul sursei sunt obligatorii (nu salvăm memorie fără sursă)"); return;
    }
    try {
      await upsertMemory(editing as any);
      toast.success("Memorie salvată");
      setOpenMem(false); setEditing(null); load();
    } catch (e: any) { toast.error(e.message || "Save failed"); }
  }

  async function toggleActive(m: AiMemoryItem) {
    try { await setMemoryActive(m.id, !m.is_active); load(); }
    catch (e: any) { toast.error(e.message); }
  }
  async function remove(m: AiMemoryItem) {
    if (!confirm(`Delete memory "${m.title}"?`)) return;
    try { await deleteMemory(m.id); toast.success("Șters"); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  async function runIngest() {
    if (!agency) return;
    if (!ingest.source_id.trim() || !ingest.title.trim() || !ingest.raw_content.trim()) {
      toast.error("Titlul, ID-ul sursei și conținutul sunt obligatorii"); return;
    }
    try {
      const res: any = await ingestKnowledgeSource({
        agency_id: agency.id,
        client_id: ingest.client_id || null,
        source_type: ingest.source_type,
        source_id: ingest.source_id.trim(),
        title: ingest.title.trim(),
        raw_content: ingest.raw_content,
      });
      toast.success(`Am extras ${res?.facts_count ?? 0} fapte → ${res?.proposals_queued ?? 0} propuneri de memorie trimise spre aprobare`);
      setOpenIngest(false);
      setIngest({ source_type: "document", source_id: "", title: "", raw_content: "", client_id: "" });
      load();
    } catch (e: any) { toast.error(e.message || "Ingest failed"); }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Knowledge & Memory"
        subtitle="Curated, source-cited facts the AI uses. No source = no memory."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpenIngest(true)}>
              <FileUp className="h-4 w-4 mr-2" /> Ingest source
            </Button>
            <Button onClick={startNew}><Plus className="h-4 w-4 mr-2" /> New memory</Button>
          </div>
        }
      />

      <Tabs defaultValue="memories">
        <TabsList>
          <TabsTrigger value="memories"><BookOpen className="h-4 w-4 mr-2" />Memories ({memories.length})</TabsTrigger>
          <TabsTrigger value="sources"><Database className="h-4 w-4 mr-2" />Knowledge sources ({sources.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="memories" className="space-y-4">
          <Card>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate tipurile</SelectItem>
                  {MEMORY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger><SelectValue placeholder="Client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toți clienții</SelectItem>
                  <SelectItem value="_none">La nivel de agenție</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterVisibility} onValueChange={setFilterVisibility}>
                <SelectTrigger><SelectValue placeholder="Visibility" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toată vizibilitatea</SelectItem>
                  {VISIBILITIES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={showInactive} onCheckedChange={setShowInactive} />
                Show inactive
              </label>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {loading && <p className="text-sm text-muted-foreground">Se încarcă…</p>}
            {!loading && filtered.length === 0 && (
              <Card><CardContent className="py-10 text-center text-muted-foreground">Nicio memorie nu se potrivește cu filtrele.</CardContent></Card>
            )}
            {filtered.map(m => (
              <Card key={m.id} className={m.is_active ? "" : "opacity-60"}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle className="text-base">{m.title}</CardTitle>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant="secondary">{m.memory_type}</Badge>
                      <Badge variant="outline">{m.visibility}</Badge>
                      <Badge variant="outline">conf {Math.round(m.confidence_score * 100)}%</Badge>
                      <Badge variant="outline">[{m.source_type}:{m.source_id}]</Badge>
                      {m.client_id ? (
                        <Badge>{clients.find(c => c.id === m.client_id)?.name || "client"}</Badge>
                      ) : <Badge variant="secondary">agency-wide</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={m.is_active} onCheckedChange={() => toggleActive(m)} />
                    <Button size="sm" variant="outline" onClick={() => { setEditing(m); setOpenMem(true); }}>Modifică</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(m)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent><p className="text-sm whitespace-pre-wrap">{m.content}</p></CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sources" className="space-y-3">
          {sources.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground">Nicio sursă de cunoștințe importată încă.</CardContent></Card>
          )}
          {sources.map(s => (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{s.title}</CardTitle>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant="outline">[{s.source_type}:{s.source_id}]</Badge>
                      <Badge variant={s.status === "processed" ? "secondary" : "outline"}>{s.status}</Badge>
                      {s.client_id ? <Badge>{clients.find(c => c.id === s.client_id)?.name || "client"}</Badge> : <Badge variant="secondary">agency-wide</Badge>}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {s.content_summary && <p className="text-sm">{s.content_summary}</p>}
                {Array.isArray(s.extracted_facts) && s.extracted_facts.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground">{s.extracted_facts.length} extracted facts</summary>
                    <ul className="mt-2 space-y-1 list-disc pl-5">
                      {s.extracted_facts.map((f: any, i: number) => (
                        <li key={i}><span className="font-medium">{f.title}</span> <span className="text-muted-foreground">({f.memory_type})</span> — {f.content}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Memory edit dialog */}
      <Dialog open={openMem} onOpenChange={(v) => { setOpenMem(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit memory" : "New memory"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Input placeholder="Title" value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              <Textarea rows={5} placeholder="Content (the fact the AI should remember)" value={editing.content || ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Select value={editing.memory_type as string} onValueChange={(v) => setEditing({ ...editing, memory_type: v as MemoryType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MEMORY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={editing.visibility as string} onValueChange={(v) => setEditing({ ...editing, visibility: v as MemoryVisibility })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VISIBILITIES.filter(v => v !== "super_admin_only" || isAdmin).map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={editing.client_id || "_none"} onValueChange={(v) => setEditing({ ...editing, client_id: v === "_none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Scope" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">La nivel de agenție</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" min={0} max={1} step={0.05}
                  value={editing.confidence_score ?? 0.5}
                  onChange={(e) => setEditing({ ...editing, confidence_score: parseFloat(e.target.value) })}
                  placeholder="Confidence (0..1)" />
                <Select value={editing.source_type || "manual"} onValueChange={(v) => setEditing({ ...editing, source_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Source id (e.g. doc UUID, post id, 'manual:why')"
                  value={editing.source_id || ""} onChange={(e) => setEditing({ ...editing, source_id: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenMem(false); setEditing(null); }}>Anulează</Button>
            <Button onClick={save}>Salvează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ingest dialog */}
      <Dialog open={openIngest} onOpenChange={setOpenIngest}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Importă sursă de cunoștințe</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The AI extracts structured facts and queues them as memory proposals — a human approves before they go live.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Select value={ingest.source_type} onValueChange={(v) => setIngest({ ...ingest, source_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["document","report","brief","feedback","analytics","competitor"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={ingest.client_id || "_none"} onValueChange={(v) => setIngest({ ...ingest, client_id: v === "_none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Scope" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">La nivel de agenție</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Source id (uuid / external id)" value={ingest.source_id} onChange={(e) => setIngest({ ...ingest, source_id: e.target.value })} />
            <Input placeholder="Title" value={ingest.title} onChange={(e) => setIngest({ ...ingest, title: e.target.value })} />
            <Textarea rows={8} placeholder="Paste content / brief / feedback / report excerpt"
              value={ingest.raw_content} onChange={(e) => setIngest({ ...ingest, raw_content: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenIngest(false)}>Anulează</Button>
            <Button onClick={runIngest}>Ingest</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
