import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Check, ArrowLeft, ArrowRight, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { getClientBrief, saveClientBrief, BRAND_TONES, type ClientBrief } from "@/lib/brief";
import { PLATFORMS } from "@/lib/niches";
import { getNichePreset, type KpiField, type Question } from "@/lib/nichePresets";

type Props = {
  agencyId: string;
  agencyName: string;
  clientId: string;
  clientName: string;
  userId: string;
  onCompleted: () => void;
};

type PlatformState = {
  platform: string;
  enabled: boolean;
  handle: string;
  url: string;
};
type GoalDraft = { objective: string; metric: string; target: string };

const monthStart = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

export function QuickClientOnboarding({
  agencyId, agencyName, clientId, clientName, userId, onCompleted,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(1);

  // raw initial data
  const [client, setClient] = useState<any>(null);
  const [schemaRow, setSchemaRow] = useState<any>(null);
  const [briefRow, setBriefRow] = useState<ClientBrief | null>(null);

  // step 1
  const [platforms, setPlatforms] = useState<PlatformState[]>([]);
  // step 2
  const [goals, setGoals] = useState<GoalDraft[]>([]);
  // step 3
  const [kpiOn, setKpiOn] = useState<Record<string, boolean>>({});
  const [questionOn, setQuestionOn] = useState<Record<string, boolean>>({});
  // step 4
  const [bizDescription, setBizDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [mainObjective, setMainObjective] = useState("");
  const [usp, setUsp] = useState("");
  const [brandTone, setBrandTone] = useState("");
  const [neverDo, setNeverDo] = useState("");
  const [extraNotes, setExtraNotes] = useState("");

  // preset (resolved from schema row or fallback)
  const preset = useMemo(() => {
    const fromSchema: KpiField[] = (schemaRow?.kpi_fields as KpiField[] | undefined) || [];
    const fromSchemaQs: Question[] = (schemaRow?.monthly_questions as Question[] | undefined) || [];
    const fallbackKey = client?.niche && client.niche !== "custom" ? client.niche : null;
    const fallback = fallbackKey ? getNichePreset(fallbackKey) : null;
    return {
      kpi_fields: fromSchema.length ? fromSchema : (fallback?.kpi_fields || []),
      monthly_questions: fromSchemaQs.length ? fromSchemaQs : (fallback?.monthly_questions || []),
    };
  }, [schemaRow, client]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data: c }, { data: schema }, { data: plats }, brief] = await Promise.all([
          supabase.from("clients")
            .select("niche,custom_niche,niche_id,platforms,target_audience,brand_voice,tone_of_voice,notes")
            .eq("id", clientId).maybeSingle(),
          supabase.from("client_kpi_schemas").select("*").eq("client_id", clientId).maybeSingle(),
          supabase.from("client_platforms").select("platform,handle,url").eq("client_id", clientId),
          getClientBrief(clientId).catch(() => null),
        ]);
        if (cancelled) return;
        setClient(c);
        setSchemaRow(schema);
        setBriefRow(brief);

        // Resolve preset for step 2/3 init
        const fromSchema: KpiField[] = (schema?.kpi_fields as KpiField[] | undefined) || [];
        const fromSchemaQs: Question[] = (schema?.monthly_questions as Question[] | undefined) || [];
        const fallbackKey = c?.niche && c.niche !== "custom" ? c.niche : null;
        const fallback = fallbackKey ? getNichePreset(fallbackKey) : null;
        const kpiFields = fromSchema.length ? fromSchema : (fallback?.kpi_fields || []);
        const questions = fromSchemaQs.length ? fromSchemaQs : (fallback?.monthly_questions || []);

        // --- Step 1: platforms ---
        const existing = new Map<string, { handle: string | null; url: string | null }>();
        (plats || []).forEach((p: any) => existing.set(p.platform, { handle: p.handle, url: p.url }));
        const clientPlats: string[] = (c?.platforms as string[] | undefined) || [];
        const enabledSet = new Set<string>([...existing.keys(), ...clientPlats]);
        if (enabledSet.size === 0) {
          enabledSet.add("instagram"); enabledSet.add("facebook");
        }
        const platformInit: PlatformState[] = PLATFORMS.map((p) => ({
          platform: p.value,
          enabled: enabledSet.has(p.value),
          handle: existing.get(p.value)?.handle || "",
          url: existing.get(p.value)?.url || "",
        }));
        setPlatforms(platformInit);

        // --- Step 2: goals from KPI preset (first 3) ---
        const seedGoals: GoalDraft[] = (kpiFields.slice(0, 3)).map((k) => ({
          objective: `Mai mulți ${k.label.toLowerCase()}`,
          metric: k.label,
          target: "",
        }));
        if (seedGoals.length === 0) seedGoals.push({ objective: "", metric: "", target: "" });
        setGoals(seedGoals);

        // --- Step 3: KPI toggles all on by default ---
        const kpiState: Record<string, boolean> = {};
        kpiFields.forEach((k) => { kpiState[k.key] = true; });
        setKpiOn(kpiState);
        const qState: Record<string, boolean> = {};
        questions.forEach((q) => { qState[q.key] = true; });
        setQuestionOn(qState);

        // --- Step 4: brief prefill ---
        setBizDescription(brief?.business_description || c?.brand_voice || "");
        setTargetAudience(brief?.target_audience || c?.target_audience || "");
        setMainObjective(brief?.main_objective || "");
        setUsp(brief?.unique_selling_points || c?.notes || "");
        const toneMatch = BRAND_TONES.find((t) => t.value === (brief?.brand_tone || c?.tone_of_voice));
        setBrandTone(toneMatch?.value || "");
        setNeverDo(brief?.content_donts || "");
        setExtraNotes(brief?.extra_notes || "");
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  // ----- Step 1 actions -----
  const togglePlatform = (value: string) => {
    setPlatforms((arr) => arr.map((p) => p.platform === value ? { ...p, enabled: !p.enabled } : p));
  };
  const updatePlatformField = (value: string, patch: Partial<PlatformState>) => {
    setPlatforms((arr) => arr.map((p) => p.platform === value ? { ...p, ...patch } : p));
  };

  const savePlatforms = async () => {
    const enabled = platforms.filter((p) => p.enabled);
    if (enabled.length === 0) { toast.error("Alege cel puțin o platformă."); return false; }

    // Delete rows for platforms the client unchecked
    const enabledValues = enabled.map((p) => p.platform);
    const disabledValues = platforms.filter((p) => !p.enabled).map((p) => p.platform);
    if (disabledValues.length) {
      await supabase.from("client_platforms")
        .delete().eq("client_id", clientId).in("platform", disabledValues);
    }
    // Upsert enabled rows
    const rows = enabled.map((p) => ({
      agency_id: agencyId, client_id: clientId, platform: p.platform,
      handle: p.handle.trim() || null, url: p.url.trim() || null, active: true,
    }));
    if (rows.length) {
      const { error } = await supabase.from("client_platforms")
        .upsert(rows, { onConflict: "client_id,platform" });
      if (error) { toast.error(error.message); return false; }
    }
    // Update clients.platforms array
    await supabase.from("clients").update({ platforms: enabledValues }).eq("id", clientId);
    return true;
  };

  // ----- Step 2 actions -----
  const addGoal = () => setGoals((g) => [...g, { objective: "", metric: "", target: "" }]);
  const removeGoal = (i: number) => setGoals((g) => g.filter((_, x) => x !== i));
  const updateGoal = (i: number, patch: Partial<GoalDraft>) =>
    setGoals((g) => g.map((it, x) => x === i ? { ...it, ...patch } : it));

  const saveGoals = async () => {
    const valid = goals.filter((g) => g.objective.trim());
    if (valid.length === 0) { toast.error("Adaugă cel puțin un obiectiv."); return false; }
    const month = monthStart();
    await supabase.from("monthly_goals")
      .delete().eq("client_id", clientId).eq("month", month);
    const rows = valid.map((g) => ({
      agency_id: agencyId, client_id: clientId, month,
      objective: g.objective.trim(),
      metric: g.metric.trim() || null,
      target: g.target.trim() ? Number(g.target) : null,
      owner: userId, created_by: userId,
      status: "in_progress",
    }));
    const { error } = await supabase.from("monthly_goals").insert(rows as any);
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  // ----- Step 3 actions -----
  const saveKpiSchema = async () => {
    const confirmedKpis = preset.kpi_fields.filter((k) => kpiOn[k.key] !== false);
    const confirmedQs = preset.monthly_questions.filter((q) => questionOn[q.key] !== false);
    if (confirmedKpis.length === 0) { toast.error("Păstrează cel puțin un KPI."); return false; }

    const niche_key = schemaRow?.niche_key || (client?.niche === "custom" ? "custom" : client?.niche) || "custom";
    const custom_niche_label = schemaRow?.custom_niche_label
      ?? (client?.niche === "custom" ? (client?.custom_niche || null) : null);
    const business_impact_fields = (schemaRow?.business_impact_fields as any) || [];

    const payload: any = {
      agency_id: agencyId, client_id: clientId,
      niche_key, custom_niche_label,
      kpi_fields: confirmedKpis as any,
      business_impact_fields,
      monthly_questions: confirmedQs as any,
    };
    const { error } = await supabase.from("client_kpi_schemas")
      .upsert(payload, { onConflict: "client_id" });
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  // ----- Step 4 / finish -----
  const finish = async () => {
    if (!mainObjective.trim()) { toast.error("Spune-ne cum arată succesul."); return; }
    setBusy(true);
    try {
      const enabledPlatforms = platforms.filter((p) => p.enabled).map((p) => p.platform);
      const existing = await getClientBrief(clientId).catch(() => null);
      const brief: ClientBrief = {
        ...(existing || {}),
        agency_id: agencyId,
        client_id: clientId,
        submitted_by: userId,
        business_description: bizDescription.trim() || null,
        target_audience: targetAudience.trim() || null,
        main_objective: mainObjective.trim(),
        unique_selling_points: usp.trim() || null,
        brand_tone: brandTone || null,
        content_donts: neverDo.trim() || null,
        extra_notes: extraNotes.trim() || null,
        preferred_platforms: enabledPlatforms,
        completed: true,
      };
      await saveClientBrief(brief);

      // Fire-and-forget AI personalization
      supabase.functions.invoke("client-dashboard-personalize", {
        body: { client_id: clientId },
      }).catch(() => {});

      toast.success("Onboarding finalizat — îți deschidem dashboardul");
      onCompleted();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  // ----- Navigation -----
  const goNext = async () => {
    setBusy(true);
    try {
      let ok = true;
      if (step === 1) ok = await savePlatforms();
      else if (step === 2) ok = await saveGoals();
      else if (step === 3) ok = await saveKpiSchema();
      if (!ok) return;
      if (step < 4) setStep(step + 1);
      else await finish();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const STEP_TITLES = ["Platforme & conturi", "Obiective", "KPI", "Context business"];
  const progress = (step / 4) * 100;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0">
        <Logo />
        <div className="text-xs text-muted-foreground truncate ml-2">{agencyName}</div>
      </header>

      <main className="flex-1 w-full max-w-xl mx-auto px-4 md:px-6 py-5 md:py-8 pb-32">
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-accent font-semibold mb-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Bun venit
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Salut, {clientName}</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {agencyName} ți-a pregătit deja contul. Patru pași rapizi și ești gata.
          </p>
        </div>

        <div className="mb-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Pas {step} din 4</span>
            <span className="text-muted-foreground">{STEP_TITLES[step - 1]}</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">{STEP_TITLES[step - 1]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (
              <>
                <p className="text-xs text-muted-foreground">
                  Bifează platformele unde ești activ și adaugă username-ul / link-ul profilului.
                </p>
                <div className="space-y-2">
                  {platforms.map((p) => {
                    const meta = PLATFORMS.find((x) => x.value === p.platform);
                    return (
                      <div key={p.platform} className={`rounded-md border p-3 ${p.enabled ? "border-accent/40 bg-accent/5" : "border-border"}`}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={p.enabled} onCheckedChange={() => togglePlatform(p.platform)} />
                          <span className="text-sm font-medium">{meta?.label || p.platform}</span>
                        </label>
                        {p.enabled && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                            <Input
                              placeholder="@username"
                              value={p.handle}
                              onChange={(e) => updatePlatformField(p.platform, { handle: e.target.value })}
                            />
                            <Input
                              type="url"
                              placeholder="https://"
                              value={p.url}
                              onChange={(e) => updatePlatformField(p.platform, { url: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <p className="text-xs text-muted-foreground">
                  Am pregătit câteva obiective tipice pentru nișa ta. Modifică-le sau adaugă altele.
                </p>
                <div className="space-y-3">
                  {goals.map((g, i) => (
                    <div key={i} className="rounded-md border border-border p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Obiectiv (ex: Mai mulți leads calificați)"
                            value={g.objective}
                            onChange={(e) => updateGoal(i, { objective: e.target.value })}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Metrică"
                              value={g.metric}
                              onChange={(e) => updateGoal(i, { metric: e.target.value })}
                            />
                            <Input
                              type="number"
                              placeholder="Țintă"
                              value={g.target}
                              onChange={(e) => updateGoal(i, { target: e.target.value })}
                            />
                          </div>
                        </div>
                        {goals.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                            onClick={() => removeGoal(i)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addGoal} className="w-full">
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Adaugă obiectiv
                  </Button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <p className="text-xs text-muted-foreground">
                  Confirmă ce KPI-uri și întrebări lunare vrei să urmărim pentru tine.
                </p>
                {preset.kpi_fields.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">KPI urmărite</Label>
                    <div className="space-y-1.5">
                      {preset.kpi_fields.map((k) => (
                        <label key={k.key} className="flex items-center justify-between gap-2 p-2.5 rounded-md border border-border cursor-pointer hover:bg-muted/40">
                          <div className="flex items-center gap-2.5">
                            <Checkbox
                              checked={kpiOn[k.key] !== false}
                              onCheckedChange={(v) => setKpiOn((s) => ({ ...s, [k.key]: !!v }))}
                            />
                            <span className="text-sm">{k.label}</span>
                          </div>
                          {k.type && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.type}</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {preset.monthly_questions.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Întrebări lunare</Label>
                    <div className="space-y-1.5">
                      {preset.monthly_questions.map((q) => (
                        <label key={q.key} className="flex items-center gap-2.5 p-2.5 rounded-md border border-border cursor-pointer hover:bg-muted/40">
                          <Checkbox
                            checked={questionOn[q.key] !== false}
                            onCheckedChange={(v) => setQuestionOn((s) => ({ ...s, [q.key]: !!v }))}
                          />
                          <span className="text-sm">{q.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {step === 4 && (
              <>
                <p className="text-xs text-muted-foreground">
                  Câteva detalii care ne ajută să creăm conținut potrivit pentru tine.
                </p>
                <div className="space-y-2">
                  <Label className="text-sm">Ce face businessul tău?</Label>
                  <Textarea rows={3} value={bizDescription} onChange={(e) => setBizDescription(e.target.value)}
                    placeholder="Servicii / produse principale" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Cine sunt clienții tăi ideali?</Label>
                  <Textarea rows={2} value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="Vârstă, locație, nevoi..." />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Cum arată succesul în 90 de zile? *</Label>
                  <Textarea rows={3} value={mainObjective} onChange={(e) => setMainObjective(e.target.value)}
                    placeholder="Ex: telefonul sună mai des, agenda e plină, oameni vin menționând Instagram." />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">De ce te aleg oamenii (USP)?</Label>
                  <Textarea rows={2} value={usp} onChange={(e) => setUsp(e.target.value)}
                    placeholder="Ce te diferențiază de concurență" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Tonul brandului</Label>
                  <Select value={brandTone} onValueChange={setBrandTone}>
                    <SelectTrigger><SelectValue placeholder="Alege un ton" /></SelectTrigger>
                    <SelectContent>
                      {BRAND_TONES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Ce să NU postăm niciodată?</Label>
                  <Textarea rows={2} value={neverDo} onChange={(e) => setNeverDo(e.target.value)}
                    placeholder="Subiecte, cuvinte sau imagini interzise" />
                </div>
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Altceva ce ar trebui să știm? (opțional)</summary>
                  <Textarea className="mt-2" rows={3} value={extraNotes} onChange={(e) => setExtraNotes(e.target.value)}
                    placeholder="Constrângeri, oportunități, context intern…" />
                </details>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <div className="fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur px-4 py-3 md:px-6">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || busy}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Înapoi
          </Button>
          <Button
            type="button"
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={goNext}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              step < 4
                ? <>Continuă <ArrowRight className="h-4 w-4 ml-1.5" /></>
                : <><Check className="h-4 w-4 mr-1.5" /> Finalizează</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
