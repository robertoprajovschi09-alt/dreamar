import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";
import { listStrategiesForClient, monthLabel, STRATEGY_STATUS_META, type MonthlyStrategy } from "@/lib/strategies";
import { GenerateStrategyDialog } from "./GenerateStrategyDialog";

export function ClientStrategiesTab({ clientId, agencyId: _agencyId }: { clientId: string; agencyId: string }) {
  const [items, setItems] = useState<MonthlyStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setItems(await listStrategiesForClient(clientId)); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [clientId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">AI-generated strategies for this client.</div>
        <Button onClick={() => setOpen(true)}><Sparkles className="h-4 w-4 mr-2" /> Generate next month</Button>
      </div>
      {loading ? (
        <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-accent" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No strategies yet for this client.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((s) => {
            const meta = STRATEGY_STATUS_META[s.status];
            return (
              <Link key={s.id} to={`/agency/strategies/${s.id}`}>
                <Card className="hover:border-accent/50 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{s.strategy_title}</div>
                      <div className="text-xs text-muted-foreground">{monthLabel(s.month, s.year)}</div>
                    </div>
                    <div className="flex items-center gap-2"><Badge className={meta.color}>{meta.label}</Badge><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
      <GenerateStrategyDialog open={open} onOpenChange={setOpen} defaultClientId={clientId} onGenerated={() => load()} />
    </div>
  );
}
