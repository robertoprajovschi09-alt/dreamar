import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, RefreshCw, Wand2, Compass, ExternalLink, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { typeLabel, type SwipeFile, aiAnalyze, aiVariations, aiAdaptNiche, aiSuggestReuse, createSwipe } from "@/lib/swipe";
import { toast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  swipe: SwipeFile | null;
  onUseInCalendar?: (sw: SwipeFile) => void;
  onChanged?: () => void;
};

export function SwipeDetailDialog({ open, onOpenChange, swipe, onUseInCalendar, onChanged }: Props) {
  const { agency, profile } = useUser();
  const [why, setWhy] = useState<string | null>(null);
  const [whyLoading, setWhyLoading] = useState(false);
  const [variations, setVariations] = useState<{ hook: string; script?: string; angle?: string }[] | null>(null);
  const [varLoading, setVarLoading] = useState(false);
  const [targetNiche, setTargetNiche] = useState("");
  const [adapted, setAdapted] = useState<any>(null);
  const [adaptLoading, setAdaptLoading] = useState(false);
  const [reuse, setReuse] = useState<any[] | null>(null);
  const [reuseLoading, setReuseLoading] = useState(false);

  useEffect(() => {
    if (open && swipe) {
      setWhy(swipe.why_it_worked);
      setVariations(null); setAdapted(null); setReuse(null); setTargetNiche("");
    }
  }, [open, swipe]);

  if (!swipe) return null;

  const runAnalyze = async () => {
    setWhyLoading(true);
    try { const r = await aiAnalyze(swipe.id); setWhy(r.why_it_worked); onChanged?.(); }
    catch (e: any) { toast({ title: "Analysis failed", description: e.message, variant: "destructive" }); }
    finally { setWhyLoading(false); }
  };
  const runVariations = async () => {
    setVarLoading(true);
    try { const r = await aiVariations(swipe.id, 10); setVariations(r.variations); }
    catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setVarLoading(false); }
  };
  const runAdapt = async () => {
    if (!targetNiche.trim()) return;
    setAdaptLoading(true);
    try { setAdapted(await aiAdaptNiche(swipe.id, targetNiche.trim())); }
    catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setAdaptLoading(false); }
  };
  const runReuse = async () => {
    setReuseLoading(true);
    try { const r = await aiSuggestReuse(swipe.id); setReuse(r.suggestions); }
    catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setReuseLoading(false); }
  };

  const saveVariation = async (v: { hook: string; script?: string; angle?: string }) => {
    if (!agency) return;
    try {
      await createSwipe({
        agency_id: agency.id, type: "hook", platform: swipe.platform, niche: swipe.niche,
        title: v.hook.slice(0, 80), hook: v.hook, script: v.script || null, content_angle: v.angle || swipe.content_angle,
        visibility: "agency_internal", tags: swipe.tags, created_by: profile?.id,
      } as any);
      toast({ title: "Variation saved" });
      onChanged?.();
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  const saveAdapted = async () => {
    if (!agency || !adapted) return;
    try {
      await createSwipe({
        agency_id: agency.id, type: swipe.type, platform: swipe.platform, niche: targetNiche,
        title: adapted.title, hook: adapted.hook, script: adapted.script, caption: adapted.caption,
        content_angle: swipe.content_angle, visibility: "agency_internal",
        tags: [...(swipe.tags || []), ...(adapted.suggested_tags || [])], created_by: profile?.id,
      } as any);
      toast({ title: "Adapted swipe saved" });
      onChanged?.();
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{typeLabel(swipe.type)}</Badge>
            {swipe.platform && <Badge variant="outline" className="capitalize">{swipe.platform}</Badge>}
            {swipe.niche && <Badge variant="outline">{swipe.niche}</Badge>}
            <Badge variant="outline">Used {swipe.usage_count}×</Badge>
          </div>
          <DialogTitle className="text-xl">{swipe.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {swipe.hook && <Section label="Hook">{swipe.hook}</Section>}
          {swipe.script && <Section label="Script">{swipe.script}</Section>}
          {swipe.caption && <Section label="Caption">{swipe.caption}</Section>}
          {swipe.content_angle && <Section label="Angle">{swipe.content_angle}</Section>}
          {swipe.performance_notes && <Section label="Performance notes">{swipe.performance_notes}</Section>}
          {swipe.source_url && (
            <a href={swipe.source_url} target="_blank" rel="noreferrer" className="text-xs text-accent inline-flex items-center gap-1 hover:underline">
              <ExternalLink className="h-3 w-3" /> Open source
            </a>
          )}

          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> AI tools</div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => onUseInCalendar?.(swipe)}>Use in calendar</Button>
              </div>
            </div>

            <Card className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium uppercase text-muted-foreground">Why this worked</div>
                <Button size="sm" variant="ghost" onClick={runAnalyze} disabled={whyLoading}>
                  {whyLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{why || "Run analysis to get an AI breakdown."}</p>
            </Card>

            <Card className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium uppercase text-muted-foreground">10 hook variations</div>
                <Button size="sm" variant="outline" onClick={runVariations} disabled={varLoading}>
                  {varLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Wand2 className="h-3.5 w-3.5 mr-1" />} Generate
                </Button>
              </div>
              {variations && variations.length === 0 && <p className="text-sm text-muted-foreground">No variations returned.</p>}
              {variations && variations.length > 0 && (
                <ul className="space-y-1.5">
                  {variations.map((v, i) => (
                    <li key={i} className="flex items-start justify-between gap-2 text-sm border-t border-border pt-1.5 first:border-0 first:pt-0">
                      <div className="min-w-0">
                        <p className="font-medium">{v.hook}</p>
                        {v.angle && <p className="text-xs text-muted-foreground">{v.angle}</p>}
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => saveVariation(v)}><Plus className="h-3.5 w-3.5" /></Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium uppercase text-muted-foreground">Adapt to another niche</div>
              </div>
              <div className="flex gap-2">
                <Input placeholder="e.g. restaurant, beauty, e-commerce" value={targetNiche} onChange={(e) => setTargetNiche(e.target.value)} className="h-8" />
                <Button size="sm" onClick={runAdapt} disabled={adaptLoading || !targetNiche.trim()}>
                  {adaptLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Adapt"}
                </Button>
              </div>
              {adapted && (
                <div className="text-sm space-y-1 mt-2">
                  <p><span className="text-muted-foreground text-xs">Title:</span> {adapted.title}</p>
                  <p><span className="text-muted-foreground text-xs">Hook:</span> {adapted.hook}</p>
                  <p className="whitespace-pre-wrap"><span className="text-muted-foreground text-xs">Script:</span> {adapted.script}</p>
                  <Button size="sm" variant="outline" onClick={saveAdapted}><Plus className="h-3.5 w-3.5 mr-1" /> Save as new swipe</Button>
                </div>
              )}
            </Card>

            <Card className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium uppercase text-muted-foreground">Suggested reuse</div>
                <Button size="sm" variant="outline" onClick={runReuse} disabled={reuseLoading}>
                  {reuseLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Compass className="h-3.5 w-3.5 mr-1" />} Suggest
                </Button>
              </div>
              {reuse && reuse.length === 0 && <p className="text-sm text-muted-foreground">No matches.</p>}
              {reuse && reuse.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {reuse.map((s, i) => (
                    <li key={i} className="border-t border-border pt-1 first:border-0 first:pt-0">
                      <span className="font-medium">{s.client_name || "Any client"}</span>
                      {s.platform && <span className="text-xs text-muted-foreground"> · {s.platform}</span>}
                      <p className="text-xs text-muted-foreground">{s.reason}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      <div className="text-sm whitespace-pre-wrap">{children}</div>
    </div>
  );
}
