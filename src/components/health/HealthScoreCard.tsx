import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, RefreshCw, Sparkles, TrendingDown, TrendingUp, Minus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { HealthScoreRing } from "./HealthScoreRing";
import {
  COMPONENT_LABELS, COMPONENT_WEIGHTS, STATUS_META,
  compute, fetchCurrent, fetchHistory, generateRecommendation,
  type HealthScore,
} from "@/lib/healthScore";

interface Props {
  clientId: string;
  /** read-only mode hides Recompute and AI-trigger buttons (used in client portal) */
  readOnly?: boolean;
  compact?: boolean;
}

export function HealthScoreCard({ clientId, readOnly = false, compact = false }: Props) {
  const [score, setScore] = useState<HealthScore | null>(null);
  const [prev, setPrev] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  const load = async () => {
    setLoading(true);
    const cur = await fetchCurrent(clientId);
    setScore(cur);
    const hist = await fetchHistory(clientId, 6);
    const previous = hist.find((h) => h.id !== cur?.id) || null;
    setPrev(previous);
    setLoading(false);
    return cur;
  };

  useEffect(() => {
    (async () => {
      const cur = await load();
      // Auto-compute if missing or stale (>24h) and not read-only
      if (!readOnly) {
        const isStale = cur && (Date.now() - new Date(cur.updated_at).getTime() > 24 * 3600 * 1000);
        if (!cur || isStale) {
          await runCompute(true);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const runCompute = async (silent = false) => {
    setComputing(true);
    try {
      const next = await compute(clientId);
      setScore(next);
      const hist = await fetchHistory(clientId, 6);
      setPrev(hist.find((h) => h.id !== next.id) || null);
      if (!silent) toast.success("Scor actualizat");
    } catch (e: any) {
      if (!silent) toast.error(e.message || "Could not compute score");
    } finally {
      setComputing(false);
    }
  };

  const runAi = async () => {
    if (!score) return;
    setAiBusy(true);
    try {
      const updated = await generateRecommendation(score.id);
      setScore(updated);
      toast.success("Recomandare AI gata");
    } catch (e: any) {
      toast.error(e.message || "AI request failed");
    } finally {
      setAiBusy(false);
    }
  };

  if (loading) {
    return (
      <Card><CardContent className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>
    );
  }

  if (!score) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No health score for this month yet.</p>
          {!readOnly && (
            <Button onClick={() => runCompute()} disabled={computing} size="sm">
              {computing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />} Compute now
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const meta = STATUS_META[score.score_status];
  const delta = prev ? score.total_score - prev.total_score : null;
  const components = [
    { key: "content_consistency", value: score.content_consistency_score },
    { key: "performance", value: score.performance_score },
    { key: "goal_progress", value: score.goal_progress_score },
    { key: "client_engagement", value: score.client_engagement_score },
    { key: "business_impact", value: score.business_impact_score },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            Client Health Score
            <Badge variant="outline" className={meta.badgeClass}>{meta.label}</Badge>
          </CardTitle>
          {!readOnly && (
            <Button variant="ghost" size="sm" onClick={() => runCompute()} disabled={computing}>
              {computing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Recompute
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-6 flex-wrap">
          <HealthScoreRing score={Number(score.total_score)} status={score.score_status} size={compact ? 110 : 140} />
          <div className="space-y-1.5 min-w-[180px]">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">vs last month</div>
            {delta === null ? (
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm"><Minus className="h-4 w-4" /> No prior data</div>
            ) : delta > 0 ? (
              <div className="flex items-center gap-1.5 text-emerald-500 font-mono text-lg"><TrendingUp className="h-4 w-4" /> +{delta.toFixed(1)} pts</div>
            ) : delta < 0 ? (
              <div className="flex items-center gap-1.5 text-rose-500 font-mono text-lg"><TrendingDown className="h-4 w-4" /> {delta.toFixed(1)} pts</div>
            ) : (
              <div className="flex items-center gap-1.5 text-muted-foreground"><Minus className="h-4 w-4" /> No change</div>
            )}
            <div className="text-xs text-muted-foreground pt-1">{score.period_start} → {score.period_end}</div>
          </div>
        </div>

        <div className="space-y-2.5">
          {components.map((c) => {
            const isMissing = (score.missing_data || []).includes(c.key);
            return (
              <div key={c.key}>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-medium">
                    {COMPONENT_LABELS[c.key]} <span className="text-muted-foreground">· {COMPONENT_WEIGHTS[c.key]}%</span>
                  </span>
                  {isMissing ? (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-dashed">Missing data</Badge>
                  ) : (
                    <span className="font-mono">{Math.round(Number(c.value || 0))}</span>
                  )}
                </div>
                <Progress value={Number(c.value || 0)} className="h-1.5" />
              </div>
            );
          })}
        </div>

        <div className="border-t border-border pt-3">
          <button onClick={() => setShowWhy((v) => !v)} className="text-xs font-medium text-accent hover:underline">
            {showWhy ? "Hide explanation" : "Why this score?"}
          </button>
          {showWhy && (
            <div className="mt-2 space-y-2">
              {score.summary && <p className="text-sm text-muted-foreground">{score.summary}</p>}
              {(score.missing_data || []).length > 0 && (
                <div className="text-xs flex items-start gap-1.5 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Missing data for: {(score.missing_data as string[]).map((m) => COMPONENT_LABELS[m]).join(", ")}. Components without data use a neutral 50.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* AI recommendation */}
        <div className="border-t border-border pt-3 space-y-3">
          {!readOnly && (
            <Button onClick={runAi} disabled={aiBusy} variant="outline" size="sm" className="w-full sm:w-auto">
              {aiBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {score.ai_recommendation ? "Regenerate AI recommendation" : "Generate AI recommendation"}
            </Button>
          )}

          {score.ai_recommendation && (
            <div className="space-y-3 bg-muted/40 rounded-md p-3">
              {score.ai_recommendation.why_this_score && (
                <Section title="Why this score">{score.ai_recommendation.why_this_score}</Section>
              )}
              {score.ai_recommendation.whats_working?.length ? (
                <Section title="What's working">
                  <ul className="list-disc pl-5 space-y-1">
                    {score.ai_recommendation.whats_working.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </Section>
              ) : null}
              {score.ai_recommendation.whats_broken?.length ? (
                <Section title="What's broken">
                  <ul className="list-disc pl-5 space-y-1">
                    {score.ai_recommendation.whats_broken.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </Section>
              ) : null}
              {score.ai_recommendation.next_month_actions?.length ? (
                <Section title="Next month actions">
                  <ul className="list-disc pl-5 space-y-1">
                    {score.ai_recommendation.next_month_actions.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </Section>
              ) : null}
              {score.ai_generated_at && (
                <div className="text-[10px] text-muted-foreground">Generated {new Date(score.ai_generated_at).toLocaleString()}</div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{title}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
