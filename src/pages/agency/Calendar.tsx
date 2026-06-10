import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";
import { MonthCalendar, type CalendarItem } from "@/components/content/MonthCalendar";
import { WeekCalendar } from "@/components/content/WeekCalendar";
import { UpcomingList } from "@/components/content/UpcomingList";
import { ContentEditor } from "@/components/content/ContentEditor";
import { QuickAddPopover } from "@/components/content/QuickAddPopover";
import { POST_STATUSES, PLATFORM_OPTIONS } from "@/lib/content";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

type View = "month" | "week" | "list";

export default function Calendar() {
  const { agency } = useUser();
  const [params, setParams] = useSearchParams();
  const isMobile = useIsMobile();
  const viewParam = (params.get("view") as View) || "month";
  const view: View = isMobile ? "list" : viewParam;
  const setView = (v: View) => { params.set("view", v); setParams(params, { replace: true }); };

  const [cursor, setCursor] = useState(new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | null>(null);

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickDate, setQuickDate] = useState<string | null>(null);
  const [quickAnchor, setQuickAnchor] = useState<{ x: number; y: number } | null>(null);

  const range = useMemo(() => {
    if (view === "list") {
      const s = new Date(); s.setHours(0, 0, 0, 0);
      const e = new Date(s); e.setDate(s.getDate() + 60);
      return { start: s.toISOString(), end: e.toISOString() };
    }
    if (view === "week") {
      const s = new Date(cursor);
      const day = (s.getDay() + 6) % 7;
      s.setDate(s.getDate() - day - 1); s.setHours(0, 0, 0, 0);
      const e = new Date(s); e.setDate(s.getDate() + 9);
      return { start: s.toISOString(), end: e.toISOString() };
    }
    const s = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const e = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    s.setDate(s.getDate() - 7); e.setDate(e.getDate() + 7);
    return { start: s.toISOString(), end: e.toISOString() };
  }, [cursor, view]);

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

  const handleDayClick = (date: string, anchor: { x: number; y: number }) => {
    setQuickDate(date); setQuickAnchor(anchor); setQuickOpen(true);
  };

  const openItem = (it: CalendarItem) => {
    setEditingId(it.id); setDefaultDate(null); setEditorOpen(true);
  };

  const label = useMemo(() => {
    if (view === "list") return "Următoarele 60 de zile";
    if (view === "week") {
      const s = new Date(cursor);
      const day = (s.getDay() + 6) % 7;
      s.setDate(s.getDate() - day);
      const e = new Date(s); e.setDate(s.getDate() + 6);
      return `${s.toLocaleDateString(undefined, { day: "2-digit", month: "short" })} – ${e.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}`;
    }
    return cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }, [cursor, view]);

  const shift = (dir: -1 | 1) => {
    if (view === "list") return;
    if (view === "week") {
      const d = new Date(cursor); d.setDate(d.getDate() + 7 * dir); setCursor(d);
    } else {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-4 max-w-[1400px]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">Trage elementele pentru a le replanifica. Clic pe o zi pentru a adăuga rapid.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as View)} size="sm" variant="outline" className="hidden md:flex">
            <ToggleGroupItem value="month" className="text-xs">Lună</ToggleGroupItem>
            <ToggleGroupItem value="week" className="text-xs">Săptămână</ToggleGroupItem>
            <ToggleGroupItem value="list" className="text-xs">Listă</ToggleGroupItem>
          </ToggleGroup>
          {view !== "list" && (
            <>
              <Button variant="outline" size="icon" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <div className="px-3 py-1.5 text-sm font-medium min-w-[180px] text-center">{label}</div>
              <Button variant="outline" size="icon" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Astăzi</Button>
            </>
          )}
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
      ) : view === "month" ? (
        <MonthCalendar
          month={cursor}
          items={filtered}
          onDayClick={handleDayClick}
          onItemClick={openItem}
          onItemDrop={handleDrop}
        />
      ) : view === "week" ? (
        <WeekCalendar
          cursor={cursor}
          items={filtered}
          onDayClick={handleDayClick}
          onItemClick={openItem}
          onItemDrop={handleDrop}
        />
      ) : (
        <UpcomingList items={filtered} onItemClick={openItem} />
      )}

      <QuickAddPopover
        open={quickOpen}
        onOpenChange={setQuickOpen}
        anchor={quickAnchor}
        date={quickDate}
        clients={clients}
        defaultClientId={filterClient !== "all" ? filterClient : null}
        onCreated={load}
        onOpenFull={({ date }) => {
          setQuickOpen(false);
          setEditingId(null);
          setDefaultDate(date);
          setEditorOpen(true);
        }}
      />

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
