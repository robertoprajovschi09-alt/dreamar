import { useState, useMemo, useEffect } from "react";
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
  city: string;
  // 2
  niche: string; custom_niche: string; niche_id: string | null; creating_custom_niche: boolean;
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
  city: "",
  niche: "real_estate", custom_niche: "", niche_id: null, creating_custom_niche: false,
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
  { n: 1, title: "Date de bază" },
  { n: 2, title: "Nișă & KPI" },
  { n: 3, title: "Platforme" },
  { n: 4, title: "Obiective" },
  { n: 5, title: "Context" },
  { n: 6, title: "Invitație" },
  { n: 7, title: "Verificare" },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

function mapKpiTypeToLegacy(t?: string): "number" | "currency" | "percent" | "text" {
  if (t === "currency") return "currency";
  if (t === "percentage") return "percent";
  if (t === "text" || t === "boolean") return "text";
  return "number";
}

export function AddClientWizard({ open, onOpenChange, agencyId, onCreated }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const draftKey = `addClient.draft.${agencyId}`;
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(empty);
  const [busy, setBusy] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const clearDraft = () => {
    try { localStorage.removeItem(draftKey); } catch {}
    setHasDraft(false);
  };

  const reset = () => {
    setStep(1); setForm(empty); setInviteLink(null); setDraftLoaded(false);
  };
  const close = (v: boolean) => {
    if (!v && busy) return;
    onOpenChange(v);
    if (!v) setTimeout(reset, 200);
  };

  // Detect existing draft when dialog opens
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(draftKey);
      setHasDraft(!!raw);
    } catch { setHasDraft(false); }
  }, [open, draftKey]);

  // Autosave draft on every change while dialog is open
  useEffect(() => {
    if (!open) return;
    // Don't overwrite an existing draft until the user explicitly continues or discards it
    if (hasDraft && !draftLoaded) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ step, form, savedAt: Date.now() }));
    } catch {}
  }, [open, form, step, draftKey, hasDraft, draftLoaded]);

  const continueDraft = () => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.form) setForm({ ...empty, ...parsed.form });
        if (typeof parsed?.step === "number") setStep(parsed.step);
      }
    } catch {}
    setDraftLoaded(true);
    setHasDraft(false);
  };
  const discardDraft = () => {
    clearDraft();
    setDraftLoaded(true);
    setForm(empty);
    setStep(1);
  };

  // ----- Niche library -----
  const { data: nicheLib = [], refetch: refetchNiches } = useAgencyNiches(agencyId);

  const selectedNiche: NicheRow | null = useMemo(
    () => nicheLib.find((n) => n.id === form.niche_id) ?? null,
    [nicheLib, form.niche_id],
  );

  const applyNicheFromLibrary = (niche: NicheRow) => {
    // Map library rows into the editor structures (kept editable per-client).
    const kpis: KpiField[] = niche.kpis.length
      ? niche.kpis.map((k) => ({
          key: k.key, label: k.label,
          kpi_type: k.kpi_type, type: mapKpiTypeToLegacy(k.kpi_type),
          reporting_frequency: k.reporting_frequency,
          visible_to_client: k.visible_to_client,
        }))
      : (niche.is_custom ? [] : getNichePreset(niche.key).kpi_fields);
    const fields: KpiField[] = niche.fields.length
      ? niche.fields.map((f) => ({
          key: f.key, label: f.label,
          field_type: f.field_type, type: mapKpiTypeToLegacy(f.field_type),
        }))
      : (niche.is_custom ? [] : getNichePreset(niche.key).business_impact_fields);
    const qs: Question[] = niche.questions.length
      ? niche.questions.map((q) => ({ key: q.key, label: q.label }))
      : (niche.is_custom ? [] : getNichePreset(niche.key).monthly_questions);
    setForm((f) => ({
      ...f,
      niche_id: niche.id,
      niche: niche.is_custom ? "custom" : niche.key,
      custom_niche: niche.is_custom ? niche.label : "",
      creating_custom_niche: false,
      kpi_fields: kpis,
      business_impact_fields: fields,
      monthly_questions: qs,
    }));
  };

  const startCreatingCustomNiche = () => {
    setForm((f) => ({
      ...f,
      niche_id: null,
      niche: "custom",
      custom_niche: "",
      creating_custom_niche: true,
      kpi_fields: [{ key: "kpi_1", label: "", type: "number", kpi_type: "number", reporting_frequency: "monthly", visible_to_client: true }],
      business_impact_fields: [{ key: "bi_1", label: "", type: "number", field_type: "number" }],
      monthly_questions: [{ key: "q_1", label: "" }],
    }));
  };
  const addKpi = () => set("kpi_fields", [...form.kpi_fields, { key: `kpi_${form.kpi_fields.length + 1}`, label: "", type: "number", kpi_type: "number", reporting_frequency: "monthly", visible_to_client: true }]);
  const updateKpi = (i: number, patch: Partial<KpiField>) => {
    const next = [...form.kpi_fields];
    next[i] = { ...next[i], ...patch };
    if (patch.label) next[i].key = slug(patch.label) || next[i].key;
    set("kpi_fields", next);
  };
  const removeKpi = (i: number) => set("kpi_fields", form.kpi_fields.filter((_, x) => x !== i));

  const addBI = () => set("business_impact_fields", [...form.business_impact_fields, { key: `bi_${form.business_impact_fields.length + 1}`, label: "", type: "number", field_type: "number" }]);
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
    if (!form.name.trim()) { toast.error("Adaugă mai întâi numele clientului."); return; }
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
      toast.success("Bază de strategie generată");
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
      if (!form.name.trim()) return "Numele clientului este obligatoriu.";
    }
    if (step === 2) {
      if (!form.niche_id && !form.creating_custom_niche) return "Alege o nișă sau creează una personalizată.";
      if (form.creating_custom_niche) {
        if (!form.custom_niche.trim()) return "Introdu un nume pentru nișa personalizată.";
        if (!form.kpi_fields.some((k) => k.label.trim())) return "Adaugă cel puțin un KPI pentru nișa personalizată.";
      }
    }
    if (step === 6 && form.invite_enabled) {
      if (!form.invite_email.trim()) return "Introdu un email pentru invitație.";
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

      // 1) If creating a new custom niche, insert into the agency niche library first.
      let nicheId: string | null = form.niche_id;
      if (form.creating_custom_niche) {
        const niceLabel = form.custom_niche.trim();
        const niceKey = `${slug(niceLabel)}_${Date.now().toString(36)}`;
        const { data: nicheRow, error: nErr } = await supabase.from("niches").insert({
          agency_id: agencyId, key: niceKey, label: niceLabel, is_custom: true, created_by: user.id,
        }).select("id").single();
        if (nErr || !nicheRow) { toast.error(nErr?.message || "Nu s-a putut salva nișa personalizată"); return; }
        nicheId = nicheRow.id as string;

        const validKpis = form.kpi_fields.filter((k) => k.label.trim());
        if (validKpis.length) {
          await supabase.from("custom_niche_kpis").insert(validKpis.map((k, i) => ({
            niche_id: nicheId!, agency_id: agencyId,
            key: k.key || `kpi_${i + 1}`, label: k.label.trim(),
            kpi_type: (k.kpi_type as any) || "number",
            reporting_frequency: (k.reporting_frequency as any) || "monthly",
            visible_to_client: k.visible_to_client !== false,
            sort_order: i,
          })));
        }
        const validBI = form.business_impact_fields.filter((f) => f.label.trim());
        if (validBI.length) {
          await supabase.from("custom_niche_fields").insert(validBI.map((f, i) => ({
            niche_id: nicheId!, agency_id: agencyId,
            key: f.key || `bi_${i + 1}`, label: f.label.trim(),
            field_type: (f.field_type as any) || "number",
            sort_order: i,
          })));
        }
        const validQs = form.monthly_questions.filter((q) => q.label.trim());
        if (validQs.length) {
          await supabase.from("custom_niche_questions").insert(validQs.map((q, i) => ({
            niche_id: nicheId!, agency_id: agencyId,
            key: q.key || `q_${i + 1}`, label: q.label.trim(),
            sort_order: i,
          })));
        }
        refetchNiches();
      }

      const isCustom = form.creating_custom_niche || (selectedNiche?.is_custom ?? false);
      const clientPayload: any = {
        agency_id: agencyId,
        name: form.name.trim(),
        niche: isCustom ? "custom" : form.niche,
        custom_niche: isCustom ? (form.custom_niche.trim() || selectedNiche?.label || null) : null,
        niche_id: nicheId,
        website: form.website.trim() || null,
        city: form.city.trim() || null,
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
      if (cErr || !clientRow) { toast.error(cErr?.message || "Nu s-a putut crea clientul"); return; }
      const clientId = clientRow.id as string;

      // Per-client KPI snapshot (drives dashboard / analytics / monthly reports)
      await supabase.from("client_kpi_schemas").insert({
        agency_id: agencyId, client_id: clientId,
        niche_key: isCustom ? "custom" : form.niche,
        custom_niche_label: isCustom ? (form.custom_niche.trim() || selectedNiche?.label || null) : null,
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
        if (iErr) toast.error(`Client creat, invitația a eșuat: ${iErr.message}`);
        else {
          const link = `${window.location.origin}/accept-invite?token=${inv!.token}`;
          setInviteLink(link);
        }
      }

      toast.success("Spațiul de lucru al clientului a fost creat");
      clearDraft();
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
    toast.success("Link copiat");
  };

  const progress = (step / 7) * 100;
  const nicheLabelText = useMemo(
    () => form.creating_custom_niche ? (form.custom_niche || "Personalizată") : (selectedNiche?.label || "—"),
    [form.creating_custom_niche, form.custom_niche, selectedNiche],
  );

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <DialogTitle>Adaugă client nou</DialogTitle>
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
          {hasDraft && !draftLoaded && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-md border border-accent/40 bg-accent/5 text-sm">
              <span>Există un draft salvat. Continuăm de unde am rămas?</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={discardDraft}>Șterge</Button>
                <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={continueDraft}>Continuă</Button>
              </div>
            </div>
          )}
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Numele clientului / brandului *</Label>
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
              <div className="space-y-1.5">
                <Label>Oraș</Label>
                <Input placeholder="Opțional" value={form.city} onChange={(e) => set("city", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-muted text-sm">
                      {logoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Încarcă
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && onLogoFile(e.target.files[0])} />
                    </label>
                    {form.logo_url && <img src={form.logo_url} alt="logo" className="h-10 w-10 rounded object-cover border" />}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Culoare brand</Label>
                  <div className="flex gap-2">
                    <Input type="color" className="w-14 p-1 h-10" value={form.brand_color} onChange={(e) => set("brand_color", e.target.value)} />
                    <Input value={form.brand_color} onChange={(e) => set("brand_color", e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Persoană de contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Nume" value={form.contact_person} onChange={(e) => set("contact_person", e.target.value)} />
                  <Input placeholder="Telefon (opțional)" value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
                </div>
                <Input className="mt-3" type="email" placeholder="Email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Niche *</Label>
                <Select
                  value={form.creating_custom_niche ? "__new__" : (form.niche_id || "")}
                  onValueChange={(v) => {
                    if (v === "__new__") return startCreatingCustomNiche();
                    const n = nicheLib.find((x) => x.id === v);
                    if (n) applyNicheFromLibrary(n);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Alege o nișă…" /></SelectTrigger>
                  <SelectContent>
                    {nicheLib.some((n) => n.is_custom) && (
                      <div className="px-2 pt-1.5 pb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Nișele agenției mele</div>
                    )}
                    {nicheLib.filter((n) => n.is_custom).map((n) => (
                      <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>
                    ))}
                    <div className="px-2 pt-2 pb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Presetări globale</div>
                    {nicheLib.filter((n) => !n.is_custom).map((n) => (
                      <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>
                    ))}
                    <div className="px-2 pt-2 pb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Altele</div>
                    <SelectItem value="__new__">+ Creează nișă personalizată</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.creating_custom_niche && (
                <div className="space-y-1.5 rounded-md border border-dashed p-3 bg-muted/30">
                  <Label>Numele nișei personalizate *</Label>
                  <Input
                    autoFocus
                    placeholder="Ex: Clinică stomatologică, Hotel de lux, Dealer auto, Brutărie locală"
                    value={form.custom_niche}
                    onChange={(e) => set("custom_niche", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Această nișă va fi salvată în biblioteca agenției și reutilizabilă pentru clienții viitori.
                  </p>
                </div>
              )}

              <KpiEditor
                title="KPI personalizate"
                description="Metricile pe care vrei să le urmărești pentru această nișă."
                items={form.kpi_fields}
                onAdd={addKpi}
                onRemove={removeKpi}
                onUpdate={updateKpi}
              />
              <FieldEditor
                title="Câmpuri personalizate de impact în business"
                description="Ce completează clientul lunar (ex: clienți noi, vânzări, apeluri)."
                items={form.business_impact_fields}
                onAdd={addBI}
                onRemove={removeBI}
                onUpdate={updateBI}
                withType
              />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Întrebări lunare personalizate</Label>
                    <p className="text-xs text-muted-foreground">Întrebări deschise la care clientul răspunde lunar.</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={addQ}><Plus className="h-3 w-3 mr-1" />Adaugă</Button>
                </div>
                <div className="space-y-2">
                  {form.monthly_questions.map((q, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={q.label} onChange={(e) => updateQ(i, e.target.value)} placeholder="Întrebare" />
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
                <Label>Șabloane rapide de obiective</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {QUICK_GOALS.map((g) => (
                    <button type="button" key={g} onClick={() => addGoal(g)}
                      className="px-3 py-1.5 rounded-full text-sm border hover:bg-muted">
                      <Plus className="h-3 w-3 inline -mt-0.5 mr-1" />{g}
                    </button>
                  ))}
                  <button type="button" onClick={() => addGoal("")} className="px-3 py-1.5 rounded-full text-sm border bg-accent/10 hover:bg-accent/20">
                    <Plus className="h-3 w-3 inline -mt-0.5 mr-1" />Obiectiv personalizat
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {form.goals.map((g, i) => (
                  <div key={i} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Input placeholder="Numele obiectivului" value={g.name} onChange={(e) => updateGoal(i, { name: e.target.value })} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeGoal(i)}><X className="h-4 w-4" /></Button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <Input placeholder="Metrică țintă" value={g.metric} onChange={(e) => updateGoal(i, { metric: e.target.value })} />
                      <Input type="number" placeholder="Valoare țintă" value={g.target} onChange={(e) => updateGoal(i, { target: e.target.value })} />
                      <Input type="date" value={g.deadline} onChange={(e) => updateGoal(i, { deadline: e.target.value })} />
                      <Select value={g.priority} onValueChange={(v) => updateGoal(i, { priority: v as any })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Scăzută</SelectItem>
                          <SelectItem value="medium">Medie</SelectItem>
                          <SelectItem value="high">Înaltă</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea rows={2} placeholder="Note" value={g.notes} onChange={(e) => updateGoal(i, { notes: e.target.value })} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div className="space-y-3">
              <Field label="Ce vinde acest client?" v={form.sells} onChange={(v) => set("sells", v)} area />
              <Field label="Servicii / produse principale" v={form.services} onChange={(v) => set("services", v)} placeholder="Separate prin virgulă" />
              <Field label="Public țintă" v={form.target_audience} onChange={(v) => set("target_audience", v)} area />
              <Field label="Puncte unice de vânzare" v={form.usp} onChange={(v) => set("usp", v)} area />
              <Field label="Ton al vocii" v={form.tone_of_voice} onChange={(v) => set("tone_of_voice", v)} />
              <Field label="Concurenți" v={form.competitors} onChange={(v) => set("competitors", v)} area />
              <Field label="Obiecții frecvente" v={form.objections} onChange={(v) => set("objections", v)} area />
              <Field label="Oferte / promoții" v={form.offers} onChange={(v) => set("offers", v)} area />
              <Field label="Note importante" v={form.notes} onChange={(v) => set("notes", v)} area />

              <div className="border rounded-md p-3 bg-muted/40">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-accent" /> Generează baza de strategie</p>
                    <p className="text-xs text-muted-foreground">AI folosește ce ai introdus pentru a schița rezumat, piloni, KPI, idei de conținut.</p>
                  </div>
                  <Button type="button" onClick={generateStrategy} disabled={aiBusy}>
                    {aiBusy && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Generează
                  </Button>
                </div>
                {form.strategy && (
                  <div className="mt-3 text-sm space-y-2">
                    <p><b>Rezumat.</b> {form.strategy.summary}</p>
                    <StrategyList title="Piloni de conținut" items={form.strategy.content_pillars} />
                    <StrategyList title="KPI sugerate" items={form.strategy.suggested_kpis} />
                    <StrategyList title="Platforme recomandate" items={form.strategy.recommended_platforms} />
                    <StrategyList title="Idei inițiale de conținut" items={form.strategy.initial_content_ideas} />
                    <StrategyList title="Focus pentru raportarea lunară" items={form.strategy.monthly_reporting_focus} />
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
                  <p className="font-medium text-sm">Invită clientul în portal</p>
                  <p className="text-xs text-muted-foreground">Sari peste pentru a crea clientul fără invitație — o poți trimite mai târziu.</p>
                </div>
                <Switch checked={form.invite_enabled} onCheckedChange={(v) => set("invite_enabled", v)} />
              </div>
              {form.invite_enabled && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Numele utilizatorului client" value={form.invite_name} onChange={(e) => set("invite_name", e.target.value)} />
                    <Input type="email" placeholder="Email client" value={form.invite_email} onChange={(e) => set("invite_email", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Rol</Label>
                    <Select value={form.invite_role} onValueChange={(v) => set("invite_role", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Permisiuni</Label>
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
                  <SummaryCard title="KPI & impact">
                    <div className="flex flex-wrap gap-1">
                      {form.kpi_fields.map((k) => <Badge key={k.key} variant="secondary">{k.label || k.key}</Badge>)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{form.business_impact_fields.length} câmpuri de impact · {form.monthly_questions.length} întrebări lunare</p>
                  </SummaryCard>
                  <SummaryCard title="Platforme">
                    <div className="flex flex-wrap gap-1">
                      {form.platforms.map((p) => <Badge key={p.platform}>{PLATFORMS.find((x) => x.value === p.platform)?.label}</Badge>)}
                      {form.platforms.length === 0 && <span className="text-xs text-muted-foreground">Niciuna</span>}
                    </div>
                  </SummaryCard>
                  <SummaryCard title="Obiective">
                    {form.goals.length === 0 && <span className="text-xs text-muted-foreground">Niciunul</span>}
                    {form.goals.map((g, i) => (
                      <p key={i} className="text-sm">{g.name || "(fără nume)"} <span className="text-xs text-muted-foreground">— {g.priority}</span></p>
                    ))}
                  </SummaryCard>
                  <SummaryCard title="Invitație în portal">
                    <p className="text-sm">{form.invite_enabled ? `${form.invite_email} · ${form.invite_role}` : "Nu se trimite acum"}</p>
                  </SummaryCard>
                </>
              )}
              {inviteLink && (
                <div className="border rounded-md p-3 space-y-2 bg-accent/5">
                  <p className="font-medium text-sm">Link de invitație</p>
                  <div className="flex gap-2">
                    <Input readOnly value={inviteLink} />
                    <Button type="button" variant="outline" onClick={copyInvite}><Copy className="h-3.5 w-3.5" /></Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Trimite-l clientului; expiră în 7 zile.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t px-6 py-3 flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={back} disabled={step === 1 || busy}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Înapoi
          </Button>
          <div className="flex gap-2">
            {step < 7 && (
              <Button type="button" onClick={next} disabled={busy}>
                Înainte <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 7 && !inviteLink && (
              <Button type="button" onClick={provision} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Creează spațiu client
              </Button>
            )}
            {step === 7 && inviteLink && (
              <Button type="button" onClick={() => close(false)}>Gata</Button>
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

function KpiEditor({
  title, description, items, onAdd, onRemove, onUpdate,
}: {
  title: string; description?: string; items: KpiField[];
  onAdd: () => void; onRemove: (i: number) => void;
  onUpdate: (i: number, patch: Partial<KpiField>) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label>{title}</Label>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onAdd}><Plus className="h-3 w-3 mr-1" />Add KPI</Button>
      </div>
      <div className="space-y-2">
        {items.map((f, i) => (
          <div key={i} className="rounded-md border p-2 space-y-2 bg-muted/20">
            <div className="flex gap-2 items-center">
              <Input
                className="flex-1"
                value={f.label}
                onChange={(e) => onUpdate(i, { label: e.target.value })}
                placeholder="KPI name (e.g. Qualified leads)"
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(i)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-12 gap-2 items-center">
              <Select
                value={f.kpi_type || "number"}
                onValueChange={(v) => onUpdate(i, { kpi_type: v as any, type: mapKpiTypeToLegacy(v) })}
              >
                <SelectTrigger className="col-span-4"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={f.reporting_frequency || "monthly"}
                onValueChange={(v) => onUpdate(i, { reporting_frequency: v as any })}
              >
                <SelectTrigger className="col-span-4"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <label className="col-span-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={f.visible_to_client !== false}
                  onCheckedChange={(v) => onUpdate(i, { visible_to_client: v })}
                />
                Visible to client
              </label>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-muted-foreground">No KPIs yet. Add one to get started.</p>}
      </div>
    </div>
  );
}
