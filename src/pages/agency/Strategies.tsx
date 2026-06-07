import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Lightbulb, Sparkles, ArrowRight } from "lucide-react";
import { listStrategies, monthLabel, STRATEGY_STATUS_META, type MonthlyStrategy, type StrategyStatus } from "@/lib/strategies";
import { GenerateStrategyDialog } from "@/components/strategies/GenerateStrategyDialog";

export default function Strategies() {
  const { agency } = useUser();
  const [items, setItems] = useState<MonthlyStrategy[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [genOpen, setGenOpen] = useState(false);

  const load = async () => {
    if (!agency) return;
    setLoading(true);
    const list = await listStrategies(agency.id, {
      clientId: clientFilter !== "all" ? clientFilter : undefined,
      status: statusFilter !== "all" ? (statusFilter as StrategyStatus) : undefined,
    });
    setItems(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, [agency?.id, clientFilter, statusFilter]);
  useEffect(() => {
    if (!agency) return;
    supabase.from("clients").select("id,name").eq("agency_id", agency.id).order("name").then(({ data }) => setClients(data || []));
  }, [agency?.id]);

  const kpis = useMemo(() => ({
    drafts: items.filter((s) => s.status === "draft" || s.status === "generated").length,
    approved: items.filter((s) => s.status === "approved").length,
    sent: items.filter((s) => s.status === "sent_to_client").length,
    total: items.length,
  }), [items]);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-accent font-semibold mb-1">Strategie AI</div>
          <h1 className="text-3xl font-bold tracking-tight">Strategii lunare</h1>
          <p className="text-sm text-muted-foreground mt-1">Generează planuri pentru luna următoare bazate pe date reale ale clientului.</p>
        </div>
        <Button onClick={() => setGenOpen(true)}><Sparkles className="h-4 w-4 mr-2" /> Generează luna următoare</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Total", value: kpis.total },
          { label: "În lucru", value: kpis.drafts },
          { label: "Aprobate", value: kpis.approved },
          { label: "Trimise clientului", value: kpis.sent },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4"><div className="text-xs text-muted-foreground">{k.label}</div><div className="text-2xl font-bold mt-1">{k.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toți clienții</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate statusurile</SelectItem>
            {Object.entries(STRATEGY_STATUS_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-accent" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground space-y-3">
          <Lightbulb className="h-8 w-8 mx-auto text-accent" />
          <div>Nicio strategie încă. Generează prima pentru luna următoare.</div>
          <Button onClick={() => setGenOpen(true)}><Sparkles className="h-4 w-4 mr-2" /> Generează</Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((s) => {
            const c = clients.find((x) => x.id === s.client_id);
            const meta = STRATEGY_STATUS_META[s.status];
            return (
              <Link key={s.id} to={`/agency/strategies/${s.id}`}>
                <Card className="hover:border-accent/50 transition-colors h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{s.strategy_title}</CardTitle>
                      <Badge className={meta.color}>{meta.label}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{c?.name || "—"} · {monthLabel(s.month, s.year)}</div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground line-clamp-3">
                    {s.executive_summary || "Fără rezumat încă."}
                    <div className="flex items-center justify-end mt-3 text-accent text-xs"><span className="inline-flex items-center gap-1">Deschide <ArrowRight className="h-3 w-3" /></span></div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <GenerateStrategyDialog open={genOpen} onOpenChange={setGenOpen} onGenerated={() => load()} />
    </div>
  );
}
