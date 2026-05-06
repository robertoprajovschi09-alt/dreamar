import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PLATFORMS } from "@/lib/niches";
import { NICHE_PRESET_OPTIONS, getNichePreset, type KpiField, type Question } from "@/lib/nichePresets";
import { useAgencyNiches, type NicheRow } from "@/hooks/useAgencyNiches";
import { Switch } from "@/components/ui/switch";
import { Loader2, Check, ArrowLeft, ArrowRight, Copy, X, Sparkles, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agencyId: string;
  onCreated?: (clientId: string) => void;
};

const STATUSES = ["active", "onboarding", "paused"] as const;
const ROLES = [
  { value: "client_owner", label: "Client Owner" },
  { value: "client_viewer", label: "Client Viewer" },
];
const PERMISSION_DEFS = [
  { key: "approve_content", label: "Can approve content" },
  { key: "view_reports", label: "Can view reports" },
  { key: "upload_documents", label: "Can upload documents" },
  { key: "fill_business_impact", label: "Can complete business impact forms" },
  { key: "comment_on_content", label: "Can comment on content" },
];

const QUICK_GOALS = [
  "More leads", "More bookings", "More sales", "More followers",
  "More brand awareness", "Better engagement", "More website traffic",
  "Launch new service/product", "Improve content quality",
];

type PlatformEntry = { platform: string; url: string; username: string; starting_followers: string; objective: string };
type GoalEntry = { name: string; metric: string; target: string; deadline: string; priority: "low" | "medium" | "high"; notes: string };
type Strategy = {
  summary: string;
  content_pillars: string[];
  suggested_kpis: string[];
  recommended_platforms: string[];
  initial_content_ideas: string[];
  monthly_reporting_focus: string[];
};

type Form = {
  // 1
  name: string; website: string; logo_url: string; brand_color: string;
  contact_person: string; contact_email: string; contact_phone: string; status: string;
  // 2
  niche: string; custom_niche: string;
  kpi_fields: KpiField[]; business_impact_fields: KpiField[]; monthly_questions: Question[];
  // 3
  platforms: PlatformEntry[];
  // 4
  goals: GoalEntry[];
  // 5
  sells: string; services: string; target_audience: string; usp: string;
  tone_of_voice: string; competitors: string; objections: string; offers: string; notes: string;
  strategy: Strategy | null;
  // 6
  invite_enabled: boolean;
  invite_name: string; invite_email: string; invite_role: string;
  invite_permissions: Record<string, boolean>;
};

const empty: Form = {
  name: "", website: "", logo_url: "", brand_color: "#E11D2E",
  contact_person: "", contact_email: "", contact_phone: "", status: "active",
  niche: "real_estate", custom_niche: "",
  kpi_fields: getNichePreset("real_estate").kpi_fields,
  business_impact_fields: getNichePreset("real_estate").business_impact_fields,
  monthly_questions: getNichePreset("real_estate").monthly_questions,
  platforms: [],
  goals: [],
  sells: "", services: "", target_audience: "", usp: "",
  tone_of_voice: "", competitors: "", objections: "", offers: "", notes: "",
  strategy: null,
  invite_enabled: false,
  invite_name: "", invite_email: "", invite_role: "client_viewer",
  invite_permissions: { view_reports: true, comment_on_content: true },
};

