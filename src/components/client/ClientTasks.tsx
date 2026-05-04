import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { Plus, ListChecks } from "lucide-react";
import { fmtDateShort } from "@/lib/format";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];

const STATUSES = ["todo","in_progress","blocked","done"] as const;
const PRIORITIES = ["low","medium","high","urgent"] as const;

export function ClientTasks({ client }: { client: Client }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ title: "", priority: "medium", status: "todo", deadline: "", task_type: "content", description: "" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("tasks").select("*").eq("client_id", client.id).order("deadline", { ascending: true, nullsFirst: false });
    setTasks(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, [client.id]);

  const save = async () => {
    const { error } = await supabase.from("tasks").insert({
      agency_id: client.agency_id, client_id: client.id, created_by: user?.id,
      title: form.title, description: form.description || null,
      task_type: form.task_type, status: form.status, priority: form.priority,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Task added"); setOpen(false);
    setForm({ title: "", priority: "medium", status: "todo", deadline: "", task_type: "content", description: "" });
    load();
  };

  const updateStatus = async (id: string, status: any) => {
    await supabase.from("tasks").update({ status }).eq("id", id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Tasks</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground"><Plus className="h-4 w-4 mr-2" /> New task</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
            <div className="grid gap-3 grid-cols-2">
              <div className="col-span-2 space-y-1.5"><Label className="text-xs">Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Type</Label><Input value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Deadline</Label><Input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5"><Label className="text-xs">Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={save} disabled={!form.title} className="bg-accent hover:bg-accent/90 text-accent-foreground">Add</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Loading…</div>
        : tasks.length === 0 ? <EmptyState icon={ListChecks} title="No tasks" description="Create tasks to track work for this client." />
        : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className="rounded-lg border border-border bg-card p-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.task_type} · {t.deadline ? `Due ${fmtDateShort(t.deadline)}` : "No deadline"}</div>
                </div>
                <Badge variant="outline" className={t.priority === "urgent" || t.priority === "high" ? "border-accent/40 text-accent" : ""}>{t.priority}</Badge>
                <Select value={t.status} onValueChange={(v) => updateStatus(t.id, v)}>
                  <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
