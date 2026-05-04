import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Calendar } from "lucide-react";
import { fmtDateShort } from "@/lib/format";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];
type PostStatus = Database["public"]["Enums"]["post_status"];

const STATUSES: PostStatus[] = ["idea","script","filming","editing","sent_for_approval","approved","scheduled","published","analyzed"];
const STATUS_COLOR: Record<string, string> = {
  idea: "bg-muted", script: "bg-info/20 text-info", filming: "bg-info/20 text-info",
  editing: "bg-warning/20 text-warning", sent_for_approval: "bg-warning/20 text-warning",
  approved: "bg-success/20 text-success", scheduled: "bg-accent/20 text-accent",
  published: "bg-success/30 text-success", analyzed: "bg-secondary",
};

export function ClientCalendar({ client }: { client: Client }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", platform: "Instagram", status: "idea" as PostStatus, scheduled_for: "", script: "", caption: "" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("content_posts").select("*").eq("client_id", client.id).order("scheduled_for", { ascending: true, nullsFirst: false });
    setPosts(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, [client.id]);

  const save = async () => {
    const { error } = await supabase.from("content_posts").insert({
      agency_id: client.agency_id, client_id: client.id,
      title: form.title, platform: form.platform || null, status: form.status,
      scheduled_for: form.scheduled_for ? new Date(form.scheduled_for).toISOString() : null,
      script: form.script || null, caption: form.caption || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Post added"); setOpen(false);
    setForm({ title: "", platform: "Instagram", status: "idea", scheduled_for: "", script: "", caption: "" });
    load();
  };

  const updateStatus = async (id: string, status: PostStatus) => {
    await supabase.from("content_posts").update({ status }).eq("id", id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Content Calendar</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground"><Plus className="h-4 w-4 mr-2" /> New post</Button></DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>New content post</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5"><Label className="text-xs">Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Platform</Label><Input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as PostStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5"><Label className="text-xs">Scheduled for</Label><Input type="datetime-local" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} /></div>
              <div className="col-span-2 space-y-1.5"><Label className="text-xs">Script</Label><Textarea rows={3} value={form.script} onChange={(e) => setForm({ ...form, script: e.target.value })} /></div>
              <div className="col-span-2 space-y-1.5"><Label className="text-xs">Caption</Label><Textarea rows={2} value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={save} disabled={!form.title} className="bg-accent hover:bg-accent/90 text-accent-foreground">Add post</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Loading…</div>
        : posts.length === 0 ? <EmptyState icon={Calendar} title="No posts planned" description="Plan your first post to start building this client's calendar." />
        : (
          <div className="space-y-2">
            {posts.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-card p-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.title}</div>
                  <div className="text-xs text-muted-foreground">{p.platform || "—"} · {p.scheduled_for ? fmtDateShort(p.scheduled_for) : "Unscheduled"}</div>
                </div>
                <Select value={p.status} onValueChange={(v) => updateStatus(p.id, v as PostStatus)}>
                  <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
                <Badge className={STATUS_COLOR[p.status]} variant="outline">{p.status.replace(/_/g," ")}</Badge>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
