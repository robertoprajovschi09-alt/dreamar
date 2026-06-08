import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { POST_STATUSES, PLATFORM_OPTIONS } from "@/lib/content";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  anchor: { x: number; y: number } | null;
  date: string | null; // yyyy-mm-dd
  clients: { id: string; name: string }[];
  defaultClientId?: string | null;
  onCreated: () => void;
  onOpenFull: (defaults: { date: string; client_id: string; title: string; platform: string; status: string }) => void;
};

export function QuickAddPopover({
  open, onOpenChange, anchor, date, clients, defaultClientId, onCreated, onOpenFull,
}: Props) {
  const { agency } = useUser();
  const [clientId, setClientId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [status, setStatus] = useState("idea");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setClientId(defaultClientId || clients[0]?.id || "");
      setTitle("");
      setPlatform("instagram");
      setStatus("idea");
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open, defaultClientId, clients]);

  const create = async () => {
    if (!agency || !date) return;
    if (!clientId) return toast.error("Selectează un client");
    if (!title.trim()) return toast.error("Adaugă un titlu");
    setSaving(true);
    const { error } = await supabase.from("content_posts").insert({
      agency_id: agency.id,
      client_id: clientId,
      title: title.trim(),
      platform,
      content_type: "Reel",
      status,
      scheduled_for: new Date(`${date}T10:00`).toISOString(),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Adăugat");
    onOpenChange(false);
    onCreated();
  };

  const openFull = () => {
    if (!date) return;
    onOpenFull({ date, client_id: clientId, title, platform, status });
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <span
          style={{
            position: "fixed",
            left: anchor?.x ?? -9999,
            top: anchor?.y ?? -9999,
            width: 1,
            height: 1,
            pointerEvents: "none",
          }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start" sideOffset={6}>
        <div className="text-xs text-muted-foreground mb-2">
          Adaugă rapid pentru <span className="font-medium text-foreground">{date}</span>
        </div>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Selectează client" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Titlu</Label>
            <Input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); create(); } }}
              className="h-8"
              placeholder="Idee de conținut…"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Platformă</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{PLATFORM_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{POST_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={openFull} className="text-xs text-accent hover:underline">
              Mai multe detalii
            </button>
            <Button size="sm" onClick={create} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground h-8">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Plus className="h-3.5 w-3.5 mr-1" /> Adaugă</>}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
