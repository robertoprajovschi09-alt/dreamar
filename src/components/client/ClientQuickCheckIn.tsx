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

type Props = {
  agencyId: string;
  clientId: string;
  niche: string;
  userId: string;
  onDone: () => void;
  onCancel?: () => void;
};

const PRIORITIES = [
  { key: "more_leads", label: "Mai multe lead-uri" },
  { key: "more_sales", label: "Mai multe vânzări" },
  { key: "more_bookings", label: "Mai multe rezervări/programări" },
  { key: "more_awareness", label: "Mai mult awareness" },
  { key: "more_engagement", label: "Mai mult engagement" },
  { key: "promote_specific", label: "Promovarea unui produs/serviciu anume" },
  { key: "other", label: "Altceva" },
] as const;

const DIRECTIONS = [
  { key: "keep", label: "Nu, continuăm direcția" },
  { key: "more_education", label: "Da, mai mult conținut educativ" },
  { key: "more_sales", label: "Da, mai mult conținut de vânzare" },
  { key: "more_premium", label: "Da, mai mult conținut premium" },
  { key: "more_personal", label: "Da, mai mult conținut personal/behind the scenes" },
  { key: "other", label: "Altceva" },
] as const;

const RESULT_METRICS_BY_NICHE: Record<string, { key: string; label: string }[]> = {
  real_estate: [
    { key: "leads", label: "Lead-uri" },
    { key: "viewings", label: "Vizionări" },
    { key: "messages", label: "Mesaje" },
    { key: "calls", label: "Apeluri" },
    { key: "price_inquiries", label: "Cereri de preț" },
  ],
  restaurant: [
    { key: "bookings", label: "Rezervări" },
    { key: "foot_traffic", label: "Trafic în locație" },
    { key: "messages", label: "Mesaje" },
    { key: "calls", label: "Apeluri" },
    { key: "new_clients", label: "Clienți noi" },
  ],
  dental: [
    { key: "appointments", label: "Programări" },
    { key: "calls", label: "Apeluri" },
    { key: "messages", label: "Mesaje" },
    { key: "new_clients", label: "Pacienți noi" },
    { key: "price_inquiries", label: "Cereri de preț" },
  ],
  fitness: [
    { key: "new_clients", label: "Membri noi" },
    { key: "bookings", label: "Trial booking" },
    { key: "messages", label: "Mesaje" },
    { key: "calls", label: "Apeluri" },
  ],
  ecommerce: [
    { key: "sales", label: "Vânzări" },
    { key: "leads", label: "Lead-uri" },
    { key: "messages", label: "Mesaje" },
    { key: "price_inquiries", label: "Cereri de preț" },
  ],
};

const GENERIC_METRICS = [
  { key: "leads", label: "Lead-uri" },
  { key: "sales", label: "Vânzări" },
  { key: "bookings", label: "Rezervări" },
  { key: "appointments", label: "Programări" },
  { key: "calls", label: "Apeluri" },
  { key: "messages", label: "Mesaje" },
  { key: "new_clients", label: "Clienți noi" },
  { key: "foot_traffic", label: "Trafic în locație" },
  { key: "price_inquiries", label: "Cereri de preț" },
];

const Schema = z.object({
  priority: z.string().min(1),
  priority_other: z.string().max(200).nullable(),
  promote_focus: z.string().trim().min(1, "Spune-ne ce vrei să promovăm").max(300),
  results_observed: z.enum(["yes", "no", "unknown"]),
  customer_feedback: z.string().max(500).nullable(),
  important_note: z.string().max(500).nullable(),
  satisfaction: z.number().int().min(1).max(5),
  direction_change: z.string().min(1),
  direction_change_other: z.string().max(200).nullable(),
});

