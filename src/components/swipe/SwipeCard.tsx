import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Bookmark, Sparkles, Calendar as CalIcon, Pencil, Trash2, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { typeLabel, type SwipeFile } from "@/lib/swipe";

type Props = {
  swipe: SwipeFile;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUseInCalendar: () => void;
  onGenerateVariations: () => void;
};

export function SwipeCard({ swipe, onView, onEdit, onDelete, onUseInCalendar, onGenerateVariations }: Props) {
  const preview = swipe.hook || swipe.script || swipe.caption || swipe.content_angle || "—";
  return (
    <Card className="p-4 flex flex-col gap-3 hover:border-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="secondary" className="text-[10px]">{typeLabel(swipe.type)}</Badge>
            {swipe.platform && <Badge variant="outline" className="text-[10px] capitalize">{swipe.platform}</Badge>}
            {swipe.visibility === "client_specific" && <Badge variant="outline" className="text-[10px]">Client</Badge>}
            {swipe.visibility === "global_template" && <Badge variant="outline" className="text-[10px]">Global</Badge>}
          </div>
          <h3 className="font-semibold truncate">{swipe.title}</h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView}><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={onUseInCalendar}><CalIcon className="h-4 w-4 mr-2" /> Use in calendar</DropdownMenuItem>
            <DropdownMenuItem onClick={onGenerateVariations}><Sparkles className="h-4 w-4 mr-2" /> Generate variations</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-3">{preview}</p>
      {swipe.tags?.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {swipe.tags.slice(0, 4).map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">#{t}</span>)}
        </div>
      )}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border pt-2">
        <span className="flex items-center gap-1"><Bookmark className="h-3 w-3" /> Used {swipe.usage_count}×</span>
        <span>{new Date(swipe.created_at).toLocaleDateString()}</span>
      </div>
    </Card>
  );
}
