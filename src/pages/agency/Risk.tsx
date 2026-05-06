import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { fetchAgencyAlerts, detectForAgency, type RiskAlert, type AlertStatus, type RiskLevel, LEVEL_META } from "@/lib/risk";
import { RiskAlertCard } from "@/components/risk/RiskAlertCard";
import { toast } from "@/hooks/use-toast";

export default function RiskPage() {
  const { agency } = useUser();
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [clients, setClients] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [statusFilter, setStatusFilter] = useState<AlertStatus | "all">("active");
  const [levelFilter, setLevelFilter] = useState<RiskLevel | "all">("all");

  const load = async () => {
    if (!agency) return;
    setLoading(true);
    const [a, c] = await Promise.all([
      fetchAgencyAlerts(agency.id, statusFilter),
      supabase.from("clients").select("id,name").eq("agency_id", agency.id),
    ]);
    setAlerts(a);
    const map: Record<string, string> = {};
    (c.data || []).forEach((x: any) => { map[x.id] = x.name; });
    setClients(map);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [agency, statusFilter]);

  const onRun = async () => {
    if (!agency) return;
    setRunning(true);
    try {
      await detectForAgency(agency.id);
      toast({ title: "Risk detection complete" });
      await load();
    } catch (e: any) {
      toast({ title: "Detection failed", description: e.message, variant: "destructive" });
    } finally { setRunning(false); }
  };

  const filtered = alerts.filter((a) => levelFilter === "all" || a.risk_level === levelFilter);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" /> Client Risk
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Detects clients at risk of churn before they leave.</p>
        </div>
        <Button onClick={onRun} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Run detection now
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground self-center mr-1">Status:</span>
        {(["active", "acknowledged", "resolved", "ignored", "all"] as const).map((s) => (
          <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)} className="capitalize h-7 text-xs">{s}</Button>
        ))}
        <span className="text-xs text-muted-foreground self-center mx-1">Level:</span>
        {(["all", "critical", "high", "medium", "low"] as const).map((l) => (
          <Button key={l} size="sm" variant={levelFilter === l ? "default" : "outline"} onClick={() => setLevelFilter(l)} className="capitalize h-7 text-xs">{l}</Button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">
          No alerts match the current filters. Run detection to refresh.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <RiskAlertCard key={a.id} alert={a} clientName={clients[a.client_id] || "Client"} onChange={load} />
          ))}
        </div>
      )}
    </div>
  );
}
