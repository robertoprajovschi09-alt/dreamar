import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, UserPlus, Trash2, Save, Plus } from "lucide-react";
import { toast } from "sonner";
import { InviteClientDialog } from "./InviteClientDialog";
import { PortalSettingsCard } from "@/components/client/PortalSettingsCard";
import { NICHES, STATUSES, PLATFORMS, GOAL_STATUSES, nicheLabel } from "@/lib/niches";
import { PerformanceStats } from "@/components/performance/PerformanceStats";
import { VideosTable } from "@/components/performance/VideosTable";
import { VideoEditor } from "@/components/performance/VideoEditor";
import { NichePanel } from "@/components/performance/NichePanel";
import { ClientReportsTab } from "@/components/reports/ClientReportsTab";
import { getClientBrief, BRAND_TONES } from "@/lib/brief";
import { HealthScoreCard } from "@/components/health/HealthScoreCard";
import { CompetitorsTab } from "@/components/competitors/CompetitorsTab";
import { ClientStrategiesTab } from "@/components/strategies/ClientStrategiesTab";
import { ClientAnalyticsTab } from "@/components/analytics/ClientAnalyticsTab";
import { LatestCheckInCard } from "@/components/client/LatestCheckInCard";
import { DashboardContextCard } from "@/components/client/DashboardContextCard";

export default function ClientProfile() {
  const { id } = useParams<{ id: string }>();
  const { agency } = useUser();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);

  const loadAll = useCallback(async () => {
    if (!id || !agency) return;
    setLoading(true);
    const [c, cu, ci, cf, cp, gl] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).maybeSingle(),
      supabase.from("client_users").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("client_invites").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("client_feedback").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("client_platforms").select("*").eq("client_id", id).order("platform"),
      supabase.from("monthly_goals").select("*").eq("client_id", id).order("month", { ascending: false }),
    ]);
    setClient(c.data);
    setUsers(cu.data || []);
    setInvites(ci.data || []);
    setFeedback(cf.data || []);
    setPlatforms(cp.data || []);
    setGoals(gl.data || []);
    setLoading(false);
  }, [id, agency]);

  useEffect(() => { loadAll(); }, [loadAll]);

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
            {nicheLabel(client.niche)} {client.city ? `· ${client.city}` : ""} ·
            <span className="ml-1 uppercase tracking-wide text-xs">{client.status}</span>
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <UserPlus className="h-4 w-4 mr-1.5" /> Invite client
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="goals">Goals ({goals.length})</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="strategy">Strategy</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-4">
            <HealthScoreCard clientId={client.id} />
            <DashboardContextCard agencyId={client.agency_id} clientId={client.id} />
            <LatestCheckInCard clientId={client.id} />
            <OverviewTab client={client} platforms={platforms} goals={goals} feedback={feedback} />
          </div>
        </TabsContent>
        <TabsContent value="content"><ClientContentTab client={client} /></TabsContent>
        <TabsContent value="calendar"><ClientCalendarLink client={client} /></TabsContent>
        <TabsContent value="analytics"><ClientAnalyticsTab clientId={client.id} agencyId={client.agency_id} /></TabsContent>
        <TabsContent value="goals"><GoalsTab client={client} goals={goals} reload={loadAll} /></TabsContent>
        <TabsContent value="reports"><ClientReportsTab client={client} /></TabsContent>
        <TabsContent value="strategy"><ClientStrategiesTab clientId={client.id} agencyId={client.agency_id} /></TabsContent>
        <TabsContent value="approvals"><ClientApprovalsList clientId={client.id} /></TabsContent>
        <TabsContent value="documents"><ClientDocumentsTab client={client} /></TabsContent>
        <TabsContent value="competitors"><CompetitorsTab agencyId={client.agency_id} clientId={client.id} /></TabsContent>
        <TabsContent value="tasks"><ClientTasksTab client={client} /></TabsContent>
        <TabsContent value="settings">
          <div className="space-y-4">
            <PortalSettingsCard
              agencyId={client.agency_id}
              clientId={client.id}
              users={users}
              invites={invites}
              reload={loadAll}
            />
            <SettingsTab client={client} reload={loadAll} />
            <BrandTab client={client} reload={loadAll} />
            <PlatformsTab client={client} platforms={platforms} reload={loadAll} />
            <BriefViewTab clientId={client.id} />
            <FeedbackTab feedback={feedback} />
            <ClientCampaignsTab client={client} />
            <PerformanceTab client={client} />
          </div>
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

