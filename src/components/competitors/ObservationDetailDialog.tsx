import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Bookmark, Loader2, ExternalLink } from "lucide-react";
import { aiAnalyzeObservation, type CompetitorObservation } from "@/lib/competitors";
import { useSignedUrl } from "@/lib/storage";
import { toast } from "@/hooks/use-toast";
import { SwipeFormDialog } from "@/components/swipe/SwipeFormDialog";

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  observation: CompetitorObservation | null;
  onUpdated?: () => void;
};

export function ObservationDetailDialog({ open, onOpenChange, observation, onUpdated }: Props) {
  const [analyzing, setAnalyzing] = useState(false);
  const [swipeOpen, setSwipeOpen] = useState(false);
  if (!observation) return null;
  const img = useSignedUrl(observation.screenshot_url);
  const a = observation.ai_analysis || {};

  const analyze = async () => {
    setAnalyzing(true);
    try { await aiAnalyzeObservation(observation.id); toast({ title: "Analysis ready" }); onUpdated?.(); }
    catch (e: any) { toast({ title: "AI failed", description: e.message, variant: "destructive" }); }
    finally { setAnalyzing(false); }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{observation.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {img && <img src={img} alt={observation.title} className="w-full rounded-md border" />}
            <div className="flex flex-wrap gap-1">
              {observation.platform && <Badge variant="secondary" className="capitalize">{observation.platform}</Badge>}
              {observation.content_type && <Badge variant="outline" className="capitalize">{observation.content_type}</Badge>}
              {observation.estimated_performance && <Badge variant="outline" className="capitalize">{observation.estimated_performance}</Badge>}
              {observation.tags?.map((t) => <Badge key={t} variant="outline">#{t}</Badge>)}
            </div>
            {observation.hook && <Field label="Hook" value={observation.hook} />}
            {observation.caption && <Field label="Caption" value={observation.caption} />}
            {observation.offer && <Field label="Offer" value={observation.offer} />}
            {observation.content_angle && <Field label="Angle" value={observation.content_angle} />}
            {observation.notes && <Field label="Notes" value={observation.notes} />}
            {observation.content_url && (
              <a href={observation.content_url} target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-1"><ExternalLink className="h-3 w-3" />Open original</a>
            )}

            <div className="pt-3 border-t space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">AI analysis</h4>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={analyze} disabled={analyzing}>
                    {analyzing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    {Object.keys(a).length ? "Re-analyze" : "Analyze"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSwipeOpen(true)}><Bookmark className="h-3 w-3 mr-1" />Save to Swipe</Button>
                </div>
              </div>
              {a.why_it_likely_worked && <Field label="Why it likely worked" value={a.why_it_likely_worked} />}
              {a.hook_breakdown && <Field label="Hook breakdown" value={a.hook_breakdown} />}
              {a.offer_breakdown && <Field label="Offer breakdown" value={a.offer_breakdown} />}
              {typeof a.originality_score === "number" && <Field label="Originality score" value={`${a.originality_score}/10`} />}
              {Array.isArray(a.ideas_to_test) && a.ideas_to_test.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Original ideas to test</div>
                  <ul className="list-disc pl-5 text-sm space-y-1">{a.ideas_to_test.map((i: string, k: number) => <li key={k}>{i}</li>)}</ul>
                </div>
              )}
              {!Object.keys(a).length && <p className="text-xs text-muted-foreground">No analysis yet. Click Analyze.</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SwipeFormDialog
        open={swipeOpen}
        onOpenChange={setSwipeOpen}
        defaults={{
          agency_id: observation.agency_id,
          client_id: observation.client_id,
          title: observation.title,
          type: "video_idea" as any,
          platform: observation.platform || undefined,
          hook: observation.hook || undefined,
          caption: observation.caption || undefined,
          content_angle: observation.content_angle || undefined,
          source_url: observation.content_url || undefined,
          performance_notes: observation.estimated_performance || undefined,
          visibility: "agency_internal" as any,
        } as any}
      />
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm whitespace-pre-wrap">{value}</div>
    </div>
  );
}
