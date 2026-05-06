import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClientApprovalsTab } from "@/components/approvals/ClientApprovalsTab";
import { ClientPortalAnalyticsTab } from "@/components/analytics/ClientPortalAnalyticsTab";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, LogOut, Moon, Sun, Send, MessageSquare, ChevronLeft, ChevronRight, Check, X, Download, FileIcon } from "lucide-react";
import { toast } from "sonner";
import { initials } from "@/lib/format";
import { MonthCalendar, type CalendarItem } from "@/components/content/MonthCalendar";
import { statusMeta } from "@/lib/content";
import { nicheLabel } from "@/lib/niches";
import { ClientReportsView } from "@/components/reports/ClientReportsView";
import { BriefWizard } from "@/components/client/BriefWizard";
import { getClientBrief } from "@/lib/brief";
import { NicheSummaryCard } from "@/components/client/NicheSummaryCard";


const monthInputDefault = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const emptyForm = {
  month: monthInputDefault(),
  feedback_text: "", calls_received: 0, messages_received: 0, bookings: 0,
  sales_estimate: "" as string, real_life_impact: "", objections: "", promote_next_month: "",
};

export default function ClientPortal() {
  const { signOut, user } = useAuth();
  const { profile, agency, client, loading } = useUser();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const [briefStatus, setBriefStatus] = useState<"loading" | "missing" | "done">("loading");

  // Track last login for the agency to see
  useEffect(() => {
    supabase.rpc("touch_client_login").then(() => {});
  }, []);


  useEffect(() => {
    if (!client) return;
    setBriefStatus("loading");
    getClientBrief(client.id)
      .then((b) => setBriefStatus(b?.completed ? "done" : "missing"))
      .catch(() => setBriefStatus("missing"));
  }, [client?.id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  if (!client || !agency) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-muted-foreground">No client is assigned to your account yet.</p>
          <Button onClick={async () => { await signOut(); navigate("/auth"); }} variant="outline" className="mt-4">Sign out</Button>
        </div>
      </div>
    );
  }

  if (briefStatus === "loading") {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }
  if (briefStatus === "missing") {
    return (
      <BriefWizard
        agencyId={agency.id} agencyName={agency.name}
        clientId={client.id} clientName={client.name}
        userId={user!.id}
        onCompleted={() => setBriefStatus("done")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 bg-background/80 backdrop-blur z-30">
        <Logo />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggle} className="h-9 w-9">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 px-2">
                <Avatar className="h-7 w-7"><AvatarFallback className="text-[11px] bg-accent text-accent-foreground">{initials(profile?.full_name || profile?.email || "?")}</AvatarFallback></Avatar>
                <span className="hidden sm:block text-sm font-medium max-w-[140px] truncate">{profile?.full_name || profile?.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">
                <div className="font-semibold truncate">{profile?.full_name || "Account"}</div>
                <div className="text-muted-foreground truncate font-normal">{profile?.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => { await signOut(); navigate("/auth"); }}><LogOut className="h-4 w-4 mr-2" /> Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 md:p-8 space-y-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-accent font-semibold mb-1">Client portal</div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {nicheLabel(client.niche)} {client.city ? `· ${client.city}` : ""} · managed by <span className="text-foreground">{agency.name}</span>
          </p>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="objectives">Objectives</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>
          <TabsContent value="overview"><OverviewTab clientId={client.id} niche={client.niche} /></TabsContent>
          <TabsContent value="calendar"><ClientCalendarTab clientId={client.id} /></TabsContent>
          <TabsContent value="approvals"><ClientApprovalsTab clientId={client.id} /></TabsContent>
          <TabsContent value="reports"><ClientReportsView clientId={client.id} /></TabsContent>
          <TabsContent value="results"><ClientPortalAnalyticsTab clientId={client.id} /></TabsContent>
          <TabsContent value="objectives"><ObjectivesTab clientId={client.id} /></TabsContent>
          <TabsContent value="documents"><ClientDocumentsTab clientId={client.id} /></TabsContent>
          <TabsContent value="feedback"><FeedbackTab clientId={client.id} agencyId={agency.id} userId={user!.id} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ---------------- Overview ---------------- */
function OverviewTab({ clientId, niche }: { clientId: string; niche: string }) {
  const [counts, setCounts] = useState<{ scheduled: number; awaiting: number; published: number }>({ scheduled: 0, awaiting: 0, published: 0 });
  const [goals, setGoals] = useState<any[]>([]);
  const [impact, setImpact] = useState<{ calls: number; dms: number; bookings: number; sales: number }>({ calls: 0, dms: 0, bookings: 0, sales: 0 });
  const [latestReport, setLatestReport] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
      const [a, b, c, g, imp, rep] = await Promise.all([
        supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "scheduled"),
        supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "sent_for_approval"),
        supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "published").gte("scheduled_for", monthStart.toISOString()),
        supabase.from("monthly_goals").select("*").eq("client_id", clientId).order("month", { ascending: false }).limit(5),
        supabase.from("business_impact_entries").select("calls,dms,bookings,sales,revenue_estimate").eq("client_id", clientId).gte("entry_date", monthStart.toISOString().slice(0,10)),
        supabase.from("reports").select("id,title,summary,period_start,period_end,created_at").eq("client_id", clientId).eq("client_visible", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setCounts({ scheduled: a.count || 0, awaiting: b.count || 0, published: c.count || 0 });
      setGoals(g.data || []);
      const totals = (imp.data || []).reduce((acc: any, r: any) => ({
        calls: acc.calls + (r.calls || 0),
        dms: acc.dms + (r.dms || 0),
        bookings: acc.bookings + (r.bookings || 0),
        sales: acc.sales + (r.sales || 0),
      }), { calls: 0, dms: 0, bookings: 0, sales: 0 });
      setImpact(totals);
      setLatestReport(rep.data);
    })();
  }, [clientId]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Scheduled" value={counts.scheduled} />
        <StatCard label="Awaiting your approval" value={counts.awaiting} accent />
        <StatCard label="Published this month" value={counts.published} />
      </div>

      <NicheSummaryCard clientId={clientId} niche={niche} />

      <Card>
        <CardHeader><CardTitle className="text-base">This month's business impact</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Mini label="Calls" value={impact.calls} />
            <Mini label="DMs" value={impact.dms} />
            <Mini label="Bookings" value={impact.bookings} />
            <Mini label="Sales" value={impact.sales} />
          </div>
        </CardContent>
      </Card>

      {latestReport && (
        <Card>
          <CardHeader><CardTitle className="text-base">Latest report from your agency</CardTitle></CardHeader>
          <CardContent>
            <div className="font-medium">{latestReport.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{latestReport.period_start} → {latestReport.period_end}</div>
            {latestReport.summary && <p className="text-sm mt-2 whitespace-pre-wrap">{latestReport.summary}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Monthly objectives</CardTitle></CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <div className="text-sm text-muted-foreground">No objectives set yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {goals.map((g) => (
                <li key={g.id} className="py-2.5 flex justify-between items-center gap-2">
                  <div>
                    <div className="font-medium text-sm">{g.objective}</div>
                    <div className="text-xs text-muted-foreground">{g.metric || "—"} {g.target ? `· target ${g.target}` : ""}</div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] uppercase">{g.status.replace("_", " ")}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ObjectivesTab({ clientId }: { clientId: string }) {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("monthly_goals").select("*").eq("client_id", clientId).order("month", { ascending: false });
      setGoals(data || []); setLoading(false);
    })();
  }, [clientId]);
  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (goals.length === 0) return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No objectives set yet.</CardContent></Card>;
  return (
    <Card><CardContent className="pt-4">
      <ul className="divide-y divide-border">
        {goals.map((g) => (
          <li key={g.id} className="py-3 flex items-center justify-between gap-2">
            <div>
              <div className="font-medium text-sm">{g.objective}</div>
              <div className="text-xs text-muted-foreground">{g.metric || "—"} {g.target ? `· target ${g.target}` : ""} · {new Date(g.month).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</div>
            </div>
            <Badge variant="secondary" className="text-[10px] uppercase">{g.status.replace("_", " ")}</Badge>
          </li>
        ))}
      </ul>
    </CardContent></Card>
  );
}
function Mini({ label, value }: { label: string; value: number | string }) {
  return <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="text-xl font-semibold font-mono mt-0.5">{value}</div></div>;
}
function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return <Card><CardContent className="pt-5"><div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div><div className={`text-3xl font-bold font-mono mt-1 ${accent ? "text-accent" : ""}`}>{value}</div></CardContent></Card>;
}

/* ---------------- Calendar ---------------- */
function ClientCalendarTab({ clientId }: { clientId: string }) {
  const [month, setMonth] = useState(new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const range = useMemo(() => {
    const s = new Date(month.getFullYear(), month.getMonth(), 1);
    const e = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    s.setDate(s.getDate() - 7); e.setDate(e.getDate() + 7);
    return { start: s.toISOString(), end: e.toISOString() };
  }, [month]);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("content_posts")
        .select("id,title,scheduled_for,status,platform,client_id")
        .eq("client_id", clientId)
        .not("scheduled_for", "is", null)
        .gte("scheduled_for", range.start)
        .lte("scheduled_for", range.end)
        .order("scheduled_for");
      setItems((data || []) as any); setLoading(false);
    })();
  }, [clientId, range.start, range.end]);
  const monthLabel = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 justify-end">
        <Button variant="outline" size="icon" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="text-sm font-medium min-w-[160px] text-center">{monthLabel}</div>
        <Button variant="outline" size="icon" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
      </div>
      {loading ? <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : <MonthCalendar month={month} items={items} />}
    </div>
  );
}

