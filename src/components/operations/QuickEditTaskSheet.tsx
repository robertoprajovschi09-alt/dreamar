import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar as CalIcon, Trash2, ExternalLink, X } from "lucide-react";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/operations";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: any | null;
  members: { user_id: string; full_name?: string | null; email?: string | null }[];
  onChanged: () => void;
  onOpenFull: (id: string) => void;
}

export function QuickEditTaskSheet({ open, onOpenChange, task, members, onChanged, onOpenFull }: Props) {
  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (task) setForm({ ...task }); }, [task]);

  if (!task || !form) {
    return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="w-full sm:max-w-md" /></Sheet>;
  }

  const update = async (patch: any) => {
    const next = { ...form, ...patch };
    setForm(next);
    const dbPatch: any = { ...patch };
    if ("deadline" in patch) dbPatch.deadline = patch.deadline ? new Date(patch.deadline).toISOString() : null;
    const { error } = await supabase.from("tasks").update(dbPatch).eq("id", task.id);
    if (error) { toast.error(error.message); return; }
    onChanged();
  };

  const saveTitle = async () => {
    const t = form.title?.trim();
    if (!t || t === task.title) return;
    await update({ title: t });
  };

  const remove = async () => {
    if (!confirm("Delete task?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) return toast.error(error.message);
    toast.success("Șters"); onChanged(); onOpenChange(false);
  };

  const deadline = form.deadline ? new Date(form.deadline) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>Editare rapidă</SheetTitle></SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Titlu</Label>
            <Input
              value={form.title || ""}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => update({ status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Prioritate</Label>
              <Select value={form.priority} onValueChange={(v) => update({ priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_PRIORITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Responsabil</Label>
            <Select
              value={form.assigned_to || "_none"}
              onValueChange={(v) => update({ assigned_to: v === "_none" ? null : v })}
            >
              <SelectTrigger><SelectValue placeholder="Neasignat" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Neasignat</SelectItem>
                {members.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || m.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Termen</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal", !deadline && "text-muted-foreground")}>
                    <CalIcon className="h-4 w-4 mr-2" />
                    {deadline ? format(deadline, "PPP") : "Fără termen"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deadline || undefined}
                    onSelect={(d) => update({ deadline: d || null })}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {deadline && (
                <Button variant="ghost" size="icon" onClick={() => update({ deadline: null })}><X className="h-4 w-4" /></Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button type="button" variant="ghost" className="text-destructive" onClick={remove}>
              <Trash2 className="h-4 w-4 mr-1.5" /> Șterge
            </Button>
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); onOpenFull(task.id); }}>
              <ExternalLink className="h-4 w-4 mr-1.5" /> Editare completă
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
