import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listClientVisibleObservations, type CompetitorObservation } from "@/lib/competitors";
import { useSignedUrl } from "@/lib/storage";
import { ExternalLink } from "lucide-react";

export function ClientMarketInsightsTab({ clientId }: { clientId: string }) {
  const [obs, setObs] = useState<CompetitorObservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listClientVisibleObservations(clientId).then(setObs).finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <p className="text-sm text-muted-foreground">Se încarcă…</p>;
  if (!obs.length) return <p className="text-sm text-muted-foreground">Niciun insight de piață partajat încă.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {obs.map((o) => <ObservationItem key={o.id} o={o} />)}
    </div>
  );
}

function ObservationItem({ o }: { o: CompetitorObservation }) {
  const img = useSignedUrl(o.screenshot_url);
  return (
    <Card className="overflow-hidden">
      {o.screenshot_url && <div className="aspect-video bg-muted overflow-hidden"><img src={img ?? undefined} alt={o.title} className="w-full h-full object-cover" /></div>}
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
}

