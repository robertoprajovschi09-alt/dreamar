import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Video } from "lucide-react";
import { fmtNum, fmtDate } from "@/lib/format";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];

const FIELDS = [
  ["platform","Platform"],["publish_date","Publish date","date"],["video_url","URL"],
  ["hook","Hook"],["body_angle","Body angle"],["cta","CTA"],["format","Format"],
  ["duration_seconds","Duration (s)","number"],["objective","Objective"],
  ["views","Views","number"],["reach","Reach","number"],["watch_time_seconds","Watch time (s)","number"],
  ["retention_3s","3s retention %","number"],["retention_50pct","50% retention %","number"],["completion_rate","Completion %","number"],
  ["likes","Likes","number"],["comments","Comments","number"],["shares","Shares","number"],["saves","Saves","number"],
  ["dms","DMs","number"],["calls","Calls","number"],["estimated_sales_impact","Sales impact (€)","number"],
  ["client_feedback","Client feedback","textarea"],["ai_insight","AI insight","textarea"],
] as const;

export function ClientVideos({ client }: { client: Client }) {
  const [videos, setVideos] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("videos").select("*").eq("client_id", client.id).order("publish_date", { ascending: false, nullsFirst: false });
    setVideos(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, [client.id]);

  const save = async () => {
    const payload: any = { agency_id: client.agency_id, client_id: client.id };
    FIELDS.forEach(([key, , type]) => {
      const v = form[key];
      if (v !== undefined && v !== "") payload[key] = type === "number" ? Number(v) : v;
    });
    const { error } = await supabase.from("videos").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Video added"); setOpen(false); setForm({}); load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Video Performance</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground"><Plus className="h-4 w-4 mr-2" /> Add video</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New video entry</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {FIELDS.map(([key, label, type]) => (
                <div key={key} className={type === "textarea" ? "col-span-2 md:col-span-3 space-y-1.5" : "space-y-1.5"}>
                  <Label className="text-xs">{label}</Label>
                  {type === "textarea"
                    ? <Textarea rows={2} value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                    : <Input type={type || "text"} value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />}
                </div>
              ))}
            </div>
            <DialogFooter><Button onClick={save} className="bg-accent hover:bg-accent/90 text-accent-foreground">Add</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Loading…</div>
        : videos.length === 0 ? <EmptyState icon={Video} title="No videos tracked" description="Log your first video to start measuring real performance." />
        : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Date</th>
                  <th className="text-left px-3 py-2 font-medium">Hook</th>
                  <th className="text-left px-3 py-2 font-medium">Platform</th>
                  <th className="text-right px-3 py-2 font-medium">Views</th>
                  <th className="text-right px-3 py-2 font-medium">Likes</th>
                  <th className="text-right px-3 py-2 font-medium">DMs</th>
                  <th className="text-right px-3 py-2 font-medium">Completion</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((v) => (
                  <tr key={v.id} className="border-t border-border hover:bg-surface-1">
                    <td className="px-3 py-2 whitespace-nowrap">{v.publish_date ? fmtDate(v.publish_date) : "—"}</td>
                    <td className="px-3 py-2 max-w-[280px] truncate" title={v.hook || ""}>{v.hook || "—"}</td>
                    <td className="px-3 py-2">{v.platform || "—"}</td>
                    <td className="px-3 py-2 text-right metric-number">{fmtNum(v.views)}</td>
                    <td className="px-3 py-2 text-right metric-number">{fmtNum(v.likes)}</td>
                    <td className="px-3 py-2 text-right metric-number">{fmtNum(v.dms)}</td>
                    <td className="px-3 py-2 text-right metric-number">{v.completion_rate ? `${v.completion_rate}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
