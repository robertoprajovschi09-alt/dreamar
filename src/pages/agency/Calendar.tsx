import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";
import { MonthCalendar, type CalendarItem } from "@/components/content/MonthCalendar";
import { ContentEditor } from "@/components/content/ContentEditor";
import { POST_STATUSES, PLATFORM_OPTIONS } from "@/lib/content";
import { toast } from "sonner";

export default function Calendar() {
  const { agency } = useUser();
  const [month, setMonth] = useState(new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | null>(null);

  const range = useMemo(() => {
    const s = new Date(month.getFullYear(), month.getMonth(), 1);
    const e = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    s.setDate(s.getDate() - 7); e.setDate(e.getDate() + 7);
    return { start: s.toISOString(), end: e.toISOString() };
  }, [month]);

  const load = async () => {
    if (!agency) return;
    setLoading(true);
    const [{ data: posts }, { data: cls }] = await Promise.all([
      supabase.from("content_posts")
        .select("id,title,scheduled_for,status,platform,client_id,clients(name)")
        .eq("agency_id", agency.id)
        .not("scheduled_for", "is", null)
        .gte("scheduled_for", range.start)
        .lte("scheduled_for", range.end)
        .order("scheduled_for"),
      supabase.from("clients").select("id,name").eq("agency_id", agency.id).order("name"),
    ]);
    setClients(cls || []);
    setItems((posts || []).map((p: any) => ({
      id: p.id, title: p.title, scheduled_for: p.scheduled_for, status: p.status,
      platform: p.platform, client_id: p.client_id, client_name: p.clients?.name,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [agency, range.start, range.end]);

  const filtered = items.filter((i) =>
    (filterClient === "all" || i.client_id === filterClient) &&
    (filterPlatform === "all" || i.platform === filterPlatform) &&
    (filterStatus === "all" || i.status === filterStatus)
  );

  const handleDrop = async (id: string, newDate: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const t = new Date(item.scheduled_for);
    const next = new Date(`${newDate}T${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}:00`);
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, scheduled_for: next.toISOString() } : i));
    const { error } = await supabase.from("content_posts").update({ scheduled_for: next.toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); load(); } else toast.success("Replanificat");
  };

  const monthLabel = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="p-6 md:p-8 space-y-4 max-w-[1400px]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">Trage elementele pentru a le replanifica. Clic pe o zi pentru a adăuga conținut.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="px-3 py-1.5 text-sm font-medium min-w-[160px] text-center">{monthLabel}</div>
          <Button variant="outline" size="icon" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setMonth(new Date())}>Astăzi</Button>
          <Button onClick={() => { setEditingId(null); setDefaultDate(null); setEditorOpen(true); }} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Plus className="h-4 w-4 mr-1.5" /> Nou
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toți clienții</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate platformele</SelectItem>
            {PLATFORM_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate statusurile</SelectItem>
            {POST_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <MonthCalendar
          month={month}
          items={filtered}
          onDayClick={(date) => { setEditingId(null); setDefaultDate(date); setEditorOpen(true); }}
          onItemClick={(it) => { setEditingId(it.id); setEditorOpen(true); }}
          onItemDrop={handleDrop}
        />
      )}

      <ContentEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        postId={editingId}
        defaultDate={defaultDate}
        defaultClientId={filterClient !== "all" ? filterClient : null}
        onSaved={load}
      />
    </div>
  );
}
