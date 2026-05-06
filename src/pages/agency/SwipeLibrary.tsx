import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Search, LayoutGrid, List, BookmarkPlus, Lock } from "lucide-react";
import { SwipeCard } from "@/components/swipe/SwipeCard";
import { SwipeFormDialog } from "@/components/swipe/SwipeFormDialog";
import { SwipeDetailDialog } from "@/components/swipe/SwipeDetailDialog";
import { UseInCalendarDialog } from "@/components/swipe/UseInCalendarDialog";
import { listSwipes, deleteSwipe, SWIPE_TYPES, SWIPE_PLATFORMS, type SwipeFile } from "@/lib/swipe";
import { toast } from "@/hooks/use-toast";

export default function SwipeLibrary() {
  const { agency } = useUser();
  const [swipes, setSwipes] = useState<SwipeFile[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [client, setClient] = useState("all");
  const [niche, setNiche] = useState("all");
  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState<"recent" | "most_used" | "performance">("recent");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SwipeFile | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [active, setActive] = useState<SwipeFile | null>(null);
  const [calOpen, setCalOpen] = useState(false);

  const enabled = (plan as any)?.swipe_file ?? true;

  const load = async () => {
    if (!agency) return;
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        listSwipes(agency.id),
        supabase.from("clients").select("id,name").eq("agency_id", agency.id).order("name"),
      ]);
      setSwipes(s);
      setClients(c.data || []);
    } catch (e: any) {
      toast({ title: "Failed to load", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [agency]);

  const niches = useMemo(() => Array.from(new Set(swipes.map((s) => s.niche).filter(Boolean) as string[])), [swipes]);
  const allTags = useMemo(() => Array.from(new Set(swipes.flatMap((s) => s.tags || []))), [swipes]);

  const filtered = useMemo(() => {
    let arr = swipes.filter((s) =>
      (type === "all" || s.type === type) &&
      (platform === "all" || s.platform === platform) &&
      (client === "all" || s.client_id === client || (client === "none" && !s.client_id)) &&
      (niche === "all" || s.niche === niche) &&
      (tag === "all" || (s.tags || []).includes(tag)) &&
      (!q || (s.title + " " + (s.hook || "") + " " + (s.script || "") + " " + (s.caption || "")).toLowerCase().includes(q.toLowerCase()))
    );
    if (sort === "recent") arr = arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    else if (sort === "most_used") arr = arr.sort((a, b) => b.usage_count - a.usage_count);
    else if (sort === "performance") arr = arr.sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0));
    return arr;
  }, [swipes, type, platform, client, niche, tag, q, sort]);

  const onDelete = async (id: string) => {
    if (!confirm("Delete this swipe?")) return;
    try { await deleteSwipe(id); toast({ title: "Deleted" }); load(); }
    catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  if (!enabled) {
    return (
      <div className="p-6 md:p-8 max-w-3xl">
        <Card className="p-8 text-center">
          <Lock className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Swipe File is a premium feature</h2>
          <p className="text-sm text-muted-foreground mt-1">Upgrade your plan to build a reusable library of hooks, scripts and ideas.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-4 max-w-[1400px]">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookmarkPlus className="h-6 w-6 text-accent" /> Swipe File
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Save winning ideas, hooks and scripts. Reuse and adapt them across clients with AI.</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plus className="h-4 w-4 mr-1.5" /> New swipe
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 h-9" />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {SWIPE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {SWIPE_PLATFORMS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={client} onValueChange={setClient}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            <SelectItem value="none">Unassigned</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {niches.length > 0 && (
          <Select value={niche} onValueChange={setNiche}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All niches</SelectItem>
              {niches.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {allTags.length > 0 && (
          <Select value={tag} onValueChange={setTag}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {allTags.map((t) => <SelectItem key={t} value={t}>#{t}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={sort} onValueChange={(v) => setSort(v as any)}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most recent</SelectItem>
            <SelectItem value="most_used">Most used</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex">
          <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" className="h-9 w-9" onClick={() => setView("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" className="h-9 w-9" onClick={() => setView("list")}><List className="h-4 w-4" /></Button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <BookmarkPlus className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No swipes yet. Save your first winning idea.</p>
          <Button className="mt-3" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Create swipe</Button>
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => (
            <SwipeCard
              key={s.id}
              swipe={s}
              onView={() => { setActive(s); setDetailOpen(true); }}
              onEdit={() => { setEditing(s); setFormOpen(true); }}
              onDelete={() => onDelete(s.id)}
              onUseInCalendar={() => { setActive(s); setCalOpen(true); }}
              onGenerateVariations={() => { setActive(s); setDetailOpen(true); }}
            />
          ))}
        </div>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Platform</th>
                <th className="text-left px-4 py-3 font-medium">Niche</th>
                <th className="text-left px-4 py-3 font-medium">Used</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => { setActive(s); setDetailOpen(true); }}>
                  <td className="px-4 py-3 font-medium">{s.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.type}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{s.platform || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.niche || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.usage_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <SwipeFormDialog open={formOpen} onOpenChange={setFormOpen} swipe={editing} onSaved={load} />
      <SwipeDetailDialog open={detailOpen} onOpenChange={setDetailOpen} swipe={active} onUseInCalendar={(s) => { setActive(s); setDetailOpen(false); setCalOpen(true); }} onChanged={load} />
      <UseInCalendarDialog open={calOpen} onOpenChange={setCalOpen} swipe={active} />
    </div>
  );
}
