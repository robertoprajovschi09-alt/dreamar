import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Plus, AlertCircle, Calendar as CalIcon } from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import { TaskEditor } from "@/components/operations/TaskEditor";
import { QuickAddTaskInput } from "@/components/operations/QuickAddTaskInput";
import { QuickEditTaskSheet } from "@/components/operations/QuickEditTaskSheet";
import { TASK_STATUSES, TASK_PRIORITIES, statusFor } from "@/lib/operations";
import { fetchAgencyMembers } from "@/lib/members";
import { ErrorState } from "@/components/ui/error-state";

const PRIORITY_BAR: Record<string, string> = {
  low: "bg-muted-foreground/40",
  medium: "bg-blue-500",
  high: "bg-amber-500",
  urgent: "bg-rose-500",
};

function initials(name?: string | null, email?: string | null) {
  const s = (name || email || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || s[0].toUpperCase();
}

export default function Tasks() {
  const { agency, profile } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [clientFilter, setClientFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [mineOnly, setMineOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickTaskId, setQuickTaskId] = useState<string | null>(null);

  const load = async () => {
    if (!agency) return;
    setLoading(true);
    setError(null);
    try {
      const [tRes, cRes, mList] = await Promise.all([
        supabase.from("tasks").select("*, clients(name)").eq("agency_id", agency.id).order("created_at", { ascending: false }),
        supabase.from("clients").select("id,name").eq("agency_id", agency.id).order("name"),
        fetchAgencyMembers(agency.id),
      ]);
      if (tRes.error) throw tRes.error;
      if (cRes.error) throw cRes.error;
      setTasks(tRes.data || []);
      setClients(cRes.data || []);
      setMembers(mList);
    } catch (e: any) {
      setError(e.message || "Nu am putut încărca sarcinile");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [agency]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return tasks.filter((t) => {
      if (clientFilter !== "all" && t.client_id !== (clientFilter === "_none" ? null : clientFilter)) return false;
      if (assigneeFilter !== "all" && t.assigned_to !== (assigneeFilter === "_none" ? null : assigneeFilter)) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (mineOnly && profile && t.assigned_to !== profile.id) return false;
      if (overdueOnly) {
        if (!t.deadline) return false;
        if (t.status === "done") return false;
        if (new Date(t.deadline).getTime() >= now) return false;
      }
      return true;
    });
  }, [tasks, clientFilter, assigneeFilter, priorityFilter, mineOnly, overdueOnly, profile]);

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

  const quickTask = tasks.find((t) => t.id === quickTaskId) || null;

  return (
    <TooltipProvider delayDuration={200}>
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sarcini</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestionează activitatea echipei pentru toți clienții.</p>
        </div>
        <Button onClick={() => { setEditId(null); setEditorOpen(true); }} className="bg-accent hover:bg-accent/90 text-accent-foreground"><Plus className="h-4 w-4 mr-1.5" /> Sarcină nouă</Button>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <Button
          size="sm"
          variant={mineOnly ? "default" : "outline"}
          onClick={() => setMineOnly((v) => !v)}
          className={mineOnly ? "bg-accent hover:bg-accent/90 text-accent-foreground" : ""}
        >
          Sarcinile mele
        </Button>
        <Button
          size="sm"
          variant={overdueOnly ? "default" : "outline"}
          onClick={() => setOverdueOnly((v) => !v)}
          className={overdueOnly ? "bg-rose-600 hover:bg-rose-600/90 text-white" : ""}
        >
          <AlertCircle className="h-3.5 w-3.5 mr-1.5" /> Întârziate
        </Button>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate priorit.</SelectItem>
            {TASK_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toți clienții</SelectItem>
            <SelectItem value="_none">Doar intern</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toți responsabilii</SelectItem>
            <SelectItem value="_none">Neasignat</SelectItem>
            {members.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <Card><CardContent className="p-2"><ErrorState message={error} onRetry={load} /></CardContent></Card>
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
                <QuickAddTaskInput
                  agencyId={agency.id}
                  status={col.value}
                  defaultClientId={clientFilter !== "all" && clientFilter !== "_none" ? clientFilter : null}
                  defaultAssignee={assigneeFilter !== "all" && assigneeFilter !== "_none" ? assigneeFilter : (mineOnly ? profile?.id : null)}
                  onCreated={load}
                />
                <div className="space-y-2">
                  {items.length === 0 && (
                    <div className="text-xs text-muted-foreground border border-dashed border-border rounded-lg p-4 text-center">Trage aici</div>
                  )}
                  {items.map((t) => {
                    const pri = statusFor(TASK_PRIORITIES, t.priority);
                    const assignee = members.find((m) => m.user_id === t.assigned_to);
                    const due = t.deadline ? new Date(t.deadline) : null;
                    const overdue = !!due && t.status !== "done" && isPast(due) && !isToday(due);
                    const today = !!due && isToday(due);
                    return (
                      <Card key={t.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/task", t.id)}
                        onClick={() => { setQuickTaskId(t.id); setQuickOpen(true); }}
                        className="cursor-pointer hover:border-accent transition-colors relative overflow-hidden"
                      >
                        <span className={cn("absolute left-0 top-0 bottom-0 w-1", PRIORITY_BAR[t.priority] || "bg-muted")} />
                        <CardContent className="p-2.5 pl-3 space-y-1.5">
                          <div className="font-medium text-sm leading-snug line-clamp-2">{t.title}</div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {t.clients?.name && (
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded truncate max-w-[140px]">{t.clients.name}</span>
                            )}
                            {t.task_type && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t.task_type}</Badge>}
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${pri.color}`}>{pri.label}</span>
                          </div>
                          {(due || assignee) && (
                            <div className="flex items-center justify-between pt-1 border-t border-border">
                              {due ? (
                                <span className={cn(
                                  "flex items-center gap-1 text-[11px]",
                                  overdue ? "text-rose-600 dark:text-rose-400 font-medium" : today ? "text-accent font-medium" : "text-muted-foreground"
                                )}>
                                  {overdue ? <AlertCircle className="h-3 w-3" /> : <CalIcon className="h-3 w-3" />}
                                  {format(due, "MMM d")}
                                </span>
                              ) : <span />}
                              {assignee && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Avatar className="h-5 w-5"><AvatarFallback className="text-[9px]">{initials(assignee.full_name, assignee.email)}</AvatarFallback></Avatar>
                                  </TooltipTrigger>
                                  <TooltipContent>{assignee.full_name || assignee.email}</TooltipContent>
                                </Tooltip>
                              )}
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
      <QuickEditTaskSheet
        open={quickOpen}
        onOpenChange={setQuickOpen}
        task={quickTask}
        members={members}
        onChanged={load}
        onOpenFull={(id) => { setEditId(id); setEditorOpen(true); }}
      />
    </div>
    </TooltipProvider>
  );
}
