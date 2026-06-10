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
}

export function SendForApprovalDialog({ open, onOpenChange, post, onSent }: Props) {
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
      toast.error(e.message || "Failed to send");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send for client approval</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Assigned to</Label>
            <Select value={assigned} onValueChange={setAssigned}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All client users</SelectItem>
                {users.map((u) => <SelectItem key={u.user_id} value={u.user_id}>{u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Due date</Label>
            <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div>
            <Label>Message (optional)</Label>
            <Textarea rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Anything the client should know…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Anulează</Button>
          <Button onClick={submit} disabled={busy} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1.5" /> Send</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
