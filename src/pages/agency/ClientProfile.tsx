import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, UserPlus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { InviteClientDialog } from "./InviteClientDialog";

const NICHES = ["real_estate", "restaurant", "dental", "fitness", "custom"] as const;
const STATUSES = ["active", "paused", "churned", "prospect"] as const;

export default function ClientProfile() {
  const { id } = useParams<{ id: string }>();
  const { agency } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);

  const loadAll = useCallback(async () => {
    if (!id || !agency) return;
    setLoading(true);
    const [{ data: c }, { data: cu }, { data: ci }, { data: cf }] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).maybeSingle(),
      supabase.from("client_users").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("client_invites").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("client_feedback").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    ]);
    setClient(c);
    setUsers(cu || []);
    setInvites(ci || []);
    setFeedback(cf || []);
    setLoading(false);
  }, [id, agency]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    setSaving(true);
    const { error } = await supabase.from("clients").update({
      name: client.name,
      niche: client.niche,
      city: client.city || null,
      website: client.website || null,
      status: client.status,
      contact_person: client.contact_person || null,
      contact_email: client.contact_email || null,
      notes: client.notes || null,
    }).eq("id", client.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
  };

  const revokeInvite = async (inviteId: string) => {
    if (!confirm("Revoke this invite?")) return;
    const { error } = await supabase.from("client_invites").delete().eq("id", inviteId);
    if (error) { toast.error(error.message); return; }
    toast.success("Invite revoked");
    loadAll();
  };

  const removeUser = async (userRowId: string) => {
    if (!confirm("Remove this client user's access?")) return;
    const { error } = await supabase.from("client_users").delete().eq("id", userRowId);
    if (error) { toast.error(error.message); return; }
    toast.success("Access removed");
    loadAll();
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!client) return (
    <div className="p-8">
      <p className="text-muted-foreground">Client not found.</p>
      <Link to="/agency/clients"><Button variant="outline" className="mt-4"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button></Link>
    </div>
  );

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link to="/agency/clients" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1">
            <ArrowLeft className="h-3 w-3" /> Clients
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {client.niche.replace("_", " ")} {client.city ? `· ${client.city}` : ""} ·
            <span className="ml-1 uppercase tracking-wide text-xs">{client.status}</span>
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <UserPlus className="h-4 w-4 mr-1.5" /> Invite client
        </Button>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="users">Client users ({users.length})</TabsTrigger>
          <TabsTrigger value="invites">Invites ({invites.length})</TabsTrigger>
          <TabsTrigger value="feedback">Feedback ({feedback.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={saveDetails} className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Name *</Label>
                    <Input required value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={client.status} onValueChange={(v) => setClient({ ...client, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Niche</Label>
                    <Select value={client.niche} onValueChange={(v) => setClient({ ...client, niche: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {NICHES.map((n) => <SelectItem key={n} value={n}>{n.replace("_", " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input value={client.city || ""} onChange={(e) => setClient({ ...client, city: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input type="url" placeholder="https://" value={client.website || ""} onChange={(e) => setClient({ ...client, website: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Contact name</Label>
                    <Input value={client.contact_person || ""} onChange={(e) => setClient({ ...client, contact_person: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact email</Label>
                    <Input type="email" value={client.contact_email || ""} onChange={(e) => setClient({ ...client, contact_email: e.target.value })} />
                  </div>
                </div>
                <Button type="submit" disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader><CardTitle className="text-base">Client users</CardTitle></CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No client users yet. Send an invite to get started.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {users.map((u) => (
                    <li key={u.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{u.email}</div>
                        <div className="text-xs text-muted-foreground">{u.role} · {u.status}</div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeUser(u.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invites">
          <Card>
            <CardHeader><CardTitle className="text-base">Invitations</CardTitle></CardHeader>
            <CardContent>
              {invites.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No invitations sent yet.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {invites.map((i) => {
                    const url = `${window.location.origin}/accept-invite?token=${i.token}`;
                    return (
                      <li key={i.id} className="py-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{i.email}</div>
                            <div className="text-xs text-muted-foreground">
                              <Badge variant="secondary" className="text-[10px] uppercase mr-1.5">{i.status}</Badge>
                              expires {new Date(i.expires_at).toLocaleDateString()}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => revokeInvite(i.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {i.status === "pending" && (
                          <Input readOnly value={url} className="font-mono text-xs h-8" onFocus={(e) => e.currentTarget.select()} />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback">
          <Card>
            <CardHeader><CardTitle className="text-base">Client feedback & business impact</CardTitle></CardHeader>
            <CardContent>
              {feedback.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No feedback submitted yet.</div>
              ) : (
                <ul className="space-y-4">
                  {feedback.map((f) => (
                    <li key={f.id} className="border border-border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{new Date(f.month).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
                        <span>Submitted {new Date(f.created_at).toLocaleString()}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <Stat label="Calls" value={f.calls_received} />
                        <Stat label="Messages" value={f.messages_received} />
                        <Stat label="Bookings" value={f.bookings} />
                        <Stat label="Sales est." value={f.sales_estimate ? `€${f.sales_estimate}` : "—"} />
                      </div>
                      {f.feedback_text && <Block label="Feedback" value={f.feedback_text} />}
                      {f.real_life_impact && <Block label="Real-life impact" value={f.real_life_impact} />}
                      {f.objections && <Block label="Objections from customers" value={f.objections} />}
                      {f.promote_next_month && <Block label="Promote next month" value={f.promote_next_month} />}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <InviteClientDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        agencyId={client.agency_id}
        clientId={client.id}
        onCreated={loadAll}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono text-base">{value ?? "—"}</div>
    </div>
  );
}
function Block({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm whitespace-pre-wrap">{value}</div>
    </div>
  );
}
