import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtMonthYearRO } from "@/lib/i18nLabels";

const PRIORITY_LABELS: Record<string, string> = {
  more_leads: "Mai multe lead-uri",
  more_sales: "Mai multe vânzări",
  more_bookings: "Mai multe rezervări/programări",
  more_awareness: "Mai mult awareness",
  more_engagement: "Mai mult engagement",
  promote_specific: "Promovarea unui produs/serviciu",
  other: "Altceva",
};

const DIRECTION_LABELS: Record<string, string> = {
  keep: "Continuăm direcția",
  more_education: "Mai mult educativ",
  more_sales: "Mai mult de vânzare",
  more_premium: "Mai mult premium",
  more_personal: "Mai mult personal/BTS",
  other: "Altceva",
};

export function LatestCheckInCard({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<any>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("client_feedback")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setRow(data);
      setLoading(false);
    })();
  }, [clientId]);

  if (loading) return <Card><CardContent className="py-6 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></CardContent></Card>;
  if (!row) return null;

  let parsed: any = null;
  try { parsed = row.objections ? JSON.parse(row.objections) : null; } catch { parsed = null; }
  const isCheckIn = parsed?.kind === "quick_check_in";

  const monthLabel = fmtMonthYearRO(row.month);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Ultimul check-in lunar</CardTitle>
          <Badge variant="outline" className="text-[10px] capitalize">{monthLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        {isCheckIn ? (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Prioritate luna aceasta">
                <span className="text-sm">{PRIORITY_LABELS[parsed.priority] || parsed.priority}</span>
                {parsed.priority === "other" && parsed.priority_other && (
                  <div className="text-xs text-muted-foreground mt-0.5">{parsed.priority_other}</div>
                )}
              </Field>
              <Field label="De promovat">
                <span className="text-sm">{parsed.promote_focus || "—"}</span>
              </Field>
              <Field label="Satisfacție">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`h-4 w-4 ${n <= (parsed.satisfaction || 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
              </Field>
              <Field label="Direcție">
                <span className="text-sm">{DIRECTION_LABELS[parsed.direction_change] || parsed.direction_change}</span>
                {parsed.direction_change === "other" && parsed.direction_change_other && (
                  <div className="text-xs text-muted-foreground mt-0.5">{parsed.direction_change_other}</div>
                )}
              </Field>
            </div>

            <Field label="Rezultate observate">
              <div className="text-xs">
                {parsed.results_observed === "yes" ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {Object.entries(parsed.results_metrics || {}).map(([k, v]) => (
                      <Badge key={k} variant="secondary" className="text-[10px] font-mono">
                        {k}: {String(v)}
                      </Badge>
                    ))}
                    {Object.keys(parsed.results_metrics || {}).length === 0 && (
                      <span className="text-muted-foreground">Da, dar fără cifre.</span>
                    )}
                  </div>
                ) : parsed.results_observed === "no" ? (
                  <span className="text-muted-foreground">Nu</span>
                ) : (
                  <span className="text-muted-foreground">Nu știe</span>
                )}
              </div>
            </Field>

            {parsed.customer_feedback && (
              <Field label="Feedback de la clienți"><p className="text-sm whitespace-pre-wrap">{parsed.customer_feedback}</p></Field>
            )}
            {parsed.important_note && (
              <Field label="Notă importantă"><p className="text-sm whitespace-pre-wrap">{parsed.important_note}</p></Field>
            )}
          </>
        ) : (
          <div className="space-y-2 text-sm">
            {row.feedback_text && <p>{row.feedback_text}</p>}
            {row.real_life_impact && <p className="text-muted-foreground text-xs">{row.real_life_impact}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">{label}</div>
      {children}
    </div>
  );
}
