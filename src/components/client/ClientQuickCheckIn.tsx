import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getNicheConfig } from "@/lib/nicheDashboardConfigs";
import { getImpactConfig, type ImpactEntry } from "@/lib/businessImpactByNiche";
import { BusinessImpactSection } from "./BusinessImpactSection";

type Props = {
  agencyId: string;
  clientId: string;
  niche: string;
  userId: string;
  isNewClient?: boolean;
  onDone: () => void;
  onCancel?: () => void;
};

const PRIORITIES = [
  { key: "more_leads", label: "Mai multe lead-uri" },
  { key: "more_sales", label: "Mai multe vânzări" },
  { key: "more_bookings", label: "Mai multe rezervări/programări" },
  { key: "more_awareness", label: "Mai multă notorietate" },
  { key: "more_engagement", label: "Mai multă interacțiune" },
  { key: "promote_specific", label: "Promovarea unui produs/serviciu anume" },
  { key: "other", label: "Altceva" },
] as const;

const DIRECTIONS = [
  { key: "keep", label: "Nu, continuăm direcția" },
  { key: "more_education", label: "Da, mai mult conținut educativ" },
  { key: "more_sales", label: "Da, mai mult conținut de vânzare" },
  { key: "more_premium", label: "Da, mai mult conținut premium" },
  { key: "more_personal", label: "Da, mai mult conținut personal / din culise" },
  { key: "other", label: "Altceva" },
] as const;

const baseSchema = z.object({
  priority: z.string().min(1),
  priority_other: z.string().max(200).nullable(),
  promote_focus: z.string().trim().min(1, "Spune-ne ce vrei să promovăm").max(300),
  customer_feedback: z.string().max(500).nullable(),
  important_note: z.string().max(500).nullable(),
  satisfaction: z.number().int().min(1).max(5),
  direction_change: z.string().min(1),
  direction_change_other: z.string().max(200).nullable(),
});

