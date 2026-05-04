import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agencyId: string;
  clientId: string;
  onCreated?: () => void;
};

export function InviteClientDialog({ open, onOpenChange, agencyId, clientId, onCreated }: Props) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => { setEmail(""); setLink(null); setCopied(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !user) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("client_invites")
      .insert({ agency_id: agencyId, client_id: clientId, email: email.trim().toLowerCase(), invited_by: user.id })
      .select("token")
      .single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    const url = `${window.location.origin}/accept-invite?token=${data.token}`;
    setLink(url);
    onCreated?.();
    toast.success("Invite created. Share the link below with your client.");
  };

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Invite client</DialogTitle></DialogHeader>
        {!link ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Client email</Label>
              <Input id="invite-email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com" />
              <p className="text-xs text-muted-foreground">We'll create a secure invite link you can share with your client.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={busy} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create invite"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Share this link with <span className="font-medium text-foreground">{email}</span>. The link expires in 7 days.</p>
            <div className="flex gap-2">
              <Input readOnly value={link} className="font-mono text-xs" />
              <Button type="button" onClick={copy} variant="outline">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
