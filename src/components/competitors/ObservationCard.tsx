import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Sparkles, Bookmark, Pencil, Trash2, ExternalLink } from "lucide-react";
import { type CompetitorObservation } from "@/lib/competitors";
import { useSignedUrl } from "@/lib/storage";

type Props = {
  obs: CompetitorObservation;
  onView: () => void;
  onAnalyze: () => void;
  onSaveSwipe: () => void;
  onEdit: () => void;
  onDelete: () => void;
  analyzing?: boolean;
};

export function ObservationCard({ obs, onView, onAnalyze, onSaveSwipe, onEdit, onDelete, analyzing }: Props) {
  const img = useSignedUrl(obs.screenshot_url);
  return (
    <Card className="overflow-hidden">
      {img && <div className="aspect-video bg-muted overflow-hidden cursor-pointer" onClick={onView}><img src={img} alt={obs.title} className="w-full h-full object-cover" /></div>}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="font-medium text-sm line-clamp-2 cursor-pointer" onClick={onView}>{obs.title}</div>
          {obs.visible_to_client && <Badge variant="outline" className="shrink-0 text-[10px]">Client</Badge>}
        </div>
        <div className="flex flex-wrap gap-1">
          {obs.platform && <Badge variant="secondary" className="capitalize">{obs.platform}</Badge>}
          {obs.content_type && <Badge variant="outline" className="capitalize">{obs.content_type}</Badge>}
          {obs.estimated_performance && <Badge variant="outline" className="capitalize">{obs.estimated_performance}</Badge>}
        </div>
        {obs.hook && <p className="text-xs text-muted-foreground line-clamp-2">"{obs.hook}"</p>}
        <div className="text-[11px] text-muted-foreground">{new Date(obs.observed_date).toLocaleDateString()}</div>
        <div className="flex flex-wrap gap-1 pt-1">
          <Button size="sm" variant="outline" onClick={onView}><Eye className="h-3 w-3 mr-1" />View</Button>
          <Button size="sm" variant="outline" onClick={onAnalyze} disabled={analyzing}><Sparkles className="h-3 w-3 mr-1" />Analyze</Button>
          <Button size="sm" variant="outline" onClick={onSaveSwipe}><Bookmark className="h-3 w-3 mr-1" />Swipe</Button>
          {obs.content_url && <Button size="sm" variant="ghost" asChild><a href={obs.content_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a></Button>}
          <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
          <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
        </div>
      </div>
    </Card>
  );
}
