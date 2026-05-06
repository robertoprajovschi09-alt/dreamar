import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listClientVisibleObservations, screenshotUrl, type CompetitorObservation } from "@/lib/competitors";
import { ExternalLink } from "lucide-react";

export function ClientMarketInsightsTab({ clientId }: { clientId: string }) {
  const [obs, setObs] = useState<CompetitorObservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listClientVisibleObservations(clientId).then(setObs).finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!obs.length) return <p className="text-sm text-muted-foreground">No market insights shared yet.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {obs.map((o) => {
        const img = screenshotUrl(o.screenshot_url);
        return (
          <Card key={o.id} className="overflow-hidden">
            {img && <div className="aspect-video bg-muted overflow-hidden"><img src={img} alt={o.title} className="w-full h-full object-cover" /></div>}
            <div className="p-3 space-y-2">
              <div className="font-medium text-sm">{o.title}</div>
              <div className="flex flex-wrap gap-1">
                {o.platform && <Badge variant="secondary" className="capitalize">{o.platform}</Badge>}
                {o.content_type && <Badge variant="outline" className="capitalize">{o.content_type}</Badge>}
              </div>
              {o.hook && <p className="text-xs text-muted-foreground line-clamp-3">"{o.hook}"</p>}
              {o.content_url && (
                <a href={o.content_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />Open original
                </a>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
