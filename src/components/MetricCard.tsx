import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricCard({
  label, value, icon: Icon, trend, accent = false, hint,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  trend?: { value: string; up?: boolean };
  accent?: boolean;
  hint?: string;
}) {
  return (
    <div className={cn(
      "rounded-lg border p-4 transition-colors",
      accent ? "border-accent/40 bg-accent/5 shadow-glow" : "border-border bg-card hover:bg-surface-1"
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        {Icon && <Icon className={cn("h-4 w-4", accent ? "text-accent" : "text-muted-foreground")} />}
      </div>
      <div className="metric-number text-2xl md:text-3xl font-bold mt-2">{value}</div>
      <div className="flex items-center justify-between mt-1">
        {trend ? (
          <span className={cn("text-xs font-medium", trend.up ? "text-success" : "text-accent")}>
            {trend.up ? "▲" : "▼"} {trend.value}
          </span>
        ) : <span />}
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
