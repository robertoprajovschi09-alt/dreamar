import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Bookmark } from "lucide-react";
import { aiInsights } from "@/lib/competitors";
import { toast } from "@/hooks/use-toast";
import { SwipeFormDialog } from "@/components/swipe/SwipeFormDialog";

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  agencyId: string;
  clientId: string;
};

export function CompetitorInsightsDialog({ open, onOpenChange, agencyId, clientId }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [swipeOpen, setSwipeOpen] = useState(false);
  const [swipeDefaults, setSwipeDefaults] = useState<any>(null);

  const run = async () => {
    setLoading(true);
    try { setData(await aiInsights(clientId)); }
    catch (e: any) { toast({ title: "AI failed", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const saveIdea = (idea: any) => {
    setSwipeDefaults({
      agency_id: agencyId, client_id: clientId,
      title: idea.title, type: "video_idea", hook: idea.hook,
      content_angle: idea.angle, performance_notes: idea.why_it_works,
      visibility: "agency_internal",
    });
    setSwipeOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>AI competitor insights</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Button onClick={run} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {data ? "Regenerate" : "Generate insights"}
            </Button>

            {data && (
              <>
                {data.missing_data?.length > 0 && (
                  <div className="text-xs p-2 rounded bg-muted">
                    <div className="font-semibold mb-1">Missing data</div>
                    <ul className="list-disc pl-4">{data.missing_data.map((m: string, i: number) => <li key={i}>{m}</li>)}</ul>
                  </div>
                )}
                <Section title="Patterns observed" items={data.patterns} />
                <Section title="Common content types" items={data.common_content_types} />
                <Section title="Missed opportunities" items={data.missed_opportunities} />
                <Section title="Differentiation angles for you" items={data.differentiation_angles} />

                <div>
                  <h4 className="font-semibold text-sm mb-2">Original ideas (not copied)</h4>
                  <div className="space-y-2">
                    {(data.original_ideas || []).map((i: any, k: number) => (
                      <div key={k} className="border rounded p-3 space-y-1">
                        <div className="font-medium text-sm">{i.title}</div>
                        {i.hook && <p className="text-xs"><span className="text-muted-foreground">Hook: </span>{i.hook}</p>}
                        {i.angle && <p className="text-xs"><span className="text-muted-foreground">Angle: </span>{i.angle}</p>}
                        {i.why_it_works && <p className="text-xs text-muted-foreground">{i.why_it_works}</p>}
                        <Button size="sm" variant="outline" onClick={() => saveIdea(i)}><Bookmark className="h-3 w-3 mr-1" />Salvează în Inspirație</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <SwipeFormDialog open={swipeOpen} onOpenChange={setSwipeOpen} defaults={swipeDefaults} />
    </>
  );
}

function Section({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <h4 className="font-semibold text-sm mb-1">{title}</h4>
      <ul className="list-disc pl-5 text-sm space-y-1">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}
