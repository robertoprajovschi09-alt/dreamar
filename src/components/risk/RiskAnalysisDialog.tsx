import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ListPlus, Check, EyeOff, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { runRiskAnalysis, generateRecoveryTasks, updateAlertStatus, type RiskAlert, LEVEL_META } from "@/lib/risk";
import { RiskBadge } from "./RiskBadge";
import { toast } from "@/hooks/use-toast";

export function RiskAnalysisDialog({
  alertId, clientName, open, onOpenChange, onChange,
}: {
  alertId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onChange?: () => void;
}) {
  const [alert, setAlert] = useState<RiskAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiBusy, setAiBusy] = useState(false);
  const [taskBusy, setTaskBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("client_risk_alerts").select("*").eq("id", alertId).maybeSingle();
    setAlert(data || null);
    setLoading(false);
  };
  useEffect(() => { if (open) load(); /* eslint-disable-next-line */ }, [open, alertId]);

  const onAi = async () => {
    setAiBusy(true);
    try { await runRiskAnalysis(alertId); await load(); onChange?.(); }
    catch (e: any) { toast({ title: "AI failed", description: e.message, variant: "destructive" }); }
    finally { setAiBusy(false); }
  };

  const onTasks = async () => {
    setTaskBusy(true);
    try {
      const r = await generateRecoveryTasks(alertId);
      toast({ title: "Recovery tasks created", description: `${r.created} task(s) added.` });
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setTaskBusy(false); }
  };

  const onStatus = async (s: "acknowledged" | "resolved" | "ignored") => {
    try {
      await updateAlertStatus(alertId, s);
      toast({ title: `Marked ${s}` });
      onChange?.();
      onOpenChange(false);
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  const reasons = alert?.risk_reasons || [];
  const actions = alert?.recommended_actions || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Risk analysis — {clientName}
            {alert && <RiskBadge level={alert.risk_level} />}
            {alert && <span className="text-xs font-mono text-muted-foreground">{Math.round(Number(alert.risk_score))}/100</span>}
          </DialogTitle>
        </DialogHeader>

        {loading || !alert ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-5 py-2">
            {alert.ai_summary && (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">{alert.ai_summary}</div>
            )}

            <section>
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Detected signals ({reasons.length})</h4>
              <ul className="space-y-1.5">
                {reasons.map((r, i) => (
                  <li key={i} className="flex items-start justify-between gap-2 text-sm">
                    <span>{r.label}</span>
                    <Badge variant="outline" className="text-[10px] uppercase shrink-0">{r.severity}</Badge>
                  </li>
                ))}
                {reasons.length === 0 && <p className="text-sm text-muted-foreground">Niciun semnal.</p>}
              </ul>
            </section>

            {!alert.ai_generated_at ? (
              <Button onClick={onAi} disabled={aiBusy} className="w-full" variant="outline">
                {aiBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate AI analysis
              </Button>
            ) : (
              <>
                {actions.length > 0 && (
                  <section>
                    <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Plan de recuperare</h4>
                    <ul className="space-y-2">
                      {actions.map((a, i) => (
                        <li key={i} className="rounded-md border border-border p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-medium text-sm">{a.title}</div>
                            <Badge variant="outline" className="text-[10px] uppercase">{a.priority}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                <Button onClick={onAi} disabled={aiBusy} variant="ghost" size="sm" className="text-xs">
                  {aiBusy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                  Regenerate analysis
                </Button>
              </>
            )}

            <div className="grid gap-2 pt-2 border-t border-border">
              <Button onClick={onTasks} disabled={taskBusy}>
                {taskBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ListPlus className="h-4 w-4 mr-2" />}
                Generate Recovery Tasks
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => onStatus("acknowledged")}><Check className="h-3 w-3 mr-1" /> Acknowledge</Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => onStatus("resolved")}><Archive className="h-3 w-3 mr-1" /> Resolve</Button>
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => onStatus("ignored")}><EyeOff className="h-3 w-3 mr-1" /> Ignore</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