export function ClientQuickCheckIn({ agencyId, clientId, niche, userId, isNewClient = false, onDone, onCancel }: Props) {
  const monthDate = useMemo(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0, 10);
  }, []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  const [priority, setPriority] = useState("more_leads");
  const [priorityOther, setPriorityOther] = useState("");
  const [promoteFocus, setPromoteFocus] = useState("");
  const [customerFeedback, setCustomerFeedback] = useState("");
  const [importantNote, setImportantNote] = useState("");
  const [satisfaction, setSatisfaction] = useState<number>(4);
  const [directionChange, setDirectionChange] = useState("keep");
  const [directionChangeOther, setDirectionChangeOther] = useState("");

  // Business Impact (dynamic per niche)
  const [customImpactFields, setCustomImpactFields] = useState<{ key: string; label: string; kind?: string }[] | null>(null);
  const impactConfig = useMemo(() => getImpactConfig(niche, customImpactFields), [niche, customImpactFields]);
  const [impactValues, setImpactValues] = useState<Record<string, ImpactEntry>>({});
  const setImpact = (k: string, e: ImpactEntry) => setImpactValues((s) => ({ ...s, [k]: e }));

  // Generic per-niche extras driven by NICHE_CONFIGS (extra qualitative questions)
  const nicheCfg = getNicheConfig(niche);
  const [nicheExtras, setNicheExtras] = useState<Record<string, any>>({});
  const setExtra = (k: string, v: any) => setNicheExtras((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    (async () => {
      const [feedback, schema] = await Promise.all([
        supabase.from("client_feedback").select("id").eq("client_id", clientId).eq("month", monthDate)
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        niche === "custom"
          ? supabase.from("client_kpi_schemas").select("business_impact_fields").eq("client_id", clientId).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      if (feedback.data) setAlreadyDone(true);
      if (schema?.data?.business_impact_fields) {
        const fields = (schema.data.business_impact_fields as any[])
          .map((f) => ({ key: f.key || f.id, label: f.label || f.name, kind: f.type || f.kind || "number" }))
          .filter((f) => f.key && f.label);
        if (fields.length) setCustomImpactFields(fields);
      }
      setLoading(false);
    })();
  }, [clientId, monthDate, niche]);

  const submit = async () => {
    const payload = {
      priority,
      priority_other: priority === "other" ? priorityOther.trim().slice(0, 200) : null,
      promote_focus: promoteFocus.trim(),
      customer_feedback: customerFeedback.trim() ? customerFeedback.trim().slice(0, 500) : null,
      important_note: importantNote.trim() ? importantNote.trim().slice(0, 500) : null,
      satisfaction,
      direction_change: directionChange,
      direction_change_other: directionChange === "other" ? directionChangeOther.trim().slice(0, 200) : null,
    };

    // For new clients we hide the retrospective questions, so don't require them.
    const Schema = isNewClient
      ? baseSchema.extend({
          customer_feedback: z.string().max(500).nullable().optional(),
          important_note: z.string().max(500).nullable().optional(),
        })
      : baseSchema;
    const parsed = Schema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Verifică câmpurile.");
      return;
    }

    // ----- Build Business Impact structured data -----
    const impactStructured: Record<string, any> = {};
    const impactMissing: string[] = [];
    const impactNotApplicable: string[] = [];
    const dbAggregates: Record<string, number> = {};
    let hasApprox = false;
    let hasAnyValue = false;

    impactConfig.fields.forEach((f) => {
      const entry = impactValues[f.key];
      if (!entry || entry.mode === "exact" || entry.mode === "approx") {
        const mode = entry?.mode || "exact";
        const raw = entry?.value ?? "";
        if (raw === "" || raw == null) return;
        if (f.kind === "number" || f.kind === "currency") {
          const n = Number(raw);
          if (!Number.isFinite(n)) return;
          impactStructured[f.key] = { mode, value: n };
          hasAnyValue = true;
          if (mode === "approx") hasApprox = true;
          if (f.db_field) dbAggregates[f.db_field] = (dbAggregates[f.db_field] || 0) + n;
        } else if (f.kind === "text") {
          const t = String(raw).trim().slice(0, 500);
          if (t) { impactStructured[f.key] = { mode, value: t }; hasAnyValue = true; }
        } else if (f.kind === "choice") {
          impactStructured[f.key] = { mode, value: raw };
          hasAnyValue = true;
        }
      } else if (entry.mode === "unknown") {
        impactStructured[f.key] = { mode: "unknown" };
        impactMissing.push(f.key);
      } else if (entry.mode === "not_applicable") {
        impactStructured[f.key] = { mode: "not_applicable" };
        impactNotApplicable.push(f.key);
      }
    });

    const realResults: Record<string, any> = {
      business_impact: impactStructured,
      business_impact_missing: impactMissing,
      business_impact_not_applicable: impactNotApplicable,
    };

    // Pack generic per-niche extras (qualitative questions only)
    if (nicheCfg) {
      const packed: Record<string, any> = {};
      nicheCfg.checkin_extras.forEach((f) => {
        const v = nicheExtras[f.key];
        if (v == null || v === "") return;
        if (f.kind === "number") {
          const n = Number(v);
          if (Number.isFinite(n)) packed[f.key] = n;
        } else if (f.kind === "text") {
          packed[f.key] = String(v).trim().slice(0, 500);
        } else {
          packed[f.key] = v;
        }
      });
      if (Object.keys(packed).length && niche) realResults[niche] = packed;
    }

    const observedReal = hasAnyValue ? "yes" : (impactMissing.length > 0 || impactNotApplicable.length > 0 ? "unknown" : "unknown");

    setSaving(true);
    try {
      // Mirror numeric impact into business_impact_entries (single aggregated row for the day)
      if (Object.keys(dbAggregates).length > 0) {
        const today = new Date().toISOString().slice(0, 10);
        const insertImpact: any = {
          agency_id: agencyId,
          client_id: clientId,
          created_by: userId,
          entry_date: today,
          ...dbAggregates,
        };
        if (hasApprox) insertImpact.qualitative_feedback = "Valori aproximative din quick check-in";
        await supabase.from("business_impact_entries").insert(insertImpact);
      }

      const insertRow: any = {
        agency_id: agencyId,
        client_id: clientId,
        submitted_by: userId,
        month: monthDate,
        feedback_text: payload.customer_feedback,
        real_life_impact: payload.important_note,
        promote_next_month: payload.promote_focus,
        calls_received: dbAggregates.calls || 0,
        messages_received: dbAggregates.dms || 0,
        bookings: dbAggregates.bookings || dbAggregates.appointments || 0,
        sales_estimate: dbAggregates.sales != null ? dbAggregates.sales : null,
        objections: JSON.stringify({ kind: "quick_check_in", v: 2, ...payload, results_metrics: realResults }),
      };

      const { error } = await supabase.from("client_feedback").insert(insertRow);
      if (error) throw error;

      const d = new Date();
      const checkinRow = {
        agency_id: agencyId,
        client_id: clientId,
        client_user_id: userId,
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        main_priority: payload.priority,
        priority_custom: payload.priority_other,
        promoted_focus: payload.promote_focus,
        observed_real_results: observedReal,
        real_results_data: realResults,
        customer_feedback: payload.customer_feedback,
        important_notes: payload.important_note,
        satisfaction_score: payload.satisfaction,
        requested_direction_change: payload.direction_change,
        direction_change_custom: payload.direction_change_other,
      };
      await supabase.from("client_checkins").upsert(checkinRow, { onConflict: "client_id,year,month" });

      toast.success("Mulțumim! Răspunsurile au fost trimise agenției.");
      supabase.functions.invoke("client-dashboard-context-generate", { body: { client_id: clientId } })
        .catch(() => { /* silent */ });
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>;
  }

  if (alreadyDone) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-3">
          <Check className="h-6 w-6 mx-auto text-emerald-500" />
          <div className="font-medium">Check-in completat luna aceasta</div>
          <p className="text-sm text-muted-foreground">Mulțumim! Agenția are deja răspunsurile tale.</p>
          {onCancel && <Button variant="outline" onClick={onCancel}>Înapoi la dashboard</Button>}
        </CardContent>
      </Card>
    );
  }

  const headTitle = isNewClient ? "Bine ai venit! Hai să pornim luna asta" : "Check-in lunar";
  const headSub = isNewClient
    ? "Spune-ne ce ne dorim luna aceasta — sub 2 minute"
    : "Cum a mers și ce facem luna asta — sub 2 minute";
  const q7Title = isNewClient ? "Ce direcție preferi pentru conținut?" : "Vrei să schimbăm ceva luna aceasta?";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-accent font-semibold">
            <Sparkles className="h-3 w-3" /> {headSub}
          </div>
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight mt-1">{headTitle}</h2>
        </div>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} className="rounded-full">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Înapoi
          </Button>
        )}
      </div>

      <Card className="rounded-2xl md:rounded-3xl">
        <CardContent className="p-5 md:p-7 space-y-7">
          <div className="space-y-5">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-accent">Planul lunii</div>

            <Section n={1} title="Care este prioritatea principală pentru luna aceasta?">
              <ChipGroup options={PRIORITIES.map((p) => ({ key: p.key, label: p.label }))} value={priority} onChange={setPriority} />
              {priority === "other" && (
                <Input className="mt-2" placeholder="Spune-ne mai multe…" value={priorityOther}
                  onChange={(e) => setPriorityOther(e.target.value)} maxLength={200} />
              )}
            </Section>

            <Section n={2} title="Ce vrei să promovăm prioritar luna aceasta?">
              <Input
                placeholder="ex: un serviciu, un produs, o ofertă, un eveniment, o proprietate, un meniu…"
                value={promoteFocus} onChange={(e) => setPromoteFocus(e.target.value)} maxLength={300}
              />
            </Section>

            <Section n={3} title="Există ceva important ce trebuie să știe agenția luna aceasta?">
              <Textarea rows={2} value={importantNote} onChange={(e) => setImportantNote(e.target.value)} maxLength={500}
                placeholder="ex: schimbăm orarul, lansăm un produs nou, suntem în concediu pe 10–18…" />
            </Section>

            <Section n={4} title={q7Title}>
              <div className="space-y-1.5">
                {DIRECTIONS.map((d) => (
                  <button key={d.key} type="button" onClick={() => setDirectionChange(d.key)}
                    className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition ${
                      directionChange === d.key ? "border-accent bg-accent/5" : "border-border hover:border-foreground/40"
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
              {directionChange === "other" && (
                <Input className="mt-2" placeholder="Spune-ne ce ai schimba…" value={directionChangeOther}
                  onChange={(e) => setDirectionChangeOther(e.target.value)} maxLength={200} />
              )}
            </Section>
          </div>

          {!isNewClient && (
            <div className="space-y-5 pt-2 border-t border-border/60">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-accent pt-4">Cum a mers până acum</div>

              <Section n={5} title="Impact business">
                <BusinessImpactSection
                  config={impactConfig}
                  values={impactValues}
                  onChange={setImpact}
                />
              </Section>

              {nicheCfg && (
                <div className="space-y-4 p-4 rounded-2xl border border-accent/30 bg-accent/5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-accent">{nicheCfg.checkin_section_title}</div>
                  {nicheCfg.checkin_extras.map((f) => (
                    <div key={f.key} className="space-y-1.5">
                      <Label className="text-xs">{f.label}</Label>
                      {f.kind === "number" && (
                        <Input type="number" min={0} value={nicheExtras[f.key] ?? ""} onChange={(e) => setExtra(f.key, e.target.value)} placeholder="—" />
                      )}
                      {f.kind === "text" && (
                        f.long
                          ? <Textarea rows={2} value={nicheExtras[f.key] ?? ""} onChange={(e) => setExtra(f.key, e.target.value)} placeholder={f.placeholder} maxLength={500} />
                          : <Input value={nicheExtras[f.key] ?? ""} onChange={(e) => setExtra(f.key, e.target.value)} placeholder={f.placeholder} maxLength={300} />
                      )}
                      {f.kind === "choice" && (
                        <ChipGroup options={f.options} value={nicheExtras[f.key] ?? ""} onChange={(v) => setExtra(f.key, v)} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <Section n={6} title="Ce feedback ai primit de la clienții tăi?">
                <Textarea rows={2} value={customerFeedback} onChange={(e) => setCustomerFeedback(e.target.value)} maxLength={500}
                  placeholder="ex: clienții au menționat reel-ul de marți, oamenii au sunat după postul cu oferta…" />
              </Section>

              <Section n={7} title="Cât de mulțumit ești de direcția actuală a conținutului?">
                <div className="flex gap-2 items-center flex-wrap">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setSatisfaction(n)}
                      className={`h-10 w-10 rounded-full border text-sm font-semibold transition ${
                        satisfaction === n ? "bg-accent text-accent-foreground border-accent" : "border-border hover:border-foreground/40"
                      }`}>
                      {n}
                    </button>
                  ))}
                  <div className="ml-2 text-xs text-muted-foreground">1 = deloc · 5 = foarte mulțumit</div>
                </div>
              </Section>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Badge variant="outline" className="text-[10px] rounded-full">Sub 2 minute</Badge>
            <Button onClick={submit} disabled={saving} className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1.5" /> Trimite check-in</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">
        <span className="text-accent mr-1.5">{n}.</span>{title}
      </div>
      {children}
    </div>
  );
}

function ChipGroup({ options, value, onChange }: { options: { key: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button key={o.key} type="button" onClick={() => onChange(o.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              active ? "bg-accent text-accent-foreground border-accent" : "border-border hover:border-foreground/40"
            }`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

