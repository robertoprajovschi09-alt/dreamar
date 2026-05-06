import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Search } from "lucide-react";
import { ContentEditor } from "@/components/content/ContentEditor";
import { POST_STATUSES, PLATFORM_OPTIONS, statusMeta } from "@/lib/content";
import { SaveToSwipeButton } from "@/components/swipe/SaveToSwipeButton";
import { cn } from "@/lib/utils";

export default function Content() {
  const { agency } = useUser();
  const [rows, setRows] = useState<any[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterClient, setFilterClient] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [q, setQ] = useState("");

  const load = async () => {
    if (!agency) return;
    setLoading(true);
    const [{ data: posts }, { data: cls }] = await Promise.all([
      supabase.from("content_posts")
        .select("id,title,platform,status,scheduled_for,content_type,client_id,hook,script,caption,clients(name)")
        .eq("agency_id", agency.id)
        .order("scheduled_for", { ascending: false, nullsFirst: false }),
      supabase.from("clients").select("id,name").eq("agency_id", agency.id).order("name"),
    ]);
    setRows(posts || []); setClients(cls || []); setLoading(false);
  };

  useEffect(() => { load(); }, [agency]);

  const filtered = rows.filter((r) =>
    (filterClient === "all" || r.client_id === filterClient) &&
    (filterPlatform === "all" || r.platform === filterPlatform) &&
    (filterStatus === "all" || r.status === filterStatus) &&
    (!q || r.title.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="p-6 md:p-8 space-y-4 max-w-[1400px]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Content</h1>
          <p className="text-sm text-muted-foreground mt-1">All scheduled and draft content across your clients.</p>
        </div>
        <Button onClick={() => { setEditingId(null); setEditorOpen(true); }} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plus className="h-4 w-4 mr-1.5" /> New content
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input placeholder="Search title..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 h-9" />
        </div>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {PLATFORM_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {POST_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No content matches your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Title</th>
                  <th className="text-left px-4 py-3 font-medium">Client</th>
                  <th className="text-left px-4 py-3 font-medium">Platform</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Scheduled</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => {
                  const m = statusMeta(r.status);
                  return (
                    <tr key={r.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => { setEditingId(r.id); setEditorOpen(true); }}>
                      <td className="px-4 py-3 font-medium">{r.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.clients?.name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.platform || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.content_type || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.scheduled_for ? new Date(r.scheduled_for).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3"><span className={cn("inline-block px-2 py-0.5 rounded text-[11px] font-medium", m.color)}>{m.label}</span></td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <SaveToSwipeButton defaults={{
                          title: r.title,
                          type: "video_idea",
                          platform: r.platform || undefined,
                          client_id: r.client_id || null,
                          hook: r.hook || null,
                          script: r.script || null,
                          caption: r.caption || null,
                          content_format: r.content_type || null,
                          source_post_id: r.id,
                        }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ContentEditor open={editorOpen} onOpenChange={setEditorOpen} postId={editingId} onSaved={load} />
    </div>
  );
}
