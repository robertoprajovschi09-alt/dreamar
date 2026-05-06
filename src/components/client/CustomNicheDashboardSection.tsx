import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, FileEdit, ArrowRight, AlertCircle, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

type Props = {
  agencyId: string;
  clientId: string;
  awaitingApproval: number;
  recommendedWidgets?: { key: string; label?: string; reason?: string }[];
  insights?: { title: string; body: string; severity: "info" | "good" | "warning" }[];
  nextActions?: { label: string; why: string }[];
  missingData?: string[];
  isAgencyView?: boolean; // shows "Edit recommended layout" button
};

export function CustomNicheDashboardSection({
  agencyId, clientId, awaitingApproval, recommendedWidgets = [],
  insights = [], nextActions = [], missingData = [], isAgencyView,
}: Props) {
  const [kpiSchema, setKpiSchema] = useState<any>(null);
  const [impact, setImpact] = useState<any[]>([]);
  const [an, setAn] = useState<any[]>([]);
  const [checkin, setCheckin] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since30 = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
      const [schema, imp, ana, ck, g] = await Promise.all([
        supabase.from("client_kpi_schemas").select("*").eq("client_id", clientId).maybeSingle(),
        supabase.from("business_impact_entries").select("*").eq("client_id", clientId).gte("entry_date", since30),
        supabase.from("analytics_entries").select("*").eq("client_id", clientId).gte("date_start", since30),
        supabase.from("client_checkins").select("*").eq("client_id", clientId)
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("monthly_goals").select("*").eq("client_id", clientId)
          .order("month", { ascending: false }).limit(3),
      ]);
      setKpiSchema(schema.data);
      setImpact((imp.data as any[]) || []);
      setAn((ana.data as any[]) || []);
      setCheckin(ck.data);
      setGoals((g.data as any[]) || []);
      setLoading(false);
    })();
  }, [clientId]);

  if (loading) return <div className="text-xs text-muted-foreground">Se încarcă…</div>;

  const kpiFields: any[] = (kpiSchema?.kpi_fields as any[]) || [];
  const biFields: any[] = (kpiSchema?.business_impact_fields as any[]) || [];

  // Decide which keys to show: AI recommended widgets first, fallback to schema-defined fields
  const recommendedKeys = recommendedWidgets.map((w) => w.key).filter(Boolean);
  const allKeys = recommendedKeys.length > 0
    ? recommendedKeys
    : [...kpiFields, ...biFields].map((f: any) => f.key).filter(Boolean).slice(0, 6);

  const sum = (rows: any[], k: string) => rows.reduce((acc, r) => acc + (Number(r?.[k]) || 0), 0);
  const checkinExtras = (checkin?.real_results_data as any) || {};
  const checkinCustom = checkinExtras.custom || checkinExtras;

  const resolveValue = (key: string): { value: any; missing: boolean; format?: string } => {
    const def = kpiFields.find((f: any) => f.key === key) || biFields.find((f: any) => f.key === key);
    const format = def?.kpi_type || def?.field_type || def?.type;
    // Try business impact aggregate
    const impactVal = sum(impact, key);
    if (impactVal > 0) return { value: impactVal, missing: false, format };
    // Try analytics aggregate
    const anVal = sum(an, key);
    if (anVal > 0) return { value: anVal, missing: false, format };
    // Try check-in custom data
    const ck = checkinCustom?.[key];
    if (ck != null && ck !== "") return { value: ck, missing: false, format };
    return { value: null, missing: true, format };
  };

  const fmt = (v: any, format?: string) => {
    if (v == null || v === "") return "—";
    const n = Number(v);
    if (format === "currency") return Number.isFinite(n) ? `${Math.round(n).toLocaleString()} RON` : String(v);
    if (format === "percent" || format === "percentage") return Number.isFinite(n) ? `${(n <= 1 ? n * 100 : n).toFixed(1)}%` : String(v);
    if (Number.isFinite(n)) return n.toLocaleString();
    return String(v);
  };

  const labelFor = (key: string): string => {
    const def = kpiFields.find((f: any) => f.key === key) || biFields.find((f: any) => f.key === key);
    if (def?.label) return def.label;
    const recommended = recommendedWidgets.find((w) => w.key === key);
    if (recommended?.label) return recommended.label;
    return key.replace(/_/g, " ");
  };

  return (
    <div className="space-y-4">
      {/* AI banner */}
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="p-3 flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-accent mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="font-semibold">Dashboard generat AI pe baza nișei tale custom</div>
            <div className="text-muted-foreground">
              {recommendedWidgets.length > 0
                ? "Carduri prioritizate AI după KPI-urile și obiectivele definite în Add Client."
                : "Carduri afișate din KPI-urile custom configurate. Completează check-in-ul ca AI să recomande layout-ul ideal."}
            </div>
          </div>
          {isAgencyView && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/agency/clients/${clientId}/edit`}>
                <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Edit layout
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Custom KPI cards */}
      {allKeys.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {allKeys.map((key) => {
            const { value, missing, format } = resolveValue(key);
            const reason = recommendedWidgets.find((w) => w.key === key)?.reason;
            return (
              <Card key={key}>
                <CardContent className="p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                    {labelFor(key)}
                  </div>
                  <div className="text-xl font-semibold font-mono mt-1">{fmt(value, format)}</div>
                  {missing && <div className="text-[10px] text-muted-foreground mt-0.5">Lipsă date</div>}
                  {!missing && reason && <div className="text-[10px] text-muted-foreground mt-0.5">{reason}</div>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Nu există KPI-uri custom configurate pentru acest client. {isAgencyView && (
              <Link to={`/agency/clients/${clientId}/edit`} className="text-accent underline">Configurează în Add Client →</Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Goals (objective-driven cards) */}
      {goals.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Obiective active</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {goals.map((g) => (
              <div key={g.id} className="flex items-center justify-between text-sm">
                <div className="font-medium">{g.objective}</div>
                <div className="text-xs text-muted-foreground font-mono">{g.target ?? "—"} {g.metric || ""}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Approvals */}
      <Card className={awaitingApproval > 0 ? "border-amber-500/40 bg-amber-500/5" : ""}>
        <CardContent className="p-4 flex items-center gap-3">
          <FileEdit className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">
              {awaitingApproval > 0
                ? `${awaitingApproval} ${awaitingApproval === 1 ? "postare așteaptă" : "postări așteaptă"} aprobarea ta`
                : "Nimic de aprobat"}
            </div>
          </div>
          {awaitingApproval > 0 && <Badge variant="outline" className="font-mono">{awaitingApproval}</Badge>}
        </CardContent>
      </Card>

      {/* Next actions */}
      {nextActions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><ArrowRight className="h-4 w-4 text-accent" /> Recomandări AI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nextActions.slice(0, 4).map((a, i) => (
              <div key={i} className="text-sm">
                <div className="font-medium">{a.label}</div>
                {a.why && <div className="text-xs text-muted-foreground">{a.why}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Missing data */}
      {missingData.length > 0 && (
        <Card className="border-amber-500/30">
          <CardContent className="p-3 flex items-start gap-2 text-xs">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Date lipsă:</div>
              <div className="flex flex-wrap gap-1">
                {missingData.map((m) => <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
