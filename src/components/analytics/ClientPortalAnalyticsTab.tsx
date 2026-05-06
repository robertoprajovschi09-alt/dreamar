import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { listAnalyticsEntries, totals, type AnalyticsEntry } from "@/lib/analytics";
import { PlatformBreakdown } from "./PlatformBreakdown";
import { MonthlyComparisonChart } from "./MonthlyComparisonChart";

export function ClientPortalAnalyticsTab({ clientId }: { clientId: string }) {
  const now = new Date();
  const [entries, setEntries] = useState<AnalyticsEntry[]>([]);
  const [periodEntries, setPeriodEntries] = useState<AnalyticsEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [all, p] = await Promise.all([
          listAnalyticsEntries({ clientId }),
          listAnalyticsEntries({ clientId, year: now.getFullYear(), month: now.getMonth() + 1 }),
        ]);
        setEntries(all); setPeriodEntries(p);
      } finally { setLoading(false); }
    })();
  }, [clientId]);

  const t = useMemo(() => totals(periodEntries), [periodEntries]);

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Views (this month)" value={t.views} />
        <Kpi label="Reach" value={t.reach} />
        <Kpi label="Engagement" value={t.engagement} />
        <Kpi label="Followers gained" value={t.followers_gained} />
        <Kpi label="Leads" value={t.leads} />
        <Kpi label="Bookings" value={t.bookings} />
        <Kpi label="Sales" value={t.sales} />
        <Kpi label="Revenue" value={t.revenue} money />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <PlatformBreakdown entries={periodEntries} />
        <MonthlyComparisonChart entries={entries} />
      </div>
    </div>
  );
}

function Kpi({ label, value, money }: { label: string; value: number; money?: boolean }) {
  return (
    <Card><CardContent className="pt-4">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-bold font-mono mt-1">{money ? "$" : ""}{Number(value || 0).toLocaleString()}</div>
    </CardContent></Card>
  );
}
