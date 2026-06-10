import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Search, LayoutGrid, List, Users } from "lucide-react";
import { ContentEditor } from "@/components/content/ContentEditor";
import { ContentBoard } from "@/components/content/ContentBoard";
import { ContentList } from "@/components/content/ContentList";
import { POST_STATUSES, PLATFORM_OPTIONS } from "@/lib/content";

export default function Content() {
  const { agency } = useUser();
  const [params, setParams] = useSearchParams();
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [view, setView] = useState<"board" | "list">("board");
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reloadKey, setReloadKey] = useState(0);

  const clientId = params.get("client") || "";

  useEffect(() => {
    if (!agency) return;
    supabase.from("clients").select("id,name").eq("agency_id", agency.id).order("name")
      .then(({ data }) => setClients(data || []));
  }, [agency]);

  const selectedClient = clients.find((c) => c.id === clientId);
  const setClient = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === "all") next.delete("client"); else next.set("client", id);
    setParams(next, { replace: true });
  };

  return (
    <div className="p-6 md:p-8 space-y-5 max-w-[1600px]">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Conținut</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedClient ? `Pipeline-ul pentru ${selectedClient.name}.` : "Tot conținutul pentru clienții tăi, într-un singur loc."}
          </p>
        </div>
        <Button onClick={() => setEditorOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Conținut nou
        </Button>
      </div>

      {/* Sticky filter bar */}
      <div className="bg-card rounded-3xl border border-border/60 shadow-soft p-3 md:p-4 flex items-center gap-2 flex-wrap sticky top-2 z-20">
        <div className="flex items-center gap-2 pr-3 border-r border-border">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Select value={clientId || "all"} onValueChange={setClient}>
            <SelectTrigger className="h-10 min-w-[200px] border-0 bg-surface-1 font-semibold">
              <SelectValue placeholder="Toți clienții" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toți clienții</SelectItem>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="relative flex-1 min-w-[180px] max-w-[320px]">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <Input placeholder="Caută după titlu..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="h-10 w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate platformele</SelectItem>
            {PLATFORM_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>

        {view === "list" && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate statusurile</SelectItem>
              {POST_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <div className="ml-auto">
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList className="rounded-full bg-surface-1 h-10 p-1">
              <TabsTrigger value="board" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-soft gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5" /> Board
              </TabsTrigger>
              <TabsTrigger value="list" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-soft gap-1.5">
                <List className="h-3.5 w-3.5" /> Listă
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {view === "board" ? (
        <ContentBoard key={`b-${reloadKey}`} clientId={clientId || null} search={search} platform={platform} showNewButton />
      ) : (
        <ContentList key={`l-${reloadKey}`} clientId={clientId || null} search={search} platform={platform} statusFilter={statusFilter} />
      )}

      <ContentEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        postId={null}
        defaultClientId={clientId || null}
        onSaved={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