/* --------- Overview --------- */
function OverviewTab({ client, platforms, goals, feedback }: any) {
  const active = platforms.filter((p: any) => p.active);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Snapshot</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row k="Niche" v={nicheLabel(client.niche)} />
          <Row k="Status" v={<Badge variant="secondary" className="uppercase text-[10px]">{client.status}</Badge>} />
          <Row k="Website" v={client.website ? <a className="text-accent underline" href={client.website} target="_blank" rel="noreferrer">{client.website}</a> : "—"} />
          <Row k="Contact" v={client.contact_person || "—"} />
          <Row k="Email" v={client.contact_email || "—"} />
          <Row k="Active platforms" v={active.length ? active.map((p: any) => p.platform).join(", ") : "—"} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Goals & feedback</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row k="Open goals" v={goals.filter((g: any) => g.status === "in_progress").length} />
          <Row k="Total goals" v={goals.length} />
          <Row k="Feedback entries" v={feedback.length} />
          <Row k="Last feedback" v={feedback[0] ? new Date(feedback[0].created_at).toLocaleDateString() : "—"} />
        </CardContent>
      </Card>
    </div>
  );
}

/* --------- Brand --------- */
function BrandTab({ client, reload }: any) {
  const [form, setForm] = useState({
    brand_color: client.brand_color || "#E11D2E",
    tone_of_voice: client.tone_of_voice || "",
    target_audience: client.target_audience || "",
    competitors: client.competitors || "",
    objectives: client.objectives || "",
    notes: client.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("clients").update(form).eq("id", client.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved"); reload();
  };
  return (
    <Card><CardContent className="pt-6"><form onSubmit={save} className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Brand color"><Input type="color" value={form.brand_color} onChange={(e) => setForm({ ...form, brand_color: e.target.value })} className="h-10 w-20 p-1" /></Field>
      </div>
      <Field label="Target audience"><Textarea rows={2} value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })} /></Field>
      <Field label="Tone of voice"><Textarea rows={2} value={form.tone_of_voice} onChange={(e) => setForm({ ...form, tone_of_voice: e.target.value })} /></Field>
      <Field label="Competitors"><Textarea rows={2} value={form.competitors} onChange={(e) => setForm({ ...form, competitors: e.target.value })} /></Field>
      <Field label="Main objectives"><Textarea rows={2} value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} /></Field>
      <Field label="Internal notes"><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      <Button type="submit" disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save</>}
      </Button>
    </form></CardContent></Card>
  );
}

