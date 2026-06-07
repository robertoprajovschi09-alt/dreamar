import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, Upload, Plus, Inbox } from "lucide-react";
import { listAnalyticsEntries, totals, detectMissingData, type AnalyticsEntry } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { CsvImportDialog } from "@/components/analytics/CsvImportDialog";
import { AnalyticsEntryDialog } from "@/components/analytics/AnalyticsEntryDialog";


export default function Analytics() {
  const { agency } = useUser();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [byClientNow, setByClientNow] = useState<Record<string, AnalyticsEntry[]>>({});
  const [byClientPrev, setByClientPrev] = useState<Record<string, AnalyticsEntry[]>>({});
  const [csvOpen, setCsvOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");


  const load = useCallback(async () => {
    if (!agency) return;
    setLoading(true);
    try {
      const { data: cs } = await supabase.from("clients").select("id,name").eq("agency_id", agency.id).order("name");
      setClients((cs || []).map((c: any) => ({ id: c.id, name: c.name })));

      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const [now, prev] = await Promise.all([
        listAnalyticsEntries({ agencyId: agency.id, year, month }),
        listAnalyticsEntries({ agencyId: agency.id, year: prevYear, month: prevMonth }),
      ]);
      const groupBy = (arr: AnalyticsEntry[]) => arr.reduce<Record<string, AnalyticsEntry[]>>((acc, e) => {
        (acc[e.client_id] = acc[e.client_id] || []).push(e); return acc;
      }, {});
      setByClientNow(groupBy(now));
      setByClientPrev(groupBy(prev));
    } finally { setLoading(false); }
  }, [agency, year, month]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selectedClientId && clients.length > 0) setSelectedClientId(clients[0].id);
  }, [clients, selectedClientId]);

  const aggregate = useMemo(() => Object.values(byClientNow).flat(), [byClientNow]);
  const t = totals(aggregate);
  const isEmpty = aggregate.length === 0 && Object.values(t).every((v) => !v);


  const ranked = useMemo(() => {
    return clients.map((c) => {
      const cur = totals(byClientNow[c.id] || []);
      const prev = totals(byClientPrev[c.id] || []);
      const growth = prev.views ? ((cur.views - prev.views) / prev.views) * 100 : (cur.views ? 100 : 0);
      const missing = detectMissingData(byClientNow[c.id] || []);
      return { ...c, cur, prev, growth, missing };
    });
  }, [clients, byClientNow, byClientPrev]);

  const top = [...ranked].sort((a, b) => b.growth - a.growth).slice(0, 5);
  const bottom = [...ranked].sort((a, b) => a.growth - b.growth).slice(0, 5);
  const missingClients = ranked.filter((r) => r.missing.some((m) => m.importance === "high"));

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Aggregated performance across all clients.</p>
      </div>

      <Card><CardContent className="pt-5 flex flex-wrap items-end gap-3">
        <div><Label className="text-xs">Year</Label><Input type="number" className="w-24" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
        <div><Label className="text-xs">Month</Label><Input type="number" min={1} max={12} className="w-20" value={month} onChange={(e) => setMonth(Number(e.target.value))} /></div>
      </CardContent></Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Total views" value={t.views} />
        <Kpi label="Total reach" value={t.reach} />
        <Kpi label="Engagement" value={t.engagement} />
        <Kpi label="Followers gained" value={t.followers_gained} />
        <Kpi label="Leads" value={t.leads} />
        <Kpi label="Sales" value={t.sales} />
        <Kpi label="Bookings" value={t.bookings} />
        <Kpi label="Revenue" value={t.revenue} money />
        <Kpi label="Ad spend" value={t.ad_spend} money />
        <Kpi label="ROAS" value={t.ad_spend ? Number((t.revenue / t.ad_spend).toFixed(2)) : 0} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ClientList title="Top growth" icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} rows={top} />
        <ClientList title="Biggest drop" icon={<TrendingDown className="h-4 w-4 text-destructive" />} rows={bottom} />
      </div>

      {missingClients.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-3"><AlertTriangle className="h-4 w-4 text-amber-600" /><div className="font-semibold text-sm">Clients with missing data</div></div>
            <ul className="space-y-1.5 text-sm">
              {missingClients.map((c) => (
                <li key={c.id} className="flex justify-between">
                  <Link to={`/agency/clients/${c.id}`} className="font-medium hover:text-accent">{c.name}</Link>
                  <span className="text-xs text-muted-foreground">{c.missing.filter((m) => m.importance === "high").map((m) => m.field).join(", ")}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Kpi({ label, value, money }: { label: string; value: number; money?: boolean }) {
  return <Card><CardContent className="pt-4">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-xl font-bold font-mono mt-1">{money ? "$" : ""}{Number(value || 0).toLocaleString()}</div>
  </CardContent></Card>;
}

function ClientList({ title, icon, rows }: { title: string; icon: React.ReactNode; rows: { id: string; name: string; cur: any; growth: number }[] }) {
  return (
    <Card><CardContent className="pt-5">
      <div className="flex items-center gap-2 mb-3">{icon}<div className="font-semibold text-sm">{title}</div></div>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No data.</p> : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="flex justify-between items-center text-sm">
              <Link to={`/agency/clients/${r.id}`} className="font-medium hover:text-accent">{r.name}</Link>
              <span className={`font-mono text-xs ${r.growth > 0 ? "text-emerald-600" : r.growth < 0 ? "text-destructive" : "text-muted-foreground"}`}>{r.growth > 0 ? "+" : ""}{r.growth.toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      )}
    </CardContent></Card>
  );
}
