import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "./RiskBadge";
import { RiskAnalysisDialog } from "./RiskAnalysisDialog";
import type { RiskAlert } from "@/lib/risk";
import { AlertTriangle, ListPlus } from "lucide-react";
import { generateRecoveryTasks } from "@/lib/risk";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

export function RiskAlertCard({
  alert, clientName, healthScore, lastReportAt, onChange,
}: {
  alert: RiskAlert;
  clientName: string;
  healthScore?: number | null;
  lastReportAt?: string | null;
  onChange?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const topReason = alert.risk_reasons?.[0]?.label || alert.ai_summary || "Multiple risk signals detected.";

  const onCreatePlan = async () => {
    setBusy(true);
    try {
      const r = await generateRecoveryTasks(alert.id);
      toast({ title: "Recovery tasks created", description: `${r.created} task(s) added. Open Tasks to assign.` });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <>
      <Card className="border-l-4" style={{ borderLeftColor: alert.risk_level === "critical" ? "hsl(var(--destructive))" : undefined }}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link to={`/agency/clients/${alert.client_id}`} className="font-semibold text-sm hover:underline truncate block">{clientName}</Link>
              <div className="flex items-center gap-2 mt-1">
                <RiskBadge level={alert.risk_level} />
                <span className="text-xs font-mono text-muted-foreground">{Math.round(Number(alert.risk_score))}/100</span>
                {typeof healthScore === "number" && (
                  <span className="text-xs text-muted-foreground">· Health {Math.round(healthScore)}</span>
                )}
              </div>
            </div>
            <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{topReason}</p>
          <div className="text-[11px] text-muted-foreground">
            Last report: {lastReportAt ? new Date(lastReportAt).toLocaleDateString() : "—"}
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setOpen(true)}>View Risk Analysis</Button>
            <Button size="sm" className="flex-1" onClick={onCreatePlan} disabled={busy}>
              <ListPlus className="h-3 w-3 mr-1" /> Create Recovery Plan
            </Button>
          </div>
        </CardContent>
      </Card>
      {open && <RiskAnalysisDialog alertId={alert.id} clientName={clientName} open={open} onOpenChange={setOpen} onChange={onChange} />}
    </>
  );
}
