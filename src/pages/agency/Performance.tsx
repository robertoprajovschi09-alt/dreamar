import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { PerformanceStats } from "@/components/performance/PerformanceStats";
import { VideosTable } from "@/components/performance/VideosTable";
import { VideoEditor } from "@/components/performance/VideoEditor";
import { VIDEO_PLATFORMS } from "@/lib/performance";

export default function Performance() {
  const { agency } = useUser();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<any[]>([]);
  const [prevVideos, setPrevVideos] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [rangeDays, setRangeDays] = useState<string>("30");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const range = useMemo(() => {
    const days = Number(rangeDays);
    const end = new Date();
    const start = new Date(); start.setDate(end.getDate() - days);
    const prevEnd = new Date(start); const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - days);
    return { start, end, prevStart, prevEnd };
  }, [rangeDays]);

  const load = async () => {
    if (!agency) return;
    setLoading(true);
    const baseSel = "id,client_id,platform,format,publish_date,video_url,hook,views,reach,likes,comments,shares,saves,calls,dms,completion_rate,recommendation,estimated_sales_impact,clients(name)";
    let q = supabase.from("videos").select(baseSel).eq("agency_id", agency.id)
      .gte("publish_date", range.start.toISOString().slice(0, 10))
      .lte("publish_date", range.end.toISOString().slice(0, 10));
    if (clientFilter !== "all") q = q.eq("client_id", clientFilter);
    if (platformFilter !== "all") q = q.eq("platform", platformFilter);
    const [{ data: v }, { data: pv }, { data: cl }] = await Promise.all([
      q.order("publish_date", { ascending: false }),
      supabase.from("videos").select("views,reach,likes,comments,shares,saves").eq("agency_id", agency.id)
        .gte("publish_date", range.prevStart.toISOString().slice(0, 10))
        .lte("publish_date", range.prevEnd.toISOString().slice(0, 10)),
      supabase.from("clients").select("id,name").eq("agency_id", agency.id).order("name"),
    ]);
    setVideos(v || []); setPrevVideos(pv || []); setClients(cl || []); setLoading(false);
  };
  useEffect(() => { load(); }, [agency, clientFilter, platformFilter, rangeDays]);

  const openEdit = (id: string) => { setEditId(id); setEditorOpen(true); };
  const openNew = () => { setEditId(null); setEditorOpen(true); };

  if (!agency) return null;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Performance</h1>
          <p className="text-sm text-muted-foreground mt-1">Aggregate video metrics across all your clients.</p>
        </div>
        <Button onClick={openNew} className="bg-accent hover:bg-accent/90 text-accent-foreground"><Plus className="h-4 w-4 mr-1.5" /> Add video</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {VIDEO_PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={rangeDays} onValueChange={setRangeDays}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <PerformanceStats videos={videos} prevVideos={prevVideos} />
          <VideosTable videos={videos} onEdit={openEdit} showClient={clientFilter === "all"} />
        </>
      )}

      <VideoEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        agencyId={agency.id}
        videoId={editId}
        clients={clients}
        onSaved={load}
      />
    </div>
  );
}