/* ---------------- Approvals ---------------- */
function ApprovalsTab({ clientId, agencyId, userId }: { clientId: string; agencyId: string; userId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("content_posts")
      .select("id,title,platform,scheduled_for,status,hook,caption,thumbnail_url,content_type,content_approvals(id,decision,comment,created_at)")
      .eq("client_id", clientId)
      .in("status", ["sent_for_approval", "approved"])
      .order("scheduled_for", { ascending: true, nullsFirst: false });
    setItems(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, [clientId]);

  const decide = async (post: any, decision: "approved" | "changes_requested") => {
    setBusyId(post.id);
    const comment = comments[post.id] || null;
    const { error: e1 } = await supabase.from("content_approvals").insert({
      agency_id: agencyId, client_id: clientId, content_post_id: post.id,
      decision, comment, decided_by: userId,
    });
    if (e1) { setBusyId(null); return toast.error(e1.message); }
    if (decision === "approved") {
      await supabase.from("content_posts").update({ status: "approved", approval_status: "approved" }).eq("id", post.id);
    } else {
      await supabase.from("content_posts").update({ approval_status: "changes_requested" }).eq("id", post.id);
    }
    setBusyId(null);
    toast.success(decision === "approved" ? "Approved" : "Changes requested");
    setComments({ ...comments, [post.id]: "" });
    load();
  };

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (items.length === 0) return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nothing waiting for your approval right now.</CardContent></Card>;

  return (
    <div className="space-y-3">
      {items.map((p) => {
        const m = statusMeta(p.status);
        const lastDecision = (p.content_approvals || []).slice(-1)[0];
        return (
          <Card key={p.id}>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {p.platform || "—"} · {p.content_type || "—"} {p.scheduled_for ? `· ${new Date(p.scheduled_for).toLocaleString()}` : ""}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${m.color}`}>{m.label}</span>
              </div>
              {p.hook && <Block label="Hook" value={p.hook} />}
              {p.caption && <Block label="Caption" value={p.caption} />}
              {p.thumbnail_url && <img src={p.thumbnail_url} alt={p.title} className="rounded max-h-48 border border-border" />}

              {lastDecision && (
                <div className="text-xs p-2 rounded bg-muted">
                  Last decision: <strong>{lastDecision.decision.replace("_", " ")}</strong> · {new Date(lastDecision.created_at).toLocaleString()}
                  {lastDecision.comment && <div className="mt-1">"{lastDecision.comment}"</div>}
                </div>
              )}

              {p.status === "sent_for_approval" && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Textarea rows={2} placeholder="Optional comment for the agency..." value={comments[p.id] || ""} onChange={(e) => setComments({ ...comments, [p.id]: e.target.value })} />
                  <div className="flex gap-2">
                    <Button onClick={() => decide(p, "approved")} disabled={busyId === p.id} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                      {busyId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1.5" /> Approve</>}
                    </Button>
                    <Button variant="outline" onClick={() => decide(p, "changes_requested")} disabled={busyId === p.id}>
                      <X className="h-4 w-4 mr-1.5" /> Request changes
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
function Block({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="text-sm whitespace-pre-wrap">{value}</div></div>;
}

/* ---------------- Documents (visible to client) ---------------- */
function ClientDocumentsTab({ clientId }: { clientId: string }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("documents").select("*").eq("client_id", clientId).eq("visibility", "client_visible").order("created_at", { ascending: false });
      setDocs(data || []); setLoading(false);
    })();
  }, [clientId]);
  const download = async (d: any) => {
    const { data, error } = await supabase.storage.from("agency-files").createSignedUrl(d.storage_path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };
  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (docs.length === 0) return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No documents shared with you yet.</CardContent></Card>;
  return (
    <Card><CardContent className="pt-4">
      <ul className="divide-y divide-border">
        {docs.map((d) => (
          <li key={d.id} className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{d.name}</div>
                <div className="text-[11px] text-muted-foreground">{d.folder} · {new Date(d.created_at).toLocaleDateString()}</div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => download(d)}><Download className="h-3.5 w-3.5 mr-1.5" /> Download</Button>
          </li>
        ))}
      </ul>
    </CardContent></Card>
  );
}

function FeedbackTab({ clientId, agencyId, userId }: { clientId: string; agencyId: string; userId: string }) {
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [past, setPast] = useState<any[]>([]);
  const [pastLoading, setPastLoading] = useState(true);

  const loadPast = async () => {
    setPastLoading(true);
    const { data } = await supabase.from("client_feedback").select("*").eq("client_id", clientId).eq("submitted_by", userId).order("created_at", { ascending: false });
    setPast(data || []); setPastLoading(false);
  };
  useEffect(() => { loadPast(); }, [clientId, userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("client_feedback").insert({
      agency_id: agencyId, client_id: clientId, submitted_by: userId,
      month: `${form.month}-01`,
      feedback_text: form.feedback_text || null,
      calls_received: Number(form.calls_received) || 0,
      messages_received: Number(form.messages_received) || 0,
      bookings: Number(form.bookings) || 0,
      sales_estimate: form.sales_estimate === "" ? null : Number(form.sales_estimate),
      real_life_impact: form.real_life_impact || null,
      objections: form.objections || null,
      promote_next_month: form.promote_next_month || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Feedback submitted. Thank you!");
    setForm({ ...emptyForm, month: form.month });
    loadPast();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4 text-accent" /> Monthly feedback & business impact</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Month</Label><Input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label>Sales estimate (€)</Label><Input type="number" min="0" step="0.01" value={form.sales_estimate} onChange={(e) => setForm({ ...form, sales_estimate: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <NumField label="Calls received" value={form.calls_received} onChange={(v) => setForm({ ...form, calls_received: v })} />
              <NumField label="Messages received" value={form.messages_received} onChange={(v) => setForm({ ...form, messages_received: v })} />
              <NumField label="Bookings" value={form.bookings} onChange={(v) => setForm({ ...form, bookings: v })} />
            </div>
            <div className="space-y-1.5"><Label>General feedback</Label><Textarea rows={3} value={form.feedback_text} onChange={(e) => setForm({ ...form, feedback_text: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Real-life impact</Label><Textarea rows={2} value={form.real_life_impact} onChange={(e) => setForm({ ...form, real_life_impact: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Objections heard from customers</Label><Textarea rows={2} value={form.objections} onChange={(e) => setForm({ ...form, objections: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>What should we promote next month?</Label><Textarea rows={2} value={form.promote_next_month} onChange={(e) => setForm({ ...form, promote_next_month: e.target.value })} /></div>
            <Button type="submit" disabled={busy} className="bg-accent hover:bg-accent/90 text-accent-foreground">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Submit</>}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Your previous submissions</CardTitle></CardHeader>
        <CardContent>
          {pastLoading ? <div className="py-6 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            : past.length === 0 ? <div className="py-6 text-center text-sm text-muted-foreground">No submissions yet.</div>
            : <ul className="divide-y divide-border">{past.map((f) => (
                <li key={f.id} className="py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{new Date(f.month).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</div>
                    <div className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{f.calls_received} calls · {f.messages_received} messages · {f.bookings} bookings{f.sales_estimate ? ` · €${f.sales_estimate}` : ""}</div>
                </li>
              ))}</ul>}
        </CardContent>
      </Card>
    </div>
  );
}
function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return <div className="space-y-1.5"><Label>{label}</Label><Input type="number" min="0" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} /></div>;
}
