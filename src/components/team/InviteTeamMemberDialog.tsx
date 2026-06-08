import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy, Check, Mail } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agencyId: string;
  onCreated?: () => void;
};

export function InviteTeamMemberDialog({ open, onOpenChange, agencyId, onCreated }: Props) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"agency_team" | "agency_owner">("agency_team");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => { setEmail(""); setRole("agency_team"); setLink(null); setCopied(false); };

  const createInvite = async (markSent: boolean): Promise<{ url: string; token: string } | null> => {
    if (!email.trim() || !user) return null;
    setBusy(true);
    const { data, error } = await supabase
      .from("team_invites")
      .insert({
        agency_id: agencyId,
        email: email.trim().toLowerCase(),
        role,
        invited_by: user.id,
        status: markSent ? "sent" : "pending",
      })
      .select("token")
      .single();
    setBusy(false);
    if (error) { toast.error(error.message); return null; }
    onCreated?.();
    return { url: `${window.location.origin}/accept-team-invite?token=${data.token}`, token: data.token };
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createInvite(true);
    if (!res) return;
    setLink(res.url);
    try {
      const { data: sendRes } = await supabase.functions.invoke("send-team-invite", { body: { token: res.token } });
      if (sendRes?.ok) toast.success(`Invitație trimisă către ${email.trim()}`);
      else toast.warning("Emailul nu a putut fi trimis — copiază linkul manual.");
    } catch {
      toast.warning("Emailul nu a putut fi trimis — copiază linkul manual.");
    }
  };

  const handleLinkOnly = async () => {
    const res = await createInvite(false);
    if (!res) return;
    setLink(res.url);
    toast.success("Linkul de invitație este gata");
  };

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Invită un membru în echipă</DialogTitle></DialogHeader>
        {!link ? (
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="t-email">Email</Label>
              <Input id="t-email" type="email" required autoFocus value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="coleg@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agency_team">Membru echipă</SelectItem>
                  <SelectItem value="agency_owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={handleLinkOnly} disabled={busy}>Doar creează link</Button>
              <Button type="submit" disabled={busy} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail className="h-4 w-4 mr-1.5" /> Trimite invitația</>}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Trimite acest link către <span className="font-medium text-foreground">{email}</span>. Linkul expiră în 7 zile.</p>
            <div className="flex gap-2">
              <Input readOnly value={link} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
              <Button type="button" onClick={copy} variant="outline">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
            </div>
            <DialogFooter><Button onClick={() => onOpenChange(false)}>Gata</Button></DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
