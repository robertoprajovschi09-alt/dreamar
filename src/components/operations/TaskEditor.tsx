import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, Trash2 } from "lucide-react";
import { TASK_STATUSES, TASK_PRIORITIES, TASK_TYPES } from "@/lib/operations";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agencyId: string;
  taskId?: string | null;
  defaultClientId?: string | null;
  clients: { id: string; name: string }[];
  members: { user_id: string; email?: string | null; full_name?: string | null }[];
  onSaved?: () => void;
}

const empty = {
  title: "", description: "", client_id: "", task_type: "content",
  status: "todo", priority: "medium", deadline: "", assigned_to: "",
};

export function TaskEditor({ open, onOpenChange, agencyId, taskId, defaultClientId, clients, members, onSaved }: Props) {
  const [form, setForm] = useState<any>({ ...empty, client_id: defaultClientId || "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (taskId) {
      (async () => {
        const { data } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();
        if (data) setForm({
          ...empty, ...data,
          client_id: data.client_id || "",
          assigned_to: data.assigned_to || "",
          deadline: data.deadline ? new Date(data.deadline).toISOString().slice(0, 16) : "",
          description: data.description || "", task_type: data.task_type || "content",
        });
      })();
    } else {
      setForm({ ...empty, client_id: defaultClientId || "" });
    }
  }, [open, taskId, defaultClientId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Titlul este obligatoriu");
    setBusy(true);
    const payload: any = {
      agency_id: agencyId,
      title: form.title.trim(),
      description: form.description || null,
      client_id: form.client_id || null,
      task_type: form.task_type || null,
      status: form.status,
      priority: form.priority,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      assigned_to: form.assigned_to || null,
    };
    const { error } = taskId
      ? await supabase.from("tasks").update(payload).eq("id", taskId)
      : await supabase.from("tasks").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved"); onSaved?.(); onOpenChange(false);
  };
  const remove = async () => {
    if (!taskId || !confirm("Delete task?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); onSaved?.(); onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>{taskId ? "Edit task" : "New task"}</SheetTitle></SheetHeader>
        <form onSubmit={save} className="space-y-4 mt-4">
          <Field label="Title *"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Description"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Client">
              <Select value={form.client_id || "_none"} onValueChange={(v) => setForm({ ...form, client_id: v === "_none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Internal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Internal (no client)</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Type">
              <Select value={form.task_type} onValueChange={(v) => setForm({ ...form, task_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_PRIORITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Deadline"><Input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></Field>
          </div>
          <Field label="Assignee">
            <Select value={form.assigned_to || "_none"} onValueChange={(v) => setForm({ ...form, assigned_to: v === "_none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Unassigned</SelectItem>
                {members.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email || m.user_id.slice(0, 8)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex justify-between pt-4 border-t border-border">
            {taskId ? <Button type="button" variant="ghost" className="text-destructive" onClick={remove}><Trash2 className="h-4 w-4 mr-1.5" /> Șterge</Button> : <span />}
            <Button type="submit" disabled={busy} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Salvează</>}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
