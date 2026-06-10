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
import { QuickClientOnboarding } from "@/components/client/QuickClientOnboarding";
import { getClientBrief } from "@/lib/brief";
import { ClientDashboard } from "@/components/client/ClientDashboard";
import { ClientQuickCheckIn } from "@/components/client/ClientQuickCheckIn";
import { brandStyle } from "@/lib/brandTheme";
import { useSignedUrl } from "@/lib/storage";
import { subscribeTables } from "@/lib/realtime";
import {
  fmtMonthYearRO, fmtDateRO, fmtDayShortRO,
  WEEKDAYS_RO_SHORT, goalStatusLabel, metricLabel,
} from "@/lib/i18nLabels";
import { useIsMobile } from "@/hooks/use-mobile";


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
  const [tab, setTab] = useState<string>("overview");

  const [isNewClient, setIsNewClient] = useState<boolean>(false);

  // Track last login for the agency to see
  useEffect(() => {
    supabase.rpc("touch_client_login").then(() => {});
  }, []);

  // Detect a brand-new client (no prior check-ins AND no published posts ever)
  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    (async () => {
      const [ci, pp] = await Promise.all([
        supabase.from("client_checkins").select("id", { count: "exact", head: true }).eq("client_id", client.id),
        supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("client_id", client.id).eq("status", "published"),
      ]);
      if (cancelled) return;
      setIsNewClient((ci.count || 0) === 0 && (pp.count || 0) === 0);
    })();
    return () => { cancelled = true; };
  }, [client?.id]);


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
          <p className="text-muted-foreground">Nu există încă niciun client asociat contului tău.</p>
          <Button onClick={async () => { await signOut(); navigate("/auth"); }} variant="outline" className="mt-4">Deconectare</Button>
        </div>
      </div>
    );
  }

  if (briefStatus === "loading") {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }
  if (briefStatus === "missing") {
    return (
      <QuickClientOnboarding
        agencyId={agency.id} agencyName={agency.name}
        clientId={client.id} clientName={client.name}
        userId={user!.id}
        onCompleted={() => setBriefStatus("done")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" style={brandStyle(client.brand_color)}>
      <header className="h-20 flex items-center justify-between px-4 md:px-8 gap-3 bg-background/80 backdrop-blur sticky top-0 z-30">
        <Logo />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggle} className="h-10 w-10 rounded-full bg-card shadow-soft border border-border/60">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-11 flex items-center gap-2 pl-1.5 pr-4 rounded-full bg-card shadow-soft border border-border/60 hover:bg-surface-1 transition-colors">
                <Avatar className="h-8 w-8"><AvatarFallback className="text-[11px] bg-gradient-accent text-accent-foreground font-bold">{initials(profile?.full_name || profile?.email || "?")}</AvatarFallback></Avatar>
                <span className="hidden sm:block text-xs font-semibold max-w-[140px] truncate">{profile?.full_name || profile?.email}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl">
              <DropdownMenuLabel className="text-xs">
                <div className="font-semibold truncate">{profile?.full_name || "Cont"}</div>
                <div className="text-muted-foreground truncate font-normal">{profile?.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => { await signOut(); navigate("/auth"); }}><LogOut className="h-4 w-4 mr-2" /> Deconectare</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <ClientLogoImg path={client.logo_url} name={client.name} />
          <div>
            <div className="text-xs uppercase tracking-widest font-semibold mb-1 text-accent">Portal client</div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{client.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {nicheLabel(client.niche)} {client.city ? `· ${client.city}` : ""} · administrat de <span className="text-foreground">{agency.name}</span>
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto rounded-full bg-muted p-1 gap-1">
            <TabsTrigger value="overview" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">Sumar</TabsTrigger>
            <TabsTrigger value="checkin" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">Check-in</TabsTrigger>
            <TabsTrigger value="calendar" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">Calendar</TabsTrigger>
            <TabsTrigger value="approvals" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">Aprobări</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">Rapoarte</TabsTrigger>
            <TabsTrigger value="results" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">Rezultate</TabsTrigger>
            <TabsTrigger value="objectives" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">Obiective</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">Documente</TabsTrigger>
            <TabsTrigger value="feedback" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">Feedback</TabsTrigger>
          </TabsList>
          <TabsContent value="overview"><ClientDashboard
            agencyId={agency.id} clientId={client.id} clientName={client.name} userId={user!.id}
            onStartCheckIn={() => setTab("checkin")}
            onOpenCalendar={() => setTab("calendar")}
            onOpenApprovals={() => setTab("approvals")}
            onOpenReports={() => setTab("reports")}
          /></TabsContent>
          <TabsContent value="checkin">
            <ClientQuickCheckIn
              agencyId={agency.id} clientId={client.id} niche={client.niche || ""} userId={user!.id}
              isNewClient={isNewClient}
              onDone={() => setTab("overview")} onCancel={() => setTab("overview")}
            />
          </TabsContent>
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

/* OverviewTab moved to ClientDashboard component */

function ObjectivesTab({ clientId }: { clientId: string }) {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("monthly_goals").select("*").eq("client_id", clientId).order("month", { ascending: false });
    setGoals(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, [clientId]);
  useEffect(() => subscribeTables(`client-goals-${clientId}`, [
    { table: "monthly_goals", filter: `client_id=eq.${clientId}` },
  ], load), [clientId]);
  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (goals.length === 0) return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Niciun obiectiv setat încă.</CardContent></Card>;
  return (
    <Card className="rounded-2xl md:rounded-3xl"><CardContent className="pt-4">
      <ul className="divide-y divide-border">
        {goals.map((g) => (
          <li key={g.id} className="py-3 flex items-center justify-between gap-2">
            <div>
              <div className="font-medium text-sm">{g.objective}</div>
              <div className="text-xs text-muted-foreground">{metricLabel(g.metric)} {g.target ? `· țintă ${g.target}` : ""} · {fmtMonthYearRO(g.month)}</div>
            </div>
            <Badge variant="secondary" className="text-[10px]">{goalStatusLabel(g.status)}</Badge>
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
  const isMobile = useIsMobile();
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

  const monthLabel = fmtMonthYearRO(month);
  // Only items inside the displayed month, for the agenda
  const monthItems = useMemo(() => items.filter((it) => {
    const d = new Date(it.scheduled_for);
    return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
  }), [items, month]);

  // Group by ISO day for the agenda view
  const grouped = useMemo(() => {
    const m = new Map<string, CalendarItem[]>();
    monthItems.forEach((it) => {
      const key = it.scheduled_for.slice(0, 10);
      const arr = m.get(key) || [];
      arr.push(it); m.set(key, arr);
    });
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [monthItems]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 justify-between">
        <Button variant="outline" size="icon" className="rounded-full" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="text-base font-semibold min-w-[180px] text-center capitalize">{monthLabel}</div>
        <Button variant="outline" size="icon" className="rounded-full" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : monthItems.length === 0 ? (
        <Card className="rounded-2xl md:rounded-3xl">
          <CardContent className="py-12 text-center space-y-2">
            <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <ChevronLeft className="h-4 w-4 opacity-0" />
            </div>
            <p className="text-sm text-muted-foreground">Nicio postare programată în <span className="capitalize">{monthLabel}</span>.</p>
          </CardContent>
        </Card>
      ) : isMobile ? (
        <div className="space-y-4">
          {grouped.map(([day, list]) => {
            const d = new Date(day);
            return (
              <div key={day} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground capitalize">{fmtDayShortRO(d)}</div>
                </div>
                <Card className="rounded-2xl">
                  <CardContent className="p-3 divide-y divide-border/60">
                    {list.map((it) => {
                      const m = statusMeta(it.status);
                      return (
                        <div key={it.id} className="py-2.5 first:pt-1 last:pb-1 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{it.title}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {it.platform || "—"} · {new Date(it.scheduled_for).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${m.color}`}>{m.label}</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      ) : (
        <MonthCalendar month={month} items={items} weekdayLabels={WEEKDAYS_RO_SHORT} />
      )}
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
  if (docs.length === 0) return <Card className="rounded-2xl md:rounded-3xl"><CardContent className="py-10 text-center text-sm text-muted-foreground">Niciun document partajat încă.</CardContent></Card>;
  return (
    <Card className="rounded-2xl md:rounded-3xl"><CardContent className="pt-4">
      <ul className="divide-y divide-border">
        {docs.map((d) => (
          <li key={d.id} className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{d.name}</div>
                <div className="text-[11px] text-muted-foreground">{d.folder} · {fmtDateRO(d.created_at)}</div>
              </div>
            </div>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => download(d)}><Download className="h-3.5 w-3.5 mr-1.5" /> Descarcă</Button>
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
    toast.success("Feedback trimis. Mulțumim!");
    setForm({ ...emptyForm, month: form.month });
    loadPast();
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl md:rounded-3xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4 text-accent" /> Feedback lunar și impact business</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Luna</Label><Input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label>Vânzări estimate (€)</Label><Input type="number" min="0" step="0.01" value={form.sales_estimate} onChange={(e) => setForm({ ...form, sales_estimate: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <NumField label="Apeluri primite" value={form.calls_received} onChange={(v) => setForm({ ...form, calls_received: v })} />
              <NumField label="Mesaje primite" value={form.messages_received} onChange={(v) => setForm({ ...form, messages_received: v })} />
              <NumField label="Rezervări" value={form.bookings} onChange={(v) => setForm({ ...form, bookings: v })} />
            </div>
            <div className="space-y-1.5"><Label>Feedback general</Label><Textarea rows={3} value={form.feedback_text} onChange={(e) => setForm({ ...form, feedback_text: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Impact real</Label><Textarea rows={2} value={form.real_life_impact} onChange={(e) => setForm({ ...form, real_life_impact: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Obiecții auzite de la clienți</Label><Textarea rows={2} value={form.objections} onChange={(e) => setForm({ ...form, objections: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Ce să promovăm luna viitoare?</Label><Textarea rows={2} value={form.promote_next_month} onChange={(e) => setForm({ ...form, promote_next_month: e.target.value })} /></div>
            <Button type="submit" disabled={busy} className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Trimite</>}</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl md:rounded-3xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Trimiterile tale anterioare</CardTitle></CardHeader>
        <CardContent>
          {pastLoading ? <div className="py-6 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            : past.length === 0 ? <div className="py-6 text-center text-sm text-muted-foreground">Nicio trimitere încă.</div>
            : <ul className="divide-y divide-border">{past.map((f) => (
                <li key={f.id} className="py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium capitalize">{fmtMonthYearRO(f.month)}</div>
                    <div className="text-xs text-muted-foreground">{fmtDateRO(f.created_at)}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{f.calls_received} apeluri · {f.messages_received} mesaje · {f.bookings} rezervări{f.sales_estimate ? ` · €${f.sales_estimate}` : ""}</div>
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

function ClientLogoImg({ path, name }: { path: string | null; name: string }) {
  const url = useSignedUrl(path);
  if (!path) return null;
  return <img src={url ?? undefined} alt={name} className="h-14 w-14 rounded-full object-cover border border-border bg-muted" />;
}
