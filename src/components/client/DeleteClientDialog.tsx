import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  clientName: string;
  onDeleted: () => void;
}

export function DeleteClientDialog({ open, onOpenChange, clientId, clientName, onDeleted }: Props) {
  const [counts, setCounts] = useState<{ posts: number; goals: number; docs: number; users: number } | null>(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) { setCounts(null); setConfirm(""); return; }
    (async () => {
      const [p, g, d, u] = await Promise.all([
        supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("monthly_goals").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("client_users").select("id", { count: "exact", head: true }).eq("client_id", clientId),
      ]);
      setCounts({ posts: p.count || 0, goals: g.count || 0, docs: d.count || 0, users: u.count || 0 });
    })();
  }, [open, clientId]);

  const matches = confirm.trim() === clientName.trim();

  const handleDelete = async () => {
    if (!matches) return;
    setBusy(true);
    const { error } = await supabase.from("clients").delete().eq("id", clientId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Client șters");
    onOpenChange(false);
    onDeleted();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Șterge „{clientName}"
          </DialogTitle>
          <DialogDescription>
            Acțiunea NU poate fi anulată.
          </DialogDescription>
        </DialogHeader>

        {!counts ? (
          <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-foreground">Se vor șterge definitiv:</div>
            <ul className="text-sm space-y-1 bg-muted/40 rounded-lg p-3">
              <li>• <strong>{counts.posts}</strong> {counts.posts === 1 ? "postare" : "postări"}</li>
              <li>• <strong>{counts.goals}</strong> {counts.goals === 1 ? "obiectiv" : "obiective"}</li>
              <li>• <strong>{counts.docs}</strong> {counts.docs === 1 ? "document" : "documente"}</li>
              <li>• <strong>{counts.users}</strong> {counts.users === 1 ? "cont de client conectat" : "conturi de client conectate"}</li>
              <li className="pt-1 text-xs text-muted-foreground">Plus aprobări, briefuri, check-in-uri, analytics și restul datelor legate.</li>
            </ul>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Pentru confirmare, tastează exact: <span className="font-mono text-foreground">{clientName}</span>
              </Label>
              <Input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={clientName}
                autoComplete="off"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Anulează</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={!matches || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Șterge definitiv"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
