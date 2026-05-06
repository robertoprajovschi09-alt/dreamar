import { Badge } from "@/components/ui/badge";
import { LEVEL_META, type RiskLevel } from "@/lib/risk";
import { cn } from "@/lib/utils";

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const meta = LEVEL_META[level];
  return (
    <Badge variant="outline" className={cn("uppercase tracking-wide text-[10px]", meta.badgeClass, className)}>
      {meta.label}
    </Badge>
  );
}