export function ClientQuickCheckIn({ agencyId, clientId, niche, userId, onDone, onCancel }: Props) {
  const monthDate = useMemo(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0, 10);
  }, []);
  const metrics = RESULT_METRICS_BY_NICHE[niche] || GENERIC_METRICS;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  const [priority, setPriority] = useState("more_leads");
  const [priorityOther, setPriorityOther] = useState("");
  const [promoteFocus, setPromoteFocus] = useState("");
  const [resultsObserved, setResultsObserved] = useState<"yes" | "no" | "unknown">("unknown");
  const [resultsMetrics, setResultsMetrics] = useState<Record<string, string>>({});
  const [otherResults, setOtherResults] = useState("");
  const [customerFeedback, setCustomerFeedback] = useState("");
  const [importantNote, setImportantNote] = useState("");
  const [satisfaction, setSatisfaction] = useState<number>(4);
  const [directionChange, setDirectionChange] = useState("keep");
  const [directionChangeOther, setDirectionChangeOther] = useState("");

  // Real Estate specific
  const [reBuyerLeads, setReBuyerLeads] = useState("");
  const [reSellerLeads, setReSellerLeads] = useState("");
  const [reHasInquiries, setReHasInquiries] = useState<"yes" | "no" | "unknown">("unknown");
  const [reViewings, setReViewings] = useState("");
  const [rePromoteProperties, setRePromoteProperties] = useState("");
  const [reHasNewProperties, setReHasNewProperties] = useState<"yes" | "no">("no");
  const [reLeadQuality, setReLeadQuality] = useState<"good" | "mixed" | "weak" | "none">("mixed");

  // Generic per-niche extras driven by NICHE_CONFIGS
  const nicheCfg = getNicheConfig(niche);
  const [nicheExtras, setNicheExtras] = useState<Record<string, any>>({});
  const setExtra = (k: string, v: any) => setNicheExtras((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("client_feedback")
        .select("id")
        .eq("client_id", clientId)
        .eq("month", monthDate)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setAlreadyDone(true);
      setLoading(false);
    })();
  }, [clientId, monthDate]);

  const submit = async () => {
    const payload = {
      priority,
      priority_other: priority === "other" ? priorityOther.trim().slice(0, 200) : null,
      promote_focus: promoteFocus.trim(),
      results_observed: resultsObserved,
      customer_feedback: customerFeedback.trim() ? customerFeedback.trim().slice(0, 500) : null,
      important_note: importantNote.trim() ? importantNote.trim().slice(0, 500) : null,
      satisfaction,
      direction_change: directionChange,
      direction_change_other: directionChange === "other" ? directionChangeOther.trim().slice(0, 200) : null,
    };

    const parsed = Schema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Verifică câmpurile.");
      return;
    }

    const cleanedMetrics = resultsObserved === "yes" ? cleanMetrics(resultsMetrics, otherResults) : {};

    // Pack niche-specific extras
    if (niche === "real_estate") {
      const re: Record<string, any> = {
        buyer_leads: numOrNull(reBuyerLeads),
        seller_leads: numOrNull(reSellerLeads),
        property_inquiries_observed: reHasInquiries,
        viewings: numOrNull(reViewings),
        promote_properties: rePromoteProperties.trim().slice(0, 300) || null,
        has_new_properties: reHasNewProperties === "yes",
        lead_quality: reLeadQuality,
      };
      Object.keys(re).forEach((k) => re[k] == null && delete re[k]);
      (cleanedMetrics as any).real_estate = re;
    }

    setSaving(true);
    try {
      const m = cleanedMetrics as Record<string, any>;
      const num = (v: any) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      const insertRow: any = {
        agency_id: agencyId,
        client_id: clientId,
        submitted_by: userId,
        month: monthDate,
        feedback_text: payload.customer_feedback,
        real_life_impact: payload.important_note,
        promote_next_month: payload.promote_focus,
        calls_received: num(m.calls),
        messages_received: num(m.messages),
        bookings: num(m.bookings ?? m.appointments),
        sales_estimate: m.sales != null ? Number(m.sales) : null,
        objections: JSON.stringify({ kind: "quick_check_in", v: 1, ...payload, results_metrics: cleanedMetrics }),
      };

      const { error } = await supabase.from("client_feedback").insert(insertRow);
      if (error) throw error;

      // Also persist the structured monthly check-in
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
        observed_real_results: payload.results_observed,
        real_results_data: cleanedMetrics,
        customer_feedback: payload.customer_feedback,
        important_notes: payload.important_note,
        satisfaction_score: payload.satisfaction,
        requested_direction_change: payload.direction_change,
        direction_change_custom: payload.direction_change_other,
      };
      // Upsert so a re-submit (rare) still works
      await supabase.from("client_checkins").upsert(checkinRow, { onConflict: "client_id,year,month" });

      toast.success("Mulțumim! Răspunsurile au fost trimise agenției.");

      // Fire-and-forget AI context generation; do not block the UI on it.
      supabase.functions.invoke("client-dashboard-context-generate", {
        body: { client_id: clientId },
      }).catch(() => { /* silent */ });

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-accent font-semibold">
            <Sparkles className="h-3 w-3" /> Quick check-in · sub 2 minute
          </div>
          <h2 className="text-xl font-semibold tracking-tight mt-1">Cum a fost luna aceasta?</h2>
        </div>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Înapoi
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-5 md:p-6 space-y-6">
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

          <Section n={3} title="Ai observat rezultate reale din content luna trecută?">
            <ChipGroup
              options={[
                { key: "yes", label: "Da" },
                { key: "no", label: "Nu" },
                { key: "unknown", label: "Nu știu" },
              ]}
              value={resultsObserved} onChange={(v) => setResultsObserved(v as any)}
            />
            {resultsObserved === "yes" && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                {metrics.map((m) => (
                  <div key={m.key} className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{m.label}</Label>
                    <Input
                      type="number" min={0}
                      value={resultsMetrics[m.key] ?? ""}
                      onChange={(e) => setResultsMetrics({ ...resultsMetrics, [m.key]: e.target.value })}
                      placeholder="—"
                    />
                  </div>
                ))}
                <div className="space-y-1 col-span-2 md:col-span-3">
                  <Label className="text-[11px] text-muted-foreground">Alte rezultate</Label>
                  <Input value={otherResults} onChange={(e) => setOtherResults(e.target.value)} maxLength={200} />
                </div>
              </div>
            )}
          </Section>

          {niche === "real_estate" && (
            <div className="space-y-5 p-4 rounded-md border border-accent/30 bg-accent/5">
              <div className="text-xs font-semibold uppercase tracking-wide text-accent">Întrebări specifice — Imobiliare</div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Lead-uri cumpărători</Label>
                  <Input type="number" min={0} value={reBuyerLeads} onChange={(e) => setReBuyerLeads(e.target.value)} placeholder="—" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Lead-uri vânzători</Label>
                  <Input type="number" min={0} value={reSellerLeads} onChange={(e) => setReSellerLeads(e.target.value)} placeholder="—" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Ai primit cereri pentru proprietăți?</Label>
                <ChipGroup
                  options={[{ key: "yes", label: "Da" }, { key: "no", label: "Nu" }, { key: "unknown", label: "Nu știu" }]}
                  value={reHasInquiries} onChange={(v) => setReHasInquiries(v as any)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Câte vizionări s-au programat?</Label>
                <Input type="number" min={0} value={reViewings} onChange={(e) => setReViewings(e.target.value)} placeholder="—" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Ce proprietăți vrei să promovăm luna aceasta?</Label>
                <Textarea rows={2} value={rePromoteProperties} onChange={(e) => setRePromoteProperties(e.target.value)}
                  placeholder="ex: vila din Pipera, apartament 2 cam. Floreasca, teren Snagov…" maxLength={300} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Ai proprietăți noi de promovat?</Label>
                <ChipGroup
                  options={[{ key: "yes", label: "Da" }, { key: "no", label: "Nu" }]}
                  value={reHasNewProperties} onChange={(v) => setReHasNewProperties(v as any)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Ai primit lead-uri bune sau slabe?</Label>
                <ChipGroup
                  options={[
                    { key: "good", label: "Bune" },
                    { key: "mixed", label: "Mixte" },
                    { key: "weak", label: "Slabe" },
                    { key: "none", label: "Niciunul" },
                  ]}
                  value={reLeadQuality} onChange={(v) => setReLeadQuality(v as any)}
                />
              </div>
            </div>
          )}

          <Section n={4} title="Ce feedback ai primit de la clienții tăi?">
            <Textarea rows={2} value={customerFeedback} onChange={(e) => setCustomerFeedback(e.target.value)} maxLength={500}
              placeholder="ex: clienții au menționat reel-ul de marți, oamenii au sunat după postul cu oferta…" />
          </Section>

          <Section n={5} title="Există ceva important ce trebuie să știe agenția luna aceasta?">
            <Textarea rows={2} value={importantNote} onChange={(e) => setImportantNote(e.target.value)} maxLength={500}
              placeholder="ex: schimbăm orarul, lansăm un produs nou, suntem în concediu pe 10–18…" />
          </Section>

          <Section n={6} title="Cât de mulțumit ești de direcția actuală a conținutului?">
            <div className="flex gap-2 items-center flex-wrap">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setSatisfaction(n)}
                  className={`h-10 w-10 rounded-md border text-sm font-semibold transition ${
                    satisfaction === n ? "bg-accent text-accent-foreground border-accent" : "border-border hover:border-foreground/40"
                  }`}>
                  {n}
                </button>
              ))}
              <div className="ml-2 text-xs text-muted-foreground">1 = deloc · 5 = foarte mulțumit</div>
            </div>
          </Section>

          <Section n={7} title="Vrei să schimbăm ceva luna aceasta?">
            <div className="space-y-1.5">
              {DIRECTIONS.map((d) => (
                <button key={d.key} type="button" onClick={() => setDirectionChange(d.key)}
                  className={`w-full text-left px-3 py-2 rounded-md border text-sm transition ${
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

          <div className="flex items-center justify-between pt-2">
            <Badge variant="outline" className="text-[10px]">Sub 2 minute</Badge>
            <Button onClick={submit} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground">
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

function cleanMetrics(metrics: Record<string, string>, other: string): Record<string, any> {
  const out: Record<string, any> = {};
  Object.entries(metrics).forEach(([k, v]) => {
    if (v === "" || v === null || v === undefined) return;
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  });
  if (other.trim()) out.other = other.trim().slice(0, 200);
  return out;
}

function numOrNull(v: string): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
