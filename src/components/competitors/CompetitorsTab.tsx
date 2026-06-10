import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Sparkles, GitCompare, ArrowLeft, Loader2 } from "lucide-react";
import {
  listCompetitors, listObservations, deleteCompetitor, deleteObservation,
  COMP_PLATFORMS, type Competitor, type CompetitorObservation,
} from "@/lib/competitors";
import { CompetitorCard } from "@/components/competitors/CompetitorCard";
import { CompetitorFormDialog } from "@/components/competitors/CompetitorFormDialog";
import { ObservationFormDialog } from "@/components/competitors/ObservationFormDialog";
import { ObservationCard } from "@/components/competitors/ObservationCard";
import { ObservationDetailDialog } from "@/components/competitors/ObservationDetailDialog";
import { CompetitorInsightsDialog } from "@/components/competitors/CompetitorInsightsDialog";
import { CompareDialog } from "@/components/competitors/CompareDialog";
import { EmptyState } from "@/components/EmptyState";
import { Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Props = { agencyId: string; clientId: string };

export function CompetitorsTab({ agencyId, clientId }: Props) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [allObs, setAllObs] = useState<CompetitorObservation[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingComp, setEditingComp] = useState<Competitor | null>(null);
  const [compFormOpen, setCompFormOpen] = useState(false);

  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);

  const [obsFormOpen, setObsFormOpen] = useState(false);
  const [editingObs, setEditingObs] = useState<CompetitorObservation | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailObs, setDetailObs] = useState<CompetitorObservation | null>(null);

  const [insightsOpen, setInsightsOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    try {
      const [c, o] = await Promise.all([listCompetitors(clientId), listObservations(clientId)]);
      setCompetitors(c); setAllObs(o);
    } catch (e: any) { toast({ title: "Load failed", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [clientId]);

  const obsByComp = useMemo(() => {
    const m = new Map<string, CompetitorObservation[]>();
    allObs.forEach((o) => {
      if (!m.has(o.competitor_id)) m.set(o.competitor_id, []);
      m.get(o.competitor_id)!.push(o);
    });
    return m;
  }, [allObs]);

  const filteredCompetitors = useMemo(() => {
    const s = search.trim().toLowerCase();
    return competitors.filter((c) => !s || c.name.toLowerCase().includes(s) || (c.niche || "").toLowerCase().includes(s));
  }, [competitors, search]);

  const selectedComp = competitors.find((c) => c.id === selectedCompId) || null;
  const observationsForSelected = useMemo(() => {
    let list = obsByComp.get(selectedCompId || "") || [];
    if (platform !== "all") list = list.filter((o) => o.platform === platform);
    return list;
  }, [obsByComp, selectedCompId, platform]);

  const deleteComp = async (c: Competitor) => {
    if (!confirm(`Delete competitor "${c.name}" and all its observations?`)) return;
    try { await deleteCompetitor(c.id); toast({ title: "Deleted" }); load(); }
    catch (e: any) { toast({ title: "Delete failed", description: e.message, variant: "destructive" }); }
  };

  const removeObs = async (o: CompetitorObservation) => {
    if (!confirm("Delete this observation?")) return;
    try { await deleteObservation(o.id); toast({ title: "Deleted" }); load(); }
    catch (e: any) { toast({ title: "Delete failed", description: e.message, variant: "destructive" }); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  if (selectedComp) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => setSelectedCompId(null)}><ArrowLeft className="h-4 w-4 mr-1" />Back to competitors</Button>
          <div className="flex gap-2">
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                {COMP_PLATFORMS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => { setEditingObs(null); setObsFormOpen(true); }}><Plus className="h-4 w-4 mr-1" />Adaugă observație</Button>
          </div>
        </div>
        <div>
          <h3 className="text-xl font-semibold">{selectedComp.name}</h3>
          {selectedComp.niche && <p className="text-sm text-muted-foreground">{selectedComp.niche}</p>}
        </div>
        {observationsForSelected.length === 0 ? (
          <EmptyState icon={Eye} title="No observations yet" description="Add screenshots, hooks and offers you noticed at this competitor." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {observationsForSelected.map((o) => (
              <ObservationCard
                key={o.id}
                obs={o}
                onView={() => { setDetailObs(o); setDetailOpen(true); }}
                onAnalyze={async () => { setDetailObs(o); setDetailOpen(true); }}
                onSaveSwipe={() => { setDetailObs(o); setDetailOpen(true); }}
                onEdit={() => { setEditingObs(o); setObsFormOpen(true); }}
                onDelete={() => removeObs(o)}
              />
            ))}
          </div>
        )}

        <ObservationFormDialog
          open={obsFormOpen} onOpenChange={setObsFormOpen}
          agencyId={agencyId} clientId={clientId} competitorId={selectedComp.id}
          observation={editingObs} onSaved={load}
        />
        <ObservationDetailDialog open={detailOpen} onOpenChange={setDetailOpen} observation={detailObs} onUpdated={load} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input className="max-w-sm" placeholder="Search competitors…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setInsightsOpen(true)}><Sparkles className="h-4 w-4 mr-1" />AI Insights</Button>
          <Button variant="outline" size="sm" onClick={() => setCompareOpen(true)} disabled={competitors.length < 2}><GitCompare className="h-4 w-4 mr-1" />Compare</Button>
          <Button size="sm" onClick={() => { setEditingComp(null); setCompFormOpen(true); }}><Plus className="h-4 w-4 mr-1" />Adaugă concurent</Button>
        </div>
      </div>

      {filteredCompetitors.length === 0 ? (
        <EmptyState icon={Eye} title="No competitors yet" description="Track competitors to spot patterns and surface original ideas for this client." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCompetitors.map((c) => {
            const list = obsByComp.get(c.id) || [];
            return (
              <CompetitorCard
                key={c.id} competitor={c}
                observationCount={list.length}
                lastObserved={list[0]?.observed_date}
                onOpen={() => setSelectedCompId(c.id)}
                onEdit={() => { setEditingComp(c); setCompFormOpen(true); }}
                onDelete={() => deleteComp(c)}
              />
            );
          })}
        </div>
      )}

      <CompetitorFormDialog
        open={compFormOpen} onOpenChange={setCompFormOpen}
        clientId={clientId} competitor={editingComp} onSaved={load}
      />
      <CompetitorInsightsDialog open={insightsOpen} onOpenChange={setInsightsOpen} agencyId={agencyId} clientId={clientId} />
      <CompareDialog open={compareOpen} onOpenChange={setCompareOpen} clientId={clientId} competitors={competitors} />
    </div>
  );
}