/* --------- Platforms --------- */
function PlatformsTab({ client, platforms, reload }: any) {
  const get = (v: string) => platforms.find((p: any) => p.platform === v);
  const toggle = async (platform: string, active: boolean) => {
    const existing = get(platform);
    if (existing) {
      const { error } = await supabase.from("client_platforms").update({ active }).eq("id", existing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("client_platforms").insert({ agency_id: client.agency_id, client_id: client.id, platform, active });
      if (error) return toast.error(error.message);
    }
    reload();
  };
  const updateHandle = async (platform: string, handle: string, url: string) => {
    const existing = get(platform);
    if (existing) {
      const { error } = await supabase.from("client_platforms").update({ handle, url }).eq("id", existing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("client_platforms").insert({ agency_id: client.agency_id, client_id: client.id, platform, handle, url, active: true });
      if (error) return toast.error(error.message);
    }
    reload();
  };
  return (
    <Card><CardContent className="pt-6 space-y-4">
      {PLATFORMS.map((p) => {
        const row = get(p.value);
        return (
          <div key={p.value} className="grid grid-cols-12 gap-3 items-center border-b border-border pb-3 last:border-0">
            <div className="col-span-3 font-medium text-sm">{p.label}</div>
            <div className="col-span-3"><Input placeholder="@handle" defaultValue={row?.handle || ""} onBlur={(e) => updateHandle(p.value, e.target.value, row?.url || "")} /></div>
            <div className="col-span-4"><Input placeholder="https://" defaultValue={row?.url || ""} onBlur={(e) => updateHandle(p.value, row?.handle || "", e.target.value)} /></div>
            <div className="col-span-2 flex items-center justify-end gap-2">
              <span className="text-xs text-muted-foreground">{row?.active ? "Active" : "Off"}</span>
              <Switch checked={!!row?.active} onCheckedChange={(v) => toggle(p.value, v)} />
            </div>
          </div>
        );
      })}
    </CardContent></Card>
  );
}

/* --------- Goals --------- */
function GoalsTab({ client, goals, reload }: any) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ objective: "", metric: "", target: "", deadline: "", status: "in_progress", notes: "" });
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.objective.trim()) return;
    const { error } = await supabase.from("monthly_goals").insert({
      agency_id: client.agency_id, client_id: client.id,
      objective: form.objective.trim(),
      metric: form.metric || null,
      target: form.target ? Number(form.target) : null,
      deadline: form.deadline || null,
      status: form.status,
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Goal added");
    setForm({ objective: "", metric: "", target: "", deadline: "", status: "in_progress", notes: "" });
    setAdding(false); reload();
  };
  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("monthly_goals").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    reload();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete goal?")) return;
    const { error } = await supabase.from("monthly_goals").delete().eq("id", id);
    if (error) return toast.error(error.message);
    reload();
  };
  return (
    <div className="space-y-4">
      <Card><CardContent className="pt-4">
        {!adding ? (
          <Button onClick={() => setAdding(true)} variant="outline"><Plus className="h-4 w-4 mr-1.5" /> Add goal</Button>
        ) : (
          <form onSubmit={create} className="space-y-3">
            <Field label="Objective *"><Input required value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="e.g. Generate 30 qualified leads" /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Metric"><Input value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} placeholder="leads, sales..." /></Field>
              <Field label="Target"><Input type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} /></Field>
              <Field label="Deadline"><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></Field>
            </div>
            <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            <div className="flex gap-2">
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">Save goal</Button>
              <Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </form>
        )}
      </CardContent></Card>

      {goals.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No goals yet.</CardContent></Card>
      ) : (
        <ul className="space-y-3">
          {goals.map((g: any) => (
            <li key={g.id}>
              <Card><CardContent className="pt-4 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-medium">{g.objective}</div>
                  <div className="text-xs text-muted-foreground">
                    {g.metric || "—"} {g.target ? `· target ${g.target}` : ""} {g.deadline ? `· by ${new Date(g.deadline).toLocaleDateString()}` : ""}
                  </div>
                  {g.notes && <div className="text-sm mt-1">{g.notes}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={g.status} onValueChange={(v) => updateStatus(g.id, v)}>
                    <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{GOAL_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(g.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent></Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* --------- Users / Invites / Feedback --------- */
function UsersTab({ users, reload }: any) {
  const remove = async (id: string) => {
    if (!confirm("Remove access?")) return;
    const { error } = await supabase.from("client_users").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed"); reload();
  };
  return (
    <Card><CardContent className="pt-6">
      {users.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">No client users yet.</div>
      ) : (
        <ul className="divide-y divide-border">
          {users.map((u: any) => (
            <li key={u.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{u.email}</div>
                <div className="text-xs text-muted-foreground">{u.role} · {u.status}</div>
              </div>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(u.id)}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      )}
    </CardContent></Card>
  );
}
function InvitesTab({ invites, reload }: any) {
  const revoke = async (id: string) => {
    if (!confirm("Revoke?")) return;
    const { error } = await supabase.from("client_invites").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Revoked"); reload();
  };
  return (
    <Card><CardContent className="pt-6">
      {invites.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">No invites.</div>
      ) : (
        <ul className="divide-y divide-border">
          {invites.map((i: any) => {
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
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => revoke(i.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
                {i.status === "pending" && <Input readOnly value={url} className="font-mono text-xs h-8" onFocus={(e) => e.currentTarget.select()} />}
              </li>
            );
          })}
        </ul>
      )}
    </CardContent></Card>
  );
}
function FeedbackTab({ feedback }: any) {
  return (
    <Card><CardContent className="pt-6">
      {feedback.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">No feedback submitted yet.</div>
      ) : (
        <ul className="space-y-4">
          {feedback.map((f: any) => (
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
              {f.objections && <Block label="Objections" value={f.objections} />}
              {f.promote_next_month && <Block label="Promote next month" value={f.promote_next_month} />}
            </li>
          ))}
        </ul>
      )}
    </CardContent></Card>
  );
}

/* --------- Settings (basic client fields) --------- */
function SettingsTab({ client, reload }: any) {
  const [form, setForm] = useState({
    name: client.name, niche: client.niche, status: client.status,
    city: client.city || "", website: client.website || "",
    contact_person: client.contact_person || "", contact_email: client.contact_email || "",
  });
  const [saving, setSaving] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("clients").update({
      ...form,
      city: form.city || null, website: form.website || null,
      contact_person: form.contact_person || null, contact_email: form.contact_email || null,
    } as any).eq("id", client.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved"); reload();
  };
  return (
    <Card><CardContent className="pt-6"><form onSubmit={save} className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name *"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Niche">
          <Select value={form.niche} onValueChange={(v) => setForm({ ...form, niche: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{NICHES.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
      </div>
      <Field label="Website"><Input type="url" placeholder="https://" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Contact name"><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></Field>
        <Field label="Contact email"><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></Field>
      </div>
      <Button type="submit" disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save</>}
      </Button>
    </form></CardContent></Card>
  );
}

/* --------- Performance (niche-aware) --------- */
function PerformanceTab({ client }: any) {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("videos")
      .select("id,client_id,platform,format,publish_date,video_url,hook,views,reach,likes,comments,shares,saves,calls,dms,completion_rate,recommendation,estimated_sales_impact")
      .eq("client_id", client.id)
      .order("publish_date", { ascending: false });
    setVideos(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, [client.id]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Video performance</h3>
        <Button size="sm" onClick={() => { setEditId(null); setEditorOpen(true); }} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plus className="h-4 w-4 mr-1.5" /> Add video
        </Button>
      </div>
      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <>
          <PerformanceStats videos={videos} />
          <VideosTable videos={videos} onEdit={(id) => { setEditId(id); setEditorOpen(true); }} />
        </>
      )}

      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">{nicheLabel(client.niche)} KPIs</h3>
        <NichePanel niche={client.niche} agencyId={client.agency_id} clientId={client.id} />
      </div>

      <VideoEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        agencyId={client.agency_id}
        clientId={client.id}
        videoId={editId}
        onSaved={load}
      />
    </div>
  );
}

/* --------- Client-scoped Tasks / Campaigns / Documents --------- */
import { TaskEditor } from "@/components/operations/TaskEditor";
import { DocumentsList } from "@/components/operations/DocumentsList";
import { TASK_STATUSES, TASK_PRIORITIES, CAMPAIGN_STATUSES, statusFor } from "@/lib/operations";

function ClientTasksTab({ client }: any) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: m }] = await Promise.all([
      supabase.from("tasks").select("*").eq("client_id", client.id).order("created_at", { ascending: false }),
      supabase.from("agency_members").select("user_id, profiles:user_id(full_name,email)").eq("agency_id", client.agency_id),
    ]);
    setTasks(t || []);
    setMembers((m || []).map((x: any) => ({ user_id: x.user_id, full_name: x.profiles?.full_name, email: x.profiles?.email })));
    setLoading(false);
  };
  useEffect(() => { load(); }, [client.id]);

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditId(null); setEditorOpen(true); }} className="bg-accent hover:bg-accent/90 text-accent-foreground"><Plus className="h-4 w-4 mr-1.5" /> New task</Button>
      </div>
      {tasks.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No tasks yet.</CardContent></Card>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => {
            const s = statusFor(TASK_STATUSES as any, t.status);
            const p = statusFor(TASK_PRIORITIES as any, t.priority);
            return (
              <li key={t.id}>
                <Card className="cursor-pointer hover:border-accent" onClick={() => { setEditId(t.id); setEditorOpen(true); }}>
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{t.title}</div>
                      <div className="text-[11px] text-muted-foreground">{t.deadline ? new Date(t.deadline).toLocaleDateString() : "No deadline"}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${p.color}`}>{p.label}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${s.color}`}>{s.label}</span>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <TaskEditor
        open={editorOpen} onOpenChange={setEditorOpen}
        agencyId={client.agency_id} taskId={editId}
        defaultClientId={client.id}
        clients={[{ id: client.id, name: client.name }]}
        members={members}
        onSaved={load}
      />
    </div>
  );
}

function ClientCampaignsTab({ client }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("campaigns").select("*").eq("client_id", client.id).order("start_date", { ascending: false, nullsFirst: false });
    setItems(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, [client.id]);
  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (items.length === 0) return (
    <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
      No campaigns yet. <Link to="/agency/campaigns" className="text-accent underline">Create one</Link>
    </CardContent></Card>
  );
  return (
    <ul className="space-y-2">
      {items.map((c) => {
        const s = statusFor(CAMPAIGN_STATUSES as any, c.status);
        return (
          <li key={c.id}>
            <Card>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{c.name}</div>
                  {c.objective && <div className="text-xs text-muted-foreground">{c.objective}</div>}
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {c.start_date ? new Date(c.start_date).toLocaleDateString() : "—"} → {c.end_date ? new Date(c.end_date).toLocaleDateString() : "—"}
                    {c.budget != null ? ` · €${Number(c.budget).toLocaleString()}` : ""}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${s.color}`}>{s.label}</span>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

function ClientDocumentsTab({ client }: any) {
  return <DocumentsList agencyId={client.agency_id} clientId={client.id} />;
}

function BriefViewTab({ clientId }: { clientId: string }) {
  const [brief, setBrief] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    getClientBrief(clientId).then((b) => setBrief(b)).finally(() => setLoading(false));
  }, [clientId]);
  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!brief) return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Client hasn't filled out the brief yet. They'll see it on first login.</CardContent></Card>;
  const tone = BRAND_TONES.find((t) => t.value === brief.brand_tone)?.label || brief.brand_tone || "—";
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Client brief</CardTitle>
            <Badge variant={brief.completed ? "default" : "secondary"} className="text-[10px] uppercase">{brief.completed ? "Submitted" : "Draft"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <BriefRow label="Business" value={brief.business_description} />
          <BriefRow label="Main 3-month objective" value={brief.main_objective} />
          <BriefRow label="Ideal customer" value={brief.target_audience} />
          <BriefRow label="Why them (USP)" value={brief.unique_selling_points} />
          <BriefRow label="Competitors" value={brief.main_competitors} />
          <BriefRow label="Brand tone" value={tone} />
          <BriefRow label="Content do's" value={brief.content_dos} />
          <BriefRow label="Content don'ts" value={brief.content_donts} />
          <BriefRow label="Preferred platforms" value={(brief.preferred_platforms || []).join(", ") || "—"} />
          <div className="grid grid-cols-2 gap-3">
            <BriefRow label="Posting frequency" value={brief.posting_frequency} />
            <BriefRow label="Budget" value={brief.budget_range} />
          </div>
          <BriefRow label="Extra notes" value={brief.extra_notes} />
        </CardContent>
      </Card>
    </div>
  );
}
function BriefRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm whitespace-pre-wrap mt-0.5">{value || "—"}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
function Row({ k, v }: { k: string; v: any }) {
  return <div className="flex justify-between gap-3 border-b border-border last:border-0 py-1.5"><span className="text-muted-foreground">{k}</span><span className="text-right">{v}</span></div>;
}
function Stat({ label, value }: { label: string; value: any }) {
  return <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="font-mono text-base">{value ?? "—"}</div></div>;
}
function Block({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="text-sm whitespace-pre-wrap">{value}</div></div>;
}

function ClientContentTab({ client }: any) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("content_posts").select("id,title,platform,status,scheduled_for").eq("client_id", client.id).order("scheduled_for", { ascending: false, nullsFirst: false });
      setPosts(data || []); setLoading(false);
    })();
  }, [client.id]);
  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  return (
    <Card><CardContent className="pt-4">
      <div className="flex justify-between mb-3"><div className="text-sm text-muted-foreground">{posts.length} posts</div><Link to={`/agency/content?client=${client.id}`}><Button size="sm" variant="outline">Open content board</Button></Link></div>
      {posts.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No content yet.</div>
        : <ul className="divide-y divide-border">{posts.slice(0, 30).map((p) => (
            <li key={p.id} className="py-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0"><div className="font-medium text-sm truncate">{p.title}</div><div className="text-[11px] text-muted-foreground">{p.platform || "—"} · {p.scheduled_for ? new Date(p.scheduled_for).toLocaleDateString() : "no date"}</div></div>
              <Badge variant="outline" className="text-[10px] uppercase">{p.status?.replace("_", " ")}</Badge>
            </li>))}</ul>}
    </CardContent></Card>
  );
}

function ClientCalendarLink({ client }: any) {
  return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground space-y-3">
    <div>The full calendar lives in the global content calendar, filtered to this client.</div>
    <Link to={`/agency/calendar?client=${client.id}`}><Button variant="outline">Open calendar</Button></Link>
  </CardContent></Card>;
}

function ClientApprovalsList({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("content_approvals").select("id,decision,status,comment,created_at,content_post_id,content_posts:content_post_id(title)").eq("client_id", clientId).order("created_at", { ascending: false });
      setItems(data || []); setLoading(false);
    })();
  }, [clientId]);
  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (items.length === 0) return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No approval requests yet.</CardContent></Card>;
  return <Card><CardContent className="pt-4"><ul className="divide-y divide-border">{items.map((a: any) => (
    <li key={a.id} className="py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium text-sm">{a.content_posts?.title || "—"}</div>
        <Badge variant="outline" className="text-[10px] uppercase">{(a.decision || a.status || "pending").replace("_", " ")}</Badge>
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{new Date(a.created_at).toLocaleString()}</div>
      {a.comment && <div className="text-sm mt-1 italic">"{a.comment}"</div>}
    </li>))}</ul></CardContent></Card>;
}
