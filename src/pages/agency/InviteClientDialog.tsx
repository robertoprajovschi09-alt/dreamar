import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Copy, Check, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  PortalPermissions,
  PORTAL_PERMISSION_KEYS,
  PORTAL_PERMISSION_LABELS,
  defaultPermissions,
} from "@/lib/portalPermissions";

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
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"client_owner" | "client_viewer">("client_viewer");
  const [perms, setPerms] = useState<PortalPermissions>(defaultPermissions("client_viewer"));
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setPerms(defaultPermissions(role)); }, [role]);

  const reset = () => {
    setEmail(""); setDisplayName(""); setRole("client_viewer");
    setPerms(defaultPermissions("client_viewer"));
    setLink(null); setCopied(false);
  };

  const createInvite = async (markSent: boolean): Promise<{ url: string; token: string } | null> => {
    if (!email.trim() || !user) return null;
    setBusy(true);
    const { data, error } = await supabase
      .from("client_invites")
      .insert({
        agency_id: agencyId,
        client_id: clientId,
        email: email.trim().toLowerCase(),
        invited_by: user.id,
        display_name: displayName.trim() || null,
        portal_role: role,
        permissions: perms as any,
        status: markSent ? "sent" : "pending",
      })
      .select("token")
      .single();
    setBusy(false);
    if (error) { toast.error(error.message); return null; }
    onCreated?.();
    return { url: `${window.location.origin}/accept-invite?token=${data.token}`, token: data.token };
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createInvite(true);
    if (!res) return;
    setLink(res.url);
    try {
      const { data: sendRes } = await supabase.functions.invoke("send-client-invite", {
        body: { token: res.token },
      });
      if (sendRes?.ok) toast.success(`Invitație trimisă pe email către ${email.trim()}`);
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Invită în portalul clientului</DialogTitle></DialogHeader>
        {!link ? (
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email</Label>
                <Input id="invite-email" type="email" required autoFocus value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-name">Nume afișat <span className="text-muted-foreground text-xs">(opțional)</span></Label>
                <Input id="invite-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ion Popescu" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rol în portal</Label>
              <RadioGroup value={role} onValueChange={(v) => setRole(v as any)} className="grid grid-cols-2 gap-2">
                <label className="flex items-start gap-2 border border-border rounded-lg p-3 cursor-pointer has-[[data-state=checked]]:border-accent has-[[data-state=checked]]:bg-accent/5">
                  <RadioGroupItem value="client_owner" className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Proprietar</div>
                    <div className="text-xs text-muted-foreground">Acces complet, poate aproba conținut</div>
                  </div>
                </label>
                <label className="flex items-start gap-2 border border-border rounded-lg p-3 cursor-pointer has-[[data-state=checked]]:border-accent has-[[data-state=checked]]:bg-accent/5">
                  <RadioGroupItem value="client_viewer" className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Vizualizator</div>
                    <div className="text-xs text-muted-foreground">Doar citire în mod implicit</div>
                  </div>
                </label>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Permisiuni</Label>
              <div className="border border-border rounded-lg divide-y divide-border">
                {PORTAL_PERMISSION_KEYS.map((k) => (
                  <div key={k} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-sm">{PORTAL_PERMISSION_LABELS[k]}</span>
                    <Switch checked={perms[k]} onCheckedChange={(v) => setPerms({ ...perms, [k]: v })} />
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={handleLinkOnly} disabled={busy}>
                Doar creează link
              </Button>
              <Button type="submit" disabled={busy} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail className="h-4 w-4 mr-1.5" /> Trimite invitația</>}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Trimite acest link către <span className="font-medium text-foreground">{email}</span>. Linkul expiră în 7 zile.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={link} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
              <Button type="button" onClick={copy} variant="outline">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Gata</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
