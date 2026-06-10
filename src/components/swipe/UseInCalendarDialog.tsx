import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { incrementUsage, type SwipeFile } from "@/lib/swipe";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  swipe: SwipeFile | null;
  navigateAfter?: boolean;
};

export function UseInCalendarDialog({ open, onOpenChange, swipe, navigateAfter }: Props) {
  const { agency, profile } = useUser();
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [scheduledFor, setScheduledFor] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!agency || !open) return;
    supabase.from("clients").select("id,name").eq("agency_id", agency.id).order("name")
      .then(({ data }) => {
        setClients(data || []);
        setClientId(swipe?.client_id || (data?.[0]?.id ?? ""));
      });
    setScheduledFor("");
  }, [agency, open, swipe]);

  if (!swipe) return null;

  const submit = async () => {
    if (!agency || !clientId) { toast({ title: "Pick a client", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("content_posts").insert({
        agency_id: agency.id,
        client_id: clientId,
        title: swipe.title,
        platform: swipe.platform || undefined,
        content_type: swipe.content_format || undefined,
        hook: swipe.hook || undefined,
        script: swipe.script || undefined,
        caption: swipe.caption || undefined,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        status: "idea",
        created_by: profile?.id,
      } as any);
      if (error) throw error;
      await incrementUsage(swipe.id);
      toast({ title: "Added to content calendar" });
      onOpenChange(false);
      if (navigateAfter) navigate("/agency/content");
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Use in content calendar</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Schedule for (optional)</Label>
            <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Anulează</Button>
          <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create draft</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
