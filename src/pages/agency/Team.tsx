import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserCog, UserPlus, Loader2, Copy, RefreshCw, X, Mail } from "lucide-react";
import { toast } from "sonner";
import { InviteTeamMemberDialog } from "@/components/team/InviteTeamMemberDialog";

type Member = {
  id: string;
  user_id: string;
  role: "agency_owner" | "agency_team" | string;
  created_at: string;
  profile: { full_name: string | null; email: string | null } | null;
};

type Invite = {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  created_at: string;
  expires_at: string;
  last_sent_at: string | null;
  send_count: number;
};

const initials = (s?: string | null) =>
  (s || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";

export default function Team() {
  const { user } = useAuth();
  const { profile, agency } = useUser();
  const agencyId = profile?.agency_id;
  const isOwner = profile?.role === "agency_owner" || profile?.is_saas_admin;

  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [maxSeats, setMaxSeats] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  const load = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);
    const [m, i, planRow] = await Promise.all([
      supabase.from("agency_members").select("id,user_id,role,created_at").eq("agency_id", agencyId).order("created_at"),
      supabase.from("team_invites").select("id,email,role,status,token,created_at,expires_at,last_sent_at,send_count")
        .eq("agency_id", agencyId).not("status", "in", "(accepted,revoked)").order("created_at", { ascending: false }),
      agency?.plan
        ? supabase.from("plans").select("max_seats").eq("tier", agency.plan as any).maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);

    const userIds = (m.data || []).map((r) => r.user_id);
    const { data: profs } = userIds.length
      ? await supabase.from("profiles").select("id,full_name,email").in("id", userIds)
      : { data: [] as any };
    const profById = new Map((profs || []).map((p: any) => [p.id, p]));
    setMembers((m.data || []).map((r) => ({ ...r, profile: profById.get(r.user_id) || null } as Member)));
    setInvites((i.data || []) as Invite[]);
    setMaxSeats((planRow as any)?.data?.max_seats ?? null);
    setLoading(false);
  }, [agencyId, agency?.plan]);

  useEffect(() => { load(); }, [load]);

  const seatsUsed = members.length + invites.length;
  const seatLimitHit = maxSeats !== null && seatsUsed >= maxSeats;

  const ownerCount = members.filter((m) => m.role === "agency_owner").length;

  const changeRole = async (memberId: string, role: "agency_owner" | "agency_team", current: string) => {
    if (current === "agency_owner" && role !== "agency_owner" && ownerCount <= 1) {
      toast.error("Agenția trebuie să aibă cel puțin un owner.");
      return;
    }
    const { error } = await supabase.from("agency_members").update({ role }).eq("id", memberId);
    if (error) return toast.error(error.message);
    toast.success("Rol actualizat");
    load();
  };

  const removeMember = async (memberId: string, role: string) => {
    if (role === "agency_owner" && ownerCount <= 1) {
      toast.error("Nu poți elimina ultimul owner.");
      return;
    }
    const { error } = await supabase.from("agency_members").delete().eq("id", memberId);
    if (error) return toast.error(error.message);
    toast.success("Membru eliminat");
    load();
  };

  const resend = async (id: string, token: string) => {
    const { error } = await supabase.rpc("resend_team_invite", { _invite_id: id });
    if (error) return toast.error(error.message);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("send-team-invite", { body: { token } });
      if (fnErr) toast.error(`Emailul nu a putut fi trimis: ${fnErr.message}. Copiază linkul manual.`);
      else if ((data as any)?.ok) toast.success("Invitație retrimisă pe email");
      else toast.error(`Emailul nu a putut fi trimis: ${(data as any)?.error || "eroare necunoscută"}. Copiază linkul manual.`);
    } catch (e: any) {
      toast.error(`Emailul nu a putut fi trimis: ${e?.message || "eroare necunoscută"}. Copiază linkul manual.`);
    }
    load();
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.rpc("revoke_team_invite", { _invite_id: id });
    if (error) return toast.error(error.message);
    toast.success("Invitație revocată");
    load();
  };

  const copyLink = async (token: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/accept-team-invite?token=${token}`);
    toast.success("Link copiat");
  };

  if (!agencyId) {
    return <div className="p-6 text-sm text-muted-foreground">Se încarcă...</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Echipă</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestionează membrii agenției și invită colegi în dashboard.
            {maxSeats !== null && (
              <span className="ml-2">Locuri: <strong>{seatsUsed}/{maxSeats}</strong></span>
            )}
          </p>
        </div>
        {isOwner && (
          <Button
            onClick={() => setInviteOpen(true)}
            disabled={seatLimitHit}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            {seatLimitHit ? "Limită atinsă" : "Invită membru"}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserCog className="h-4 w-4 text-accent" /> Membri ({members.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : members.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Niciun membru încă.</div>
          ) : (
            <ul className="divide-y divide-border">
              {members.map((m) => {
                const name = m.profile?.full_name || m.profile?.email || "Utilizator";
                const isSelf = m.user_id === user?.id;
                return (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9"><AvatarFallback className="text-xs">{initials(name)}</AvatarFallback></Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{name} {isSelf && <span className="text-xs text-muted-foreground">(tu)</span>}</div>
                        <div className="text-xs text-muted-foreground truncate">{m.profile?.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOwner && !isSelf ? (
                        <Select value={m.role} onValueChange={(v) => changeRole(m.id, v as any, m.role)}>
                          <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="agency_owner">Owner</SelectItem>
                            <SelectItem value="agency_team">Membru echipă</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">{m.role === "agency_owner" ? "Owner" : "Membru"}</Badge>
                      )}
                      {isOwner && !isSelf && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Elimini {name}?</AlertDialogTitle>
                              <AlertDialogDescription>Își pierde imediat accesul la agenție.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Anulează</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removeMember(m.id, m.role)}>Elimină</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-accent" /> Invitații în așteptare ({invites.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {invites.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Nicio invitație activă.</div>
          ) : (
            <ul className="divide-y divide-border">
              {invites.map((i) => {
                const url = `${window.location.origin}/accept-team-invite?token=${i.token}`;
                const statusRO: Record<string, string> = { pending: "În așteptare", sent: "Trimisă", opened: "Deschisă", accepted: "Acceptată", expired: "Expirată", revoked: "Revocată" };
                const expired = new Date(i.expires_at).getTime() < Date.now();
                return (
                  <li key={i.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{i.email}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5">
                          <Badge variant="outline">{i.role === "agency_owner" ? "Owner" : "Membru"}</Badge>
                          <Badge variant="secondary">{statusRO[i.status] || i.status}</Badge>
                          <span>{expired ? "Expirată" : `Expiră ${new Date(i.expires_at).toLocaleDateString()}`}</span>
                          {i.send_count > 1 && <span>· Trimisă de {i.send_count}×</span>}
                        </div>
                      </div>
                      {isOwner && (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => copyLink(i.token)} title="Copiază link"><Copy className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => resend(i.id, i.token)} title="Retrimite"><RefreshCw className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => revoke(i.id)} title="Revocă"><X className="h-4 w-4" /></Button>
                        </div>
                      )}
                    </div>
                    {!expired && i.status !== "accepted" && i.status !== "revoked" && (
                      <Input readOnly value={url} className="font-mono text-[11px] h-7" onFocus={(e) => e.currentTarget.select()} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <InviteTeamMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        agencyId={agencyId}
        onCreated={load}
      />
    </div>
  );
}
