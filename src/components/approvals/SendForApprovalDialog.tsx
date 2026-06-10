import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { sendForApproval } from "@/lib/approvals";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  post: { id: string; agency_id: string; client_id: string; title: string } | null;
  onSent?: () => void;
  onCancel?: () => void;
}

export function SendForApprovalDialog({ open, onOpenChange, post, onSent, onCancel }: Props) {
  const [users, setUsers] = useState<{ user_id: string; email: string }[]>([]);
  const [assigned, setAssigned] = useState<string>("all");
  const [due, setDue] = useState<string>("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !post) return;
    setMsg("");
    const def = new Date(Date.now() + 3 * 24 * 3600 * 1000);
    setDue(def.toISOString().slice(0, 16));
    setAssigned("all");
    supabase
      .from("client_users")
      .select("user_id,email")
      .eq("client_id", post.client_id)
      .eq("status", "active")
      .then(({ data }) => setUsers((data || []) as any));
  }, [open, post]);

  const submit = async () => {
    if (!post) return;
    setBusy(true);
    try {
      await sendForApproval({
        post,
        dueDate: due ? new Date(due).toISOString() : null,
        assignedToClientUser: assigned === "all" ? null : assigned,
        message: msg || null,
      });
      toast.success("Trimis spre aprobare către client");
      onOpenChange(false);
      onSent?.();
    } catch (e: any) {
      toast.error(e.message || "Trimiterea a eșuat");
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    onOpenChange(false);
    onCancel?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) cancel(); else onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trimite la aprobare către client</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Atribuit către</Label>
            <Select value={assigned} onValueChange={setAssigned}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toți utilizatorii clientului</SelectItem>
                {users.map((u) => <SelectItem key={u.user_id} value={u.user_id}>{u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Termen limită</Label>
            <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div>
            <Label>Mesaj (opțional)</Label>
            <Textarea rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Orice ar trebui să știe clientul…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={cancel}>Anulează</Button>
          <Button onClick={submit} disabled={busy} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1.5" /> Trimite</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
