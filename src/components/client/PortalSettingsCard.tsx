import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { UserPlus, MoreHorizontal, Copy, Check, Mail, Trash2, ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { InviteClientDialog } from "@/pages/agency/InviteClientDialog";
import { EditPortalPermissionsDialog } from "./EditPortalPermissionsDialog";
import {
  INVITE_STATUS_LABEL, inviteStatusVariant, InviteStatus,
} from "@/lib/portalPermissions";

type Props = {
  agencyId: string;
  clientId: string;
  users: any[];
  invites: any[];
  reload: () => void;
};

function formatRelative(d?: string | null) {
  if (!d) return "Niciodată";
  const ms = Date.now() - new Date(d).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "Acum";
  if (min < 60) return `acum ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `acum ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `acum ${days}z`;
  return new Date(d).toLocaleDateString();
}

export function PortalSettingsCard({ agencyId, clientId, users, invites, reload }: Props) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [permTarget, setPermTarget] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyLink = async (token: string, id: string) => {
    const url = `${window.location.origin}/accept-invite?token=${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Link copiat");
    setTimeout(() => setCopiedId(null), 1500);
  };

  const resend = async (id: string, token: string) => {
    const { error } = await supabase.rpc("resend_client_invite", { _invite_id: id });
    if (error) return toast.error(error.message);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("send-client-invite", { body: { token } });
      if (fnErr) toast.error(`Emailul nu a putut fi trimis: ${fnErr.message}. Copiază linkul manual.`);
      else if ((data as any)?.ok) toast.success("Invitație retrimisă pe email");
      else toast.error(`Emailul nu a putut fi trimis: ${(data as any)?.error || "eroare necunoscută"}. Copiază linkul manual.`);
    } catch (e: any) {
      toast.error(`Emailul nu a putut fi trimis: ${e?.message || "eroare necunoscută"}. Copiază linkul manual.`);
    }
    reload();
  };

  const revokeInvite = async (id: string) => {
    if (!confirm("Revoci această invitație?")) return;
    const { error } = await supabase.rpc("revoke_client_invite", { _invite_id: id });
    if (error) return toast.error(error.message);
    toast.success("Invitație revocată");
    reload();
  };

  const removeUser = async (id: string) => {
    if (!confirm("Revoci accesul acestui utilizator?")) return;
    const { error } = await supabase.from("client_users")
      .update({ status: "revoked", revoked_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Acces revocat");
    reload();
  };

  const activeUsers = users.filter((u) => u.status === "active");
  const revokedUsers = users.filter((u) => u.status === "revoked");
  const pendingInvites = invites.filter((i) => !["accepted"].includes(i.status));
  const acceptedInvites = invites.filter((i) => i.status === "accepted");

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">Acces portal client</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Invită clientul în spațiul lui de lucru. Vede doar acest client.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <UserPlus className="h-4 w-4 mr-1.5" /> Invită client
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Active members */}
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Membri ({activeUsers.length})
          </h4>
          {activeUsers.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 border border-dashed border-border rounded-lg text-center">
              Niciun membru activ încă.
            </div>
          ) : (
            <ul className="divide-y divide-border border border-border rounded-lg">
              {activeUsers.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{u.display_name || u.email}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <span>{u.email}</span>
                      <span>·</span>
                      <Badge variant="outline" className="text-[10px] uppercase h-4 px-1">
                        {u.role === "client_owner" ? "Owner" : "Vizualizator"}
                      </Badge>
                      <span>·</span>
                      <span>Ultima logare {formatRelative(u.last_login_at)}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setPermTarget({ kind: "user", id: u.id, email: u.email, role: u.role, permissions: u.permissions })}>
                        <ShieldCheck className="h-4 w-4 mr-2" /> Editează permisiuni
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => removeUser(u.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Revocă accesul
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pending invitations */}
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Invitations ({pendingInvites.length})
          </h4>
          {pendingInvites.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 border border-dashed border-border rounded-lg text-center">
              No pending invitations.
            </div>
          ) : (
            <ul className="divide-y divide-border border border-border rounded-lg">
              {pendingInvites.map((i) => {
                const status = (i.status as InviteStatus) || "pending";
                const variant = inviteStatusVariant(status);
                const url = `${window.location.origin}/accept-invite?token=${i.token}`;
                const expired = new Date(i.expires_at).getTime() < Date.now();
                return (
                  <li key={i.id} className="px-3 py-2.5 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{i.email}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase font-medium ${variant.bg} ${variant.fg}`}>
                            {INVITE_STATUS_LABEL[status] ?? status}
                          </span>
                          <span>·</span>
                          <Badge variant="outline" className="text-[10px] uppercase h-4 px-1">
                            {i.portal_role === "client_owner" ? "Owner" : "Viewer"}
                          </Badge>
                          <span>·</span>
                          <span>{expired ? "Expired" : `Expires ${new Date(i.expires_at).toLocaleDateString()}`}</span>
                          {i.send_count > 1 && <><span>·</span><span>Sent {i.send_count}×</span></>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyLink(i.token, i.id)} title="Copy link">
                          {copiedId === i.id ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => resend(i.id, i.token)}>
                              <RefreshCw className="h-4 w-4 mr-2" /> Resend / refresh link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPermTarget({ kind: "invite", id: i.id, email: i.email, role: i.portal_role, permissions: i.permissions })}>
                              <ShieldCheck className="h-4 w-4 mr-2" /> Edit permissions
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => revokeInvite(i.id)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Revoke invite
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    {(status === "pending" || status === "sent") && !expired && (
                      <Input readOnly value={url} className="font-mono text-[11px] h-7" onFocus={(e) => e.currentTarget.select()} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {(acceptedInvites.length > 0 || revokedUsers.length > 0) && (
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">History</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              {acceptedInvites.map((i) => (
                <li key={i.id}>✓ {i.email} accepted {i.accepted_at ? new Date(i.accepted_at).toLocaleDateString() : ""}</li>
              ))}
              {revokedUsers.map((u) => (
                <li key={u.id}>⊘ {u.email} access revoked</li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-[11px] text-muted-foreground border-t border-border pt-3 flex items-start gap-1.5">
          <Mail className="h-3 w-3 mt-0.5 shrink-0" />
          To send invitations by email, configure an email domain in your workspace. Until then, share the secure invite link directly.
        </p>
      </CardContent>

      <InviteClientDialog open={inviteOpen} onOpenChange={setInviteOpen}
        agencyId={agencyId} clientId={clientId} onCreated={reload} />

      <EditPortalPermissionsDialog
        open={!!permTarget}
        onOpenChange={(v) => { if (!v) setPermTarget(null); }}
        target={permTarget}
        onSaved={reload}
      />
    </Card>
  );
}
