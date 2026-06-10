import { ArrowUpRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricCard({
  label, value, icon: Icon, trend, accent = false, featured = false, hint,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  trend?: { value: string; up?: boolean };
  accent?: boolean;
  featured?: boolean;
  hint?: string;
}) {
  const isHero = featured || accent;
  return (
    <div className={cn(
      "rounded-3xl p-6 transition-all",
      isHero
        ? "bg-gradient-accent text-accent-foreground shadow-glow"
        : "bg-card border border-border/60 shadow-soft hover:shadow-soft-lg"
    )}>
      <div className="flex items-start justify-between gap-3">
        <span className={cn(
          "text-sm font-medium",
          isHero ? "text-accent-foreground/90" : "text-muted-foreground"
        )}>{label}</span>
        <div className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
          isHero ? "bg-white/15 text-accent-foreground" : "bg-surface-1 text-muted-foreground"
        )}>
          {Icon ? <Icon className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
        </div>
      </div>
      <div className="metric-number text-4xl md:text-5xl font-extrabold mt-6">{value}</div>
      <div className="flex items-center justify-between gap-2 mt-4 min-h-[24px]">
        {trend ? (
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            isHero
              ? "bg-white/15 text-accent-foreground"
              : trend.up
                ? "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]"
                : "bg-accent-soft text-accent"
          )}>
            {trend.up ? "▲" : "▼"} {trend.value}
          </span>
        ) : <span />}
        {hint && (
          <span className={cn(
            "text-[11px]",
            isHero ? "text-accent-foreground/80" : "text-muted-foreground"
          )}>{hint}</span>
        )}
      </div>
    </div>
  );
}
