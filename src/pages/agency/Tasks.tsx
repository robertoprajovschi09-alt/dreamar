import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { TaskEditor } from "@/components/operations/TaskEditor";
import { TASK_STATUSES, TASK_PRIORITIES, statusFor } from "@/lib/operations";

export default function Tasks() {
  const { agency } = useUser();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [clientFilter, setClientFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const load = async () => {
    if (!agency) return;
    setLoading(true);
    const [{ data: t }, { data: c }, { data: m }] = await Promise.all([
      supabase.from("tasks").select("*, clients(name)").eq("agency_id", agency.id).order("created_at", { ascending: false }),
      supabase.from("clients").select("id,name").eq("agency_id", agency.id).order("name"),
      supabase.from("agency_members").select("user_id, profiles:user_id(full_name,email)").eq("agency_id", agency.id),
    ]);
    setTasks(t || []); setClients(c || []);
    setMembers((m || []).map((x: any) => ({ user_id: x.user_id, full_name: x.profiles?.full_name, email: x.profiles?.email })));
    setLoading(false);
  };
  useEffect(() => { load(); }, [agency]);

  const filtered = useMemo(() => tasks.filter((t) => {
    if (clientFilter !== "all" && t.client_id !== (clientFilter === "_none" ? null : clientFilter)) return false;
    if (assigneeFilter !== "all" && t.assigned_to !== (assigneeFilter === "_none" ? null : assigneeFilter)) return false;
    return true;
  }), [tasks, clientFilter, assigneeFilter]);

  const moveTask = async (id: string, status: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, status } : t)));
    const { error } = await supabase.from("tasks").update({ status: status as any }).eq("id", id);
    if (error) { toast.error(error.message); load(); }
  };

  const onDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/task");
    if (id) moveTask(id, status);
  };

  if (!agency) return null;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your team's work across all clients.</p>
        </div>
        <Button onClick={() => { setEditId(null); setEditorOpen(true); }} className="bg-accent hover:bg-accent/90 text-accent-foreground"><Plus className="h-4 w-4 mr-1.5" /> New task</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            <SelectItem value="_none">Internal only</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            <SelectItem value="_none">Unassigned</SelectItem>
            {members.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {TASK_STATUSES.map((col) => {
            const items = filtered.filter((t) => t.status === col.value);
            return (
              <div key={col.value} className="space-y-2 min-h-[200px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, col.value)}
              >
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${col.color}`}>{col.label}</span>
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {items.length === 0 && (
                    <div className="text-xs text-muted-foreground border border-dashed border-border rounded-lg p-4 text-center">Drop here</div>
                  )}
                  {items.map((t) => {
                    const pri = statusFor(TASK_PRIORITIES, t.priority);
                    const assignee = members.find((m) => m.user_id === t.assigned_to);
                    return (
                      <Card key={t.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/task", t.id)}
                        onClick={() => { setEditId(t.id); setEditorOpen(true); }}
                        className="cursor-pointer hover:border-accent transition-colors"
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="font-medium text-sm">{t.title}</div>
                          {t.clients?.name && <div className="text-[11px] text-muted-foreground truncate">{t.clients.name}</div>}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${pri.color}`}>{pri.label}</span>
                            {t.task_type && <Badge variant="secondary" className="text-[10px]">{t.task_type}</Badge>}
                          </div>
                          {(t.deadline || assignee) && (
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border">
                              {t.deadline && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(t.deadline).toLocaleDateString()}</span>}
                              {assignee && <span className="flex items-center gap-1 truncate"><User className="h-3 w-3" />{assignee.full_name || assignee.email}</span>}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        agencyId={agency.id}
        taskId={editId}
        clients={clients}
        members={members}
        onSaved={load}
      />
    </div>
  );
}
