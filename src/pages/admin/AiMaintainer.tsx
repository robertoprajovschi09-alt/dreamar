import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Play, Copy, Sparkles, CheckCircle2, XCircle, ListPlus, FlaskConical } from "lucide-react";
import { toast } from "sonner";

type Audit = { id: string; agency_id: string | null; audit_type: string; page_name: string | null; severity: string; ai_summary: string | null; findings: any[]; recommended_actions: any[]; created_at: string };
type Suggestion = { id: string; agency_id: string | null; title: string; description: string | null; category: string; priority: string; impact_score: number; effort_score: number; ai_reasoning: string | null; suggested_prompt_for_lovable: string | null; status: string; created_at: string; approved_at: string | null; implemented_at: string | null };
type Task = { id: string; agency_id: string | null; suggestion_id: string | null; title: string; description: string | null; task_type: string; priority: string; status: string; assigned_to: string | null; due_date: string | null; created_at: string };

const AUDIT_TYPES = ["ux", "copy", "dashboard", "onboarding", "pricing", "client_portal", "agency_dashboard", "conversion", "full"];
const SEV_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = { low: "outline", medium: "secondary", high: "default", critical: "destructive" };

export default function AiMaintainer() {
  const { profile, agency } = useUser();
  const isAdmin = !!profile?.is_saas_admin;
  const isOwner = isAdmin || profile?.role === "agency_owner";

  const [audits, setAudits] = useState<Audit[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [runOpen, setRunOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Run audit form
  const [auditType, setAuditType] = useState("ux");
  const [pageName, setPageName] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [extraCtx, setExtraCtx] = useState("");
  const [scope, setScope] = useState<"agency" | "global">("agency");

  async function loadAll() {
    setLoading(true);
    const [a, s, t] = await Promise.all([
      supabase.from("ai_website_audits").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("ai_improvement_suggestions").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("ai_maintenance_tasks").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setAudits((a.data || []) as Audit[]);
    setSuggestions((s.data || []) as Suggestion[]);
    setTasks((t.data || []) as Task[]);
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, []);

  const stats = useMemo(() => {
    const lastAudit = audits[0];
    const critical = suggestions.filter(s => s.priority === "critical" && s.status !== "implemented" && s.status !== "rejected").length;
    const newCount = suggestions.filter(s => s.status === "new").length;
    const approved = suggestions.filter(s => s.status === "approved").length;
    const tasksOpen = tasks.filter(t => t.status !== "done").length;
    const impact = suggestions.filter(s => s.status === "approved" || s.status === "in_progress").reduce((a, b) => a + (b.impact_score || 0), 0);
    return { lastAudit, critical, newCount, approved, tasksOpen, impact };
  }, [audits, suggestions, tasks]);

  const filteredSuggestions = useMemo(() => {
    if (filterStatus === "all") return suggestions;
    return suggestions.filter(s => s.status === filterStatus);
  }, [suggestions, filterStatus]);

  async function runAudit() {
    setRunning(true);
    const targetAgency = scope === "global" && isAdmin ? null : agency?.id ?? null;
    const { data, error } = await supabase.functions.invoke("ai-run-audit", {
      body: { agency_id: targetAgency, audit_type: auditType, page_name: pageName || null, page_url: pageUrl || null, context: extraCtx || null },
    });
    setRunning(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Audit complete — ${data?.suggestions_count ?? 0} suggestions generated`);
    setRunOpen(false);
    loadAll();
  }

  async function updateSuggestion(id: string, patch: Partial<Suggestion>) {
    const { error } = await supabase.from("ai_improvement_suggestions").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    loadAll();
  }

  async function approveSuggestion(s: Suggestion) {
    await updateSuggestion(s.id, { status: "approved", approved_at: new Date().toISOString(), approved_by: profile?.id } as any);
    toast.success("Approved");
  }
  async function rejectSuggestion(s: Suggestion) {
    await updateSuggestion(s.id, { status: "rejected" });
  }
  async function markImplemented(s: Suggestion) {
    await updateSuggestion(s.id, { status: "implemented", implemented_at: new Date().toISOString() } as any);
  }
  async function generateFixPrompt(s: Suggestion) {
    toast.loading("Generating Lovable prompt…", { id: "gen-" + s.id });
    const { data, error } = await supabase.functions.invoke("ai-generate-fix-prompt", { body: { suggestion_id: s.id } });
    toast.dismiss("gen-" + s.id);
    if (error) return toast.error(error.message);
    toast.success("Prompt updated");
    loadAll();
  }
  async function createTask(s: Suggestion) {
    const { error } = await supabase.from("ai_maintenance_tasks").insert({
      agency_id: s.agency_id, suggestion_id: s.id, title: s.title,
      description: s.description, task_type: s.category === "bug" ? "fix" : "improvement",
      priority: s.priority, status: "todo",
    });
    if (error) return toast.error(error.message);
    if (s.status === "approved") await updateSuggestion(s.id, { status: "in_progress" });
    else loadAll();
    toast.success("Task created");
  }
  async function updateTaskStatus(id: string, status: string) {
    const { error } = await supabase.from("ai_maintenance_tasks").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    loadAll();
  }
  async function copyPrompt(text: string | null) {
    if (!text) return toast.error("No prompt yet — generate one first");
    await navigator.clipboard.writeText(text);
    toast.success("Prompt copied");
  }

  if (!isOwner) return <div className="p-6 text-sm">Admin or Agency Owner only.</div>;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="AI Website/App Maintainer"
        subtitle="AI audits the product, prioritizes improvements, and generates Lovable-ready prompts. All actions require your approval."
        action={
          <Button size="sm" onClick={() => setRunOpen(true)} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            Run AI Audit
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="Last audit" value={stats.lastAudit ? new Date(stats.lastAudit.created_at).toLocaleDateString() : "—"} sub={stats.lastAudit?.audit_type} />
        <StatCard label="Critical" value={stats.critical} variant={stats.critical > 0 ? "destructive" : undefined} />
        <StatCard label="New suggestions" value={stats.newCount} />
        <StatCard label="Approved" value={stats.approved} />
        <StatCard label="Open tasks" value={stats.tasksOpen} />
        <StatCard label="Est. impact" value={stats.impact} sub="sum of impact" />
      </div>

      <Tabs defaultValue="suggestions">
        <TabsList>
          <TabsTrigger value="suggestions">Suggestions ({suggestions.length})</TabsTrigger>
          <TabsTrigger value="audits">Audits ({audits.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
        </TabsList>

        {/* Suggestions */}
        <TabsContent value="suggestions" className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filter:</span>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["all", "new", "reviewed", "approved", "rejected", "in_progress", "implemented"].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading && filteredSuggestions.length === 0 && <div className="text-sm text-muted-foreground">No suggestions yet. Run an AI Audit to generate some.</div>}
          {filteredSuggestions.map(s => (
            <Card key={s.id}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{s.title}</span>
                      <Badge variant={SEV_VARIANT[s.priority] ?? "secondary"}>{s.priority}</Badge>
                      <Badge variant="outline">{s.category}</Badge>
                      <Badge variant="outline">impact {s.impact_score}</Badge>
                      <Badge variant="outline">effort {s.effort_score}</Badge>
                      <Badge>{s.status}</Badge>
                    </div>
                    {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
                  </div>
                </div>
                {s.ai_reasoning && (
                  <pre className="text-xs whitespace-pre-wrap bg-muted/40 rounded p-2">{s.ai_reasoning}</pre>
                )}
                {s.suggested_prompt_for_lovable && (
                  <div className="bg-muted/30 rounded p-2 text-xs whitespace-pre-wrap font-mono">{s.suggested_prompt_for_lovable}</div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyPrompt(s.suggested_prompt_for_lovable)}><Copy className="h-3 w-3 mr-1" />Copy prompt</Button>
                  <Button size="sm" variant="outline" onClick={() => generateFixPrompt(s)}><Sparkles className="h-3 w-3 mr-1" />Generate Lovable Fix Prompt</Button>
                  <Button size="sm" variant="outline" onClick={() => createTask(s)}><ListPlus className="h-3 w-3 mr-1" />Create Task</Button>
                  {s.status !== "approved" && s.status !== "implemented" && (
                    <Button size="sm" onClick={() => approveSuggestion(s)}><CheckCircle2 className="h-3 w-3 mr-1" />Approve</Button>
                  )}
                  {s.status !== "rejected" && s.status !== "implemented" && (
                    <Button size="sm" variant="ghost" onClick={() => rejectSuggestion(s)}><XCircle className="h-3 w-3 mr-1" />Reject</Button>
                  )}
                  {s.status !== "implemented" && (
                    <Button size="sm" variant="secondary" onClick={() => markImplemented(s)}><FlaskConical className="h-3 w-3 mr-1" />Mark Implemented</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Audits */}
        <TabsContent value="audits" className="space-y-3">
          {audits.length === 0 && <div className="text-sm text-muted-foreground">No audits yet.</div>}
          {audits.map(a => (
            <Card key={a.id}>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                  <Badge variant={SEV_VARIANT[a.severity] ?? "secondary"}>{a.severity}</Badge>
                  <Badge variant="outline">{a.audit_type}</Badge>
                  {a.page_name && <span className="text-xs text-muted-foreground">{a.page_name}</span>}
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(a.created_at).toLocaleString()}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {a.ai_summary && <p className="text-sm">{a.ai_summary}</p>}
                {Array.isArray(a.findings) && a.findings.length > 0 && (
                  <div>
                    <div className="text-xs font-medium mb-1">Findings</div>
                    <ul className="text-xs space-y-1">
                      {a.findings.map((f: any, i: number) => (
                        <li key={i} className="border-l-2 border-border pl-2">
                          <span className="font-medium">[{f.severity ?? "?"}]</span> {f.problem} {f.evidence && <span className="text-muted-foreground"> — {f.evidence}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(a.recommended_actions) && a.recommended_actions.length > 0 && (
                  <div>
                    <div className="text-xs font-medium mb-1">Recommended actions</div>
                    <ul className="text-xs list-disc pl-4 space-y-1">
                      {a.recommended_actions.map((r: any, i: number) => <li key={i}>{typeof r === "string" ? r : JSON.stringify(r)}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks" className="space-y-3">
          {tasks.length === 0 && <div className="text-sm text-muted-foreground">No tasks yet.</div>}
          {tasks.map(t => (
            <Card key={t.id}>
              <CardContent className="pt-4 flex items-center gap-3 flex-wrap">
                <div className="flex-1">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {t.title}
                    <Badge variant={SEV_VARIANT[t.priority] ?? "secondary"}>{t.priority}</Badge>
                    <Badge variant="outline">{t.task_type}</Badge>
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                </div>
                <Select value={t.status} onValueChange={(v) => updateTaskStatus(t.id, v)}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["todo", "in_progress", "done", "blocked"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Run Audit Dialog */}
      <Dialog open={runOpen} onOpenChange={setRunOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Run AI Audit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Audit type</label>
              <Select value={auditType} onValueChange={setAuditType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {isAdmin && (
              <div>
                <label className="text-xs text-muted-foreground">Scope</label>
                <Select value={scope} onValueChange={(v) => setScope(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agency">Current agency</SelectItem>
                    <SelectItem value="global">Global (Super Admin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground">Page name (optional)</label>
              <Input value={pageName} onChange={(e) => setPageName(e.target.value)} placeholder="e.g. Agency Dashboard" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Page URL (optional)</label>
              <Input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder="/agency/dashboard" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Extra context (optional)</label>
              <Textarea value={extraCtx} onChange={(e) => setExtraCtx(e.target.value)} placeholder="Notes, complaints, screenshots descriptions, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRunOpen(false)}>Cancel</Button>
            <Button onClick={runAudit} disabled={running}>{running ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run audit"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, sub, variant }: { label: string; value: any; sub?: string; variant?: "destructive" }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-semibold ${variant === "destructive" ? "text-destructive" : ""}`}>{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}
