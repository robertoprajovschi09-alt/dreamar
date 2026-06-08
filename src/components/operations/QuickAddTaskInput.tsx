import { useState, KeyboardEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

interface Props {
  agencyId: string;
  status: string;
  defaultClientId?: string | null;
  defaultAssignee?: string | null;
  onCreated: () => void;
}

export function QuickAddTaskInput({ agencyId, status, defaultClientId, defaultAssignee, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const t = title.trim();
    if (!t || busy) return;
    setBusy(true);
    const { error } = await supabase.from("tasks").insert({
      agency_id: agencyId,
      title: t,
      status: status as any,
      priority: "medium" as any,
      client_id: defaultClientId || null,
      assigned_to: defaultAssignee || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setTitle("");
    onCreated();
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); submit(); }
    if (e.key === "Escape") setTitle("");
  };

  return (
    <div className="relative">
      <Plus className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={onKey}
        onBlur={submit}
        placeholder="Adaugă o sarcină…"
        disabled={busy}
        className="h-8 pl-7 pr-7 text-xs bg-transparent border-dashed"
      />
      {busy && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
    </div>
  );
}
