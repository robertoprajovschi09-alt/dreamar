import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Upload, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  listAnalyticsEntries, listContentMetrics, deleteAnalyticsEntry, totals,
  detectMissingData, PLATFORMS, PLATFORM_LABEL, type AnalyticsEntry, type ContentMetric,
} from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { AnalyticsEntryDialog } from "./AnalyticsEntryDialog";
import { CsvImportDialog } from "./CsvImportDialog";
import { PlatformBreakdown } from "./PlatformBreakdown";
import { MonthlyComparisonChart } from "./MonthlyComparisonChart";
import { ContentRankingTable } from "./ContentRankingTable";
import { AnalyticsInsightsPanel } from "./AnalyticsInsightsPanel";
import { MissingDataCallout } from "./MissingDataCallout";

export function ClientAnalyticsTab({ clientId, agencyId }: { clientId: string; agencyId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [platform, setPlatform] = useState<string>("");
  const [entries, setEntries] = useState<AnalyticsEntry[]>([]);
  const [allEntries, setAllEntries] = useState<AnalyticsEntry[]>([]);
  const [metrics, setMetrics] = useState<ContentMetric[]>([]);
  const [posts, setPosts] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [entryOpen, setEntryOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [editing, setEditing] = useState<AnalyticsEntry | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [period, all, m, p] = await Promise.all([
        listAnalyticsEntries({ clientId, year, month, platform: platform || undefined }),
        listAnalyticsEntries({ clientId }),
        listContentMetrics({ clientId }),
        supabase.from("content_posts").select("id,title").eq("client_id", clientId),
      ]);
      setEntries(period); setAllEntries(all); setMetrics(m);
      setPosts((p.data as any[])?.map((x) => ({ id: x.id, title: x.title })) || []);
    } finally { setLoading(false); }
  }, [clientId, year, month, platform]);

  useEffect(() => { load(); }, [load]);

  const t = useMemo(() => totals(entries), [entries]);
  const missing = useMemo(() => detectMissingData(entries), [entries]);

  const remove = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    try { await deleteAnalyticsEntry(id); toast.success("Deleted"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <Card><CardContent className="pt-5 flex flex-wrap items-end gap-3">
        <div><Label className="text-xs">Year</Label><Input type="number" className="w-24" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
        <div><Label className="text-xs">Month</Label><Input type="number" min={1} max={12} className="w-20" value={month} onChange={(e) => setMonth(Number(e.target.value))} /></div>
        <div><Label className="text-xs">Platform</Label>
          <Select value={platform || "__all"} onValueChange={(v) => setPlatform(v === "__all" ? "" : v)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All platforms</SelectItem>
              {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{PLATFORM_LABEL[p]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => setCsvOpen(true)}><Upload className="h-4 w-4 mr-1.5" /> Import CSV</Button>
          <Button onClick={() => { setEditing(undefined); setEntryOpen(true); }} className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4 mr-1.5" /> Add entry</Button>
        </div>
      </CardContent></Card>

      {loading ? (
        <div className="p-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Kpi label="Views" value={t.views} />
            <Kpi label="Reach" value={t.reach} />
            <Kpi label="Engagement" value={t.engagement} />
            <Kpi label="Followers gained" value={t.followers_gained} />
            <Kpi label="Leads" value={t.leads} />
            <Kpi label="Bookings" value={t.bookings} />
            <Kpi label="Sales" value={t.sales} />
            <Kpi label="Revenue" value={t.revenue} money />
            <Kpi label="Ad spend" value={t.ad_spend} money />
            <Kpi label="ROAS" value={t.ad_spend ? Number((t.revenue / t.ad_spend).toFixed(2)) : 0} />
          </div>

          <MissingDataCallout missing={missing} onAdd={() => { setEditing(undefined); setEntryOpen(true); }} />

          <div className="grid lg:grid-cols-2 gap-4">
            <PlatformBreakdown entries={entries} />
            <MonthlyComparisonChart entries={allEntries} />
          </div>

          <ContentRankingTable metrics={metrics} posts={posts} />

          <AnalyticsInsightsPanel clientId={clientId} year={year} month={month} />

          <Card>
            <CardContent className="pt-5">
              <div className="text-sm font-semibold mb-3">Period entries ({entries.length})</div>
              {entries.length === 0 ? <p className="text-sm text-muted-foreground">No entries for this period.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-muted-foreground border-b border-border">
                      <th className="py-1.5 pr-2">Platform</th><th className="py-1.5 px-2">Views</th><th className="py-1.5 px-2">Reach</th>
                      <th className="py-1.5 px-2">Eng.</th><th className="py-1.5 px-2">Leads</th><th className="py-1.5 px-2">Revenue</th>
                      <th className="py-1.5 px-2">Source</th><th className="py-1.5 pl-2"></th>
                    </tr></thead>
                    <tbody>
                      {entries.map((e) => (
                        <tr key={e.id} className="border-b border-border/50">
                          <td className="py-1.5 pr-2 font-medium">{PLATFORM_LABEL[e.platform] || e.platform}</td>
                          <td className="py-1.5 px-2 font-mono">{Number(e.views).toLocaleString()}</td>
                          <td className="py-1.5 px-2 font-mono">{Number(e.reach).toLocaleString()}</td>
                          <td className="py-1.5 px-2 font-mono">{(Number(e.likes)+Number(e.comments)+Number(e.shares)+Number(e.saves)).toLocaleString()}</td>
                          <td className="py-1.5 px-2 font-mono">{e.leads ?? "—"}</td>
                          <td className="py-1.5 px-2 font-mono">{e.revenue ?? "—"}</td>
                          <td className="py-1.5 px-2 text-muted-foreground">{e.source}</td>
                          <td className="py-1.5 pl-2 text-right">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(e); setEntryOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <AnalyticsEntryDialog
        open={entryOpen} onOpenChange={setEntryOpen}
        agencyId={agencyId} clientId={clientId}
        defaultMonth={month} defaultYear={year} defaultPlatform={platform || undefined}
        initial={editing} onSaved={load}
      />
      <CsvImportDialog
        open={csvOpen} onOpenChange={setCsvOpen}
        agencyId={agencyId} clientId={clientId} target="analytics_entries"
        onImported={load}
      />
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
