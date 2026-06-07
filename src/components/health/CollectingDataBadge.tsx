import { Badge } from "@/components/ui/badge";
import { Hourglass } from "lucide-react";
import { COLLECTING_BADGE_CLASS, COLLECTING_DATA_LABEL } from "@/lib/clientStatus";
import { cn } from "@/lib/utils";

export function CollectingDataBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn(COLLECTING_BADGE_CLASS, className)}>
      <Hourglass className="h-3 w-3 mr-1" /> {COLLECTING_DATA_LABEL}
    </Badge>
  );
}