const STEPS = [
  { n: 1, title: "Basics" },
  { n: 2, title: "Niche & KPIs" },
  { n: 3, title: "Platforms" },
  { n: 4, title: "Goals" },
  { n: 5, title: "Context" },
  { n: 6, title: "Invite" },
  { n: 7, title: "Review" },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export function AddClientWizard({ open, onOpenChange, agencyId, onCreated }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(empty);
  const [busy, setBusy] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const reset = () => {
    setStep(1); setForm(empty); setInviteLink(null);
  };
  const close = (v: boolean) => {
    if (!v && busy) return;
    onOpenChange(v);
    if (!v) setTimeout(reset, 200);
  };

  // ----- Step 2 helpers -----
  const applyNiche = (key: string) => {
    const p = getNichePreset(key);
    setForm((f) => ({
      ...f,
      niche: key,
      kpi_fields: p.kpi_fields.length ? p.kpi_fields : f.kpi_fields,
      business_impact_fields: p.business_impact_fields,
      monthly_questions: p.monthly_questions,
    }));
  };
  const addKpi = () => set("kpi_fields", [...form.kpi_fields, { key: `kpi_${form.kpi_fields.length + 1}`, label: "", type: "number" }]);
  const updateKpi = (i: number, patch: Partial<KpiField>) => {
    const next = [...form.kpi_fields];
    next[i] = { ...next[i], ...patch };
    if (patch.label) next[i].key = slug(patch.label) || next[i].key;
    set("kpi_fields", next);
  };
  const removeKpi = (i: number) => set("kpi_fields", form.kpi_fields.filter((_, x) => x !== i));

  const addBI = () => set("business_impact_fields", [...form.business_impact_fields, { key: `bi_${form.business_impact_fields.length + 1}`, label: "", type: "number" }]);
  const updateBI = (i: number, patch: Partial<KpiField>) => {
    const next = [...form.business_impact_fields];
    next[i] = { ...next[i], ...patch };
    if (patch.label) next[i].key = slug(patch.label) || next[i].key;
    set("business_impact_fields", next);
  };
  const removeBI = (i: number) => set("business_impact_fields", form.business_impact_fields.filter((_, x) => x !== i));

  const addQ = () => set("monthly_questions", [...form.monthly_questions, { key: `q_${form.monthly_questions.length + 1}`, label: "" }]);
  const updateQ = (i: number, label: string) => {
    const next = [...form.monthly_questions];
    next[i] = { key: slug(label) || next[i].key, label };
    set("monthly_questions", next);
  };
  const removeQ = (i: number) => set("monthly_questions", form.monthly_questions.filter((_, x) => x !== i));

  // ----- Step 3 platforms -----
  const togglePlatform = (p: string) => {
    const exists = form.platforms.find((x) => x.platform === p);
    if (exists) set("platforms", form.platforms.filter((x) => x.platform !== p));
    else set("platforms", [...form.platforms, { platform: p, url: "", username: "", starting_followers: "", objective: "" }]);
  };
  const updatePlatform = (p: string, patch: Partial<PlatformEntry>) =>
    set("platforms", form.platforms.map((x) => x.platform === p ? { ...x, ...patch } : x));

  // ----- Step 4 goals -----
  const addGoal = (name = "") => set("goals", [...form.goals, {
    name, metric: "", target: "", deadline: "", priority: "medium", notes: "",
  }]);
  const updateGoal = (i: number, patch: Partial<GoalEntry>) => {
    const next = [...form.goals];
    next[i] = { ...next[i], ...patch };
    set("goals", next);
  };
  const removeGoal = (i: number) => set("goals", form.goals.filter((_, x) => x !== i));

  // ----- Step 5 AI -----
  const generateStrategy = async () => {
    if (!form.name.trim()) { toast.error("Add the client name first."); return; }
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("client-strategy-base", {
        body: {
          name: form.name, niche: form.niche, custom_niche: form.custom_niche,
          sells: form.sells, services: form.services, target_audience: form.target_audience,
          usp: form.usp, tone_of_voice: form.tone_of_voice, competitors: form.competitors,
          objections: form.objections, offers: form.offers, notes: form.notes,
          platforms: form.platforms.map((p) => p.platform),
        },
      });
      if (error) { toast.error(error.message); return; }
      if ((data as any)?.error) { toast.error((data as any).error); return; }
      set("strategy", (data as any).strategy);
      toast.success("Strategy base generated");
    } finally { setAiBusy(false); }
  };

  // ----- Logo upload -----
  const onLogoFile = async (file: File) => {
    if (!file) return;
    setLogoUploading(true);
    try {
      // Temporary path; will be moved/renamed once we have client id. For simplicity store in agency-files/staging/<uid>/...
      const ext = file.name.split(".").pop() || "png";
      const path = `staging/${user?.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("agency-files").upload(path, file, { upsert: true });
      if (error) { toast.error(error.message); return; }
      const { data } = await supabase.storage.from("agency-files").createSignedUrl(path, 60 * 60 * 24 * 365);
      set("logo_url", data?.signedUrl || path);
    } finally { setLogoUploading(false); }
  };

  // ----- Validation -----
  const validateStep = (): string | null => {
    if (step === 1) {
      if (!form.name.trim()) return "Client name is required.";
    }
    if (step === 2) {
      if (form.niche === "custom" && !form.custom_niche.trim()) return "Enter a custom niche name.";
    }
    if (step === 6 && form.invite_enabled) {
      if (!form.invite_email.trim()) return "Enter an invite email.";
    }
    return null;
  };
  const next = () => {
    const err = validateStep();
    if (err) { toast.error(err); return; }
    setStep((s) => Math.min(7, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  // ----- Final create -----
  const provision = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const social_links: Record<string, string> = {};
      form.platforms.forEach((p) => { if (p.username || p.url) social_links[p.platform] = p.username || p.url; });

      const clientPayload: any = {
        agency_id: agencyId,
        name: form.name.trim(),
        niche: form.niche,
        custom_niche: form.niche === "custom" ? form.custom_niche.trim() : null,
        website: form.website.trim() || null,
        logo_url: form.logo_url || null,
        brand_color: form.brand_color || null,
        contact_person: form.contact_person.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        status: form.status,
        brand_voice: form.sells.trim() || null,
        tone_of_voice: form.tone_of_voice.trim() || null,
        target_audience: form.target_audience.trim() || null,
        competitors: form.competitors.trim() || null,
        services: form.services ? form.services.split(",").map((s) => s.trim()).filter(Boolean) : [],
        notes: form.notes.trim() || null,
        platforms: form.platforms.map((p) => p.platform),
        social_links,
        ai_strategy_base: form.strategy ?? null,
      };

      const { data: clientRow, error: cErr } = await supabase.from("clients").insert(clientPayload).select("id").single();
      if (cErr || !clientRow) { toast.error(cErr?.message || "Could not create client"); return; }
      const clientId = clientRow.id as string;

      // KPI schema
      await supabase.from("client_kpi_schemas").insert({
        agency_id: agencyId, client_id: clientId,
        niche_key: form.niche,
        custom_niche_label: form.niche === "custom" ? form.custom_niche.trim() : null,
        kpi_fields: form.kpi_fields as any,
        business_impact_fields: form.business_impact_fields as any,
        monthly_questions: form.monthly_questions as any,
      });

      // Platforms
      if (form.platforms.length) {
        await supabase.from("client_platforms").insert(form.platforms.map((p) => ({
          agency_id: agencyId, client_id: clientId, platform: p.platform,
          handle: p.username || null, url: p.url || null,
          starting_followers: p.starting_followers ? Number(p.starting_followers) : null,
          objective: p.objective || null,
        })));
      }

      // Goals
      if (form.goals.length) {
        const month = new Date(); month.setDate(1);
        const monthStr = month.toISOString().slice(0, 10);
        await supabase.from("monthly_goals").insert(form.goals.map((g) => ({
          agency_id: agencyId, client_id: clientId, month: monthStr,
          objective: g.name, metric: g.metric || null,
          target: g.target ? Number(g.target) : null,
          deadline: g.deadline || null,
          notes: [g.priority ? `Priority: ${g.priority}` : null, g.notes || null].filter(Boolean).join(" — ") || null,
          owner: user.id,
          created_by: user.id,
        })));
      }

      // Memory: business context
      const memoryRows: any[] = [];
      const ctxParts = [
        form.sells && `Sells: ${form.sells}`,
        form.services && `Services: ${form.services}`,
        form.target_audience && `Audience: ${form.target_audience}`,
        form.usp && `USP: ${form.usp}`,
        form.tone_of_voice && `Tone: ${form.tone_of_voice}`,
        form.competitors && `Competitors: ${form.competitors}`,
        form.objections && `Objections: ${form.objections}`,
        form.offers && `Offers: ${form.offers}`,
      ].filter(Boolean).join("\n");
      if (ctxParts) {
        memoryRows.push({
          agency_id: agencyId, client_id: clientId,
          memory_type: "business_context",
          title: `Business context — ${form.name}`,
          content: ctxParts,
          source_type: "client_brief", source_id: clientId,
          confidence_score: 0.9, visibility: "internal_agency",
          created_by: user.id,
        });
      }
      if (form.strategy) {
        memoryRows.push({
          agency_id: agencyId, client_id: clientId,
          memory_type: "business_context",
          title: `AI strategy base — ${form.name}`,
          content: form.strategy.summary,
          source_type: "ai_strategy_base", source_id: clientId,
          confidence_score: 0.7, visibility: "internal_agency",
          created_by: user.id,
        });
      }
      if (memoryRows.length) await supabase.from("ai_memory_items").insert(memoryRows);

      // Default onboarding tasks
      const defaultTasks = [
        "Confirm brand assets and access",
        "Schedule kickoff call",
        "Connect analytics & ad accounts",
        "Approve first content batch",
        "Set up monthly reporting cadence",
      ];
      await supabase.from("tasks").insert(defaultTasks.map((title) => ({
        agency_id: agencyId, client_id: clientId, title, task_type: "onboarding",
        status: "todo" as const, priority: "medium" as const, created_by: user.id,
      })));

      // Invite
      if (form.invite_enabled && form.invite_email.trim()) {
        const { data: inv, error: iErr } = await supabase.from("client_invites").insert({
          agency_id: agencyId, client_id: clientId,
          email: form.invite_email.trim().toLowerCase(),
          display_name: form.invite_name.trim() || null,
          portal_role: form.invite_role,
          permissions: form.invite_permissions as any,
          invited_by: user.id,
        }).select("token").single();
        if (iErr) toast.error(`Client created, invite failed: ${iErr.message}`);
        else {
          const link = `${window.location.origin}/accept-invite?token=${inv!.token}`;
          setInviteLink(link);
        }
      }

      toast.success("Client workspace created");
      onCreated?.(clientId);
      if (!form.invite_enabled) {
        close(false);
        navigate(`/agency/clients/${clientId}`);
      } else {
        // keep dialog open so they can copy link
        setStep(7);
      }
    } finally { setBusy(false); }
  };

  const copyInvite = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    toast.success("Link copied");
  };

  const progress = (step / 7) * 100;
  const nicheLabelText = useMemo(
    () => form.niche === "custom" ? (form.custom_niche || "Custom") : (NICHE_PRESET_OPTIONS.find((n) => n.value === form.niche)?.label || form.niche),
    [form.niche, form.custom_niche],
  );

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <DialogTitle>Add new client</DialogTitle>
          </div>
          <div className="mt-3 space-y-2">
            <Progress value={progress} className="h-1.5" />
            <div className="flex items-center justify-between text-xs gap-1 overflow-x-auto">
              {STEPS.map((s) => (
                <div key={s.n} className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap",
                  step === s.n ? "text-foreground font-medium" : step > s.n ? "text-accent" : "text-muted-foreground",
                )}>
                  <span className={cn(
                    "h-5 w-5 rounded-full inline-flex items-center justify-center text-[10px] shrink-0",
                    step === s.n ? "bg-accent text-accent-foreground" :
                    step > s.n ? "bg-accent/20 text-accent" : "bg-muted",
                  )}>
                    {step > s.n ? <Check className="h-3 w-3" /> : s.n}
                  </span>
                  <span className="hidden md:inline">{s.title}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Client / brand name *</Label>
                <Input autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input type="url" placeholder="https://" value={form.website} onChange={(e) => set("website", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-muted text-sm">
                      {logoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Upload
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && onLogoFile(e.target.files[0])} />
                    </label>
                    {form.logo_url && <img src={form.logo_url} alt="logo" className="h-10 w-10 rounded object-cover border" />}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Brand color</Label>
                  <div className="flex gap-2">
                    <Input type="color" className="w-14 p-1 h-10" value={form.brand_color} onChange={(e) => set("brand_color", e.target.value)} />
                    <Input value={form.brand_color} onChange={(e) => set("brand_color", e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Primary contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Name" value={form.contact_person} onChange={(e) => set("contact_person", e.target.value)} />
                  <Input placeholder="Phone (optional)" value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
                </div>
                <Input className="mt-3" type="email" placeholder="Email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Niche *</Label>
                  <Select value={form.niche} onValueChange={applyNiche}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NICHE_PRESET_OPTIONS.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {form.niche === "custom" && (
                  <div className="space-y-1.5">
                    <Label>Custom niche name *</Label>
                    <Input autoFocus placeholder="e.g. Dentist Clinic" value={form.custom_niche} onChange={(e) => set("custom_niche", e.target.value)} />
                  </div>
                )}
              </div>

              <FieldEditor
                title="KPI fields"
                description="Metrics tracked monthly for this client."
                items={form.kpi_fields}
                onAdd={addKpi}
                onRemove={removeKpi}
                onUpdate={updateKpi}
                withType
              />
              <FieldEditor
                title="Business impact fields"
                description="Real-world outcomes the client reports each month."
                items={form.business_impact_fields}
                onAdd={addBI}
                onRemove={removeBI}
                onUpdate={updateBI}
                withType
              />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Monthly questions</Label>
                    <p className="text-xs text-muted-foreground">Asked to the client every month.</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={addQ}><Plus className="h-3 w-3 mr-1" />Add</Button>
                </div>
                <div className="space-y-2">
                  {form.monthly_questions.map((q, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={q.label} onChange={(e) => updateQ(i, e.target.value)} placeholder="Question" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeQ(i)}><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Active platforms</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {PLATFORMS.map((p) => {
                    const active = !!form.platforms.find((x) => x.platform === p.value);
                    return (
                      <button type="button" key={p.value} onClick={() => togglePlatform(p.value)}
                        className={cn("px-3 py-1.5 rounded-full text-sm border transition-colors",
                          active ? "bg-accent text-accent-foreground border-accent" : "bg-background hover:bg-muted")}>
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {form.platforms.map((p) => (
                <div key={p.platform} className="border rounded-md p-3 space-y-2">
                  <p className="font-medium text-sm">{PLATFORMS.find((x) => x.value === p.platform)?.label}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Profile URL" value={p.url} onChange={(e) => updatePlatform(p.platform, { url: e.target.value })} />
                    <Input placeholder="Username / handle" value={p.username} onChange={(e) => updatePlatform(p.platform, { username: e.target.value })} />
                    <Input type="number" placeholder="Starting followers" value={p.starting_followers} onChange={(e) => updatePlatform(p.platform, { starting_followers: e.target.value })} />
                    <Input placeholder="Main objective" value={p.objective} onChange={(e) => updatePlatform(p.platform, { objective: e.target.value })} />
                  </div>
                </div>
              ))}
              {form.platforms.length === 0 && (
                <p className="text-sm text-muted-foreground">Pick at least one platform to configure handles & objectives.</p>
              )}
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <Label>Quick goal templates</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {QUICK_GOALS.map((g) => (
                    <button type="button" key={g} onClick={() => addGoal(g)}
                      className="px-3 py-1.5 rounded-full text-sm border hover:bg-muted">
                      <Plus className="h-3 w-3 inline -mt-0.5 mr-1" />{g}
                    </button>
                  ))}
                  <button type="button" onClick={() => addGoal("")} className="px-3 py-1.5 rounded-full text-sm border bg-accent/10 hover:bg-accent/20">
                    <Plus className="h-3 w-3 inline -mt-0.5 mr-1" />Custom goal
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {form.goals.map((g, i) => (
                  <div key={i} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Input placeholder="Goal name" value={g.name} onChange={(e) => updateGoal(i, { name: e.target.value })} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeGoal(i)}><X className="h-4 w-4" /></Button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <Input placeholder="Target metric" value={g.metric} onChange={(e) => updateGoal(i, { metric: e.target.value })} />
                      <Input type="number" placeholder="Target value" value={g.target} onChange={(e) => updateGoal(i, { target: e.target.value })} />
                      <Input type="date" value={g.deadline} onChange={(e) => updateGoal(i, { deadline: e.target.value })} />
                      <Select value={g.priority} onValueChange={(v) => updateGoal(i, { priority: v as any })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea rows={2} placeholder="Notes" value={g.notes} onChange={(e) => updateGoal(i, { notes: e.target.value })} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div className="space-y-3">
              <Field label="What does this client sell?" v={form.sells} onChange={(v) => set("sells", v)} area />
              <Field label="Main services / products" v={form.services} onChange={(v) => set("services", v)} placeholder="Comma separated" />
              <Field label="Target audience" v={form.target_audience} onChange={(v) => set("target_audience", v)} area />
              <Field label="Unique selling points" v={form.usp} onChange={(v) => set("usp", v)} area />
              <Field label="Tone of voice" v={form.tone_of_voice} onChange={(v) => set("tone_of_voice", v)} />
              <Field label="Competitors" v={form.competitors} onChange={(v) => set("competitors", v)} area />
              <Field label="Common objections" v={form.objections} onChange={(v) => set("objections", v)} area />
              <Field label="Offers / promotions" v={form.offers} onChange={(v) => set("offers", v)} area />
              <Field label="Important notes" v={form.notes} onChange={(v) => set("notes", v)} area />

              <div className="border rounded-md p-3 bg-muted/40">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-accent" /> Generate Client Strategy Base</p>
                    <p className="text-xs text-muted-foreground">AI uses what you've entered to draft summary, pillars, KPIs, content ideas.</p>
                  </div>
                  <Button type="button" onClick={generateStrategy} disabled={aiBusy}>
                    {aiBusy && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Generate
                  </Button>
                </div>
                {form.strategy && (
                  <div className="mt-3 text-sm space-y-2">
                    <p><b>Summary.</b> {form.strategy.summary}</p>
                    <StrategyList title="Content pillars" items={form.strategy.content_pillars} />
                    <StrategyList title="Suggested KPIs" items={form.strategy.suggested_kpis} />
                    <StrategyList title="Recommended platforms" items={form.strategy.recommended_platforms} />
                    <StrategyList title="Initial content ideas" items={form.strategy.initial_content_ideas} />
                    <StrategyList title="Monthly reporting focus" items={form.strategy.monthly_reporting_focus} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 6 */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <p className="font-medium text-sm">Invite client to portal</p>
                  <p className="text-xs text-muted-foreground">Skip to create the client without an invite — you can send one later.</p>
                </div>
                <Switch checked={form.invite_enabled} onCheckedChange={(v) => set("invite_enabled", v)} />
              </div>
              {form.invite_enabled && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Client user name" value={form.invite_name} onChange={(e) => set("invite_name", e.target.value)} />
                    <Input type="email" placeholder="Client email" value={form.invite_email} onChange={(e) => set("invite_email", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select value={form.invite_role} onValueChange={(v) => set("invite_role", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Permissions</Label>
                    {PERMISSION_DEFS.map((p) => (
                      <div key={p.key} className="flex items-center justify-between border rounded-md px-3 py-2">
                        <span className="text-sm">{p.label}</span>
                        <Switch checked={!!form.invite_permissions[p.key]}
                          onCheckedChange={(v) => set("invite_permissions", { ...form.invite_permissions, [p.key]: v })} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 7 */}
          {step === 7 && (
            <div className="space-y-4">
              {!inviteLink && (
                <>
                  <SummaryCard title="Client">
                    <p className="text-sm font-medium">{form.name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{nicheLabelText}{form.website ? ` · ${form.website}` : ""}</p>
                  </SummaryCard>
                  <SummaryCard title="KPIs & impact">
                    <div className="flex flex-wrap gap-1">
                      {form.kpi_fields.map((k) => <Badge key={k.key} variant="secondary">{k.label || k.key}</Badge>)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{form.business_impact_fields.length} business impact fields · {form.monthly_questions.length} monthly questions</p>
                  </SummaryCard>
                  <SummaryCard title="Platforms">
                    <div className="flex flex-wrap gap-1">
                      {form.platforms.map((p) => <Badge key={p.platform}>{PLATFORMS.find((x) => x.value === p.platform)?.label}</Badge>)}
                      {form.platforms.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                    </div>
                  </SummaryCard>
                  <SummaryCard title="Goals">
                    {form.goals.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                    {form.goals.map((g, i) => (
                      <p key={i} className="text-sm">{g.name || "(unnamed)"} <span className="text-xs text-muted-foreground">— {g.priority}</span></p>
                    ))}
                  </SummaryCard>
                  <SummaryCard title="Portal invite">
                    <p className="text-sm">{form.invite_enabled ? `${form.invite_email} · ${form.invite_role}` : "Not sending now"}</p>
                  </SummaryCard>
                </>
              )}
              {inviteLink && (
                <div className="border rounded-md p-3 space-y-2 bg-accent/5">
                  <p className="font-medium text-sm">Invite link</p>
                  <div className="flex gap-2">
                    <Input readOnly value={inviteLink} />
                    <Button type="button" variant="outline" onClick={copyInvite}><Copy className="h-3.5 w-3.5" /></Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Share this with the client; it expires in 7 days.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t px-6 py-3 flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={back} disabled={step === 1 || busy}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex gap-2">
            {step < 7 && (
              <Button type="button" onClick={next} disabled={busy}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 7 && !inviteLink && (
              <Button type="button" onClick={provision} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Create Client Workspace
              </Button>
            )}
            {step === 7 && inviteLink && (
              <Button type="button" onClick={() => close(false)}>Done</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, v, onChange, area, placeholder }: { label: string; v: string; onChange: (v: string) => void; area?: boolean; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {area
        ? <Textarea rows={2} value={v} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        : <Input value={v} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />}
    </div>
  );
}

function FieldEditor({
  title, description, items, onAdd, onRemove, onUpdate, withType,
}: {
  title: string; description?: string; items: KpiField[];
  onAdd: () => void; onRemove: (i: number) => void;
  onUpdate: (i: number, patch: Partial<KpiField>) => void;
  withType?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label>{title}</Label>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onAdd}><Plus className="h-3 w-3 mr-1" />Add</Button>
      </div>
      <div className="space-y-2">
        {items.map((f, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <Input className="col-span-7" value={f.label} onChange={(e) => onUpdate(i, { label: e.target.value })} placeholder="Field label" />
            {withType && (
              <Select value={f.type || "number"} onValueChange={(v) => onUpdate(i, { type: v as any })}>
                <SelectTrigger className="col-span-4"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                  <SelectItem value="percent">Percent</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => onRemove(i)}><X className="h-4 w-4" /></Button>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-muted-foreground">No fields yet.</p>}
      </div>
    </div>
  );
}

function StrategyList({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="list-disc list-inside text-sm">
        {items.map((x, i) => <li key={i}>{x}</li>)}
      </ul>
    </div>
  );
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-md p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{title}</p>
      {children}
    </div>
  );
}
