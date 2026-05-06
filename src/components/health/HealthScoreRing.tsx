import { STATUS_META, type HealthStatus } from "@/lib/healthScore";
import { cn } from "@/lib/utils";

interface Props {
  score: number;
  status: HealthStatus;
  size?: number;
  stroke?: number;
  className?: string;
}

export function HealthScoreRing({ score, status, size = 140, stroke = 12, className }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c - (pct / 100) * c;
  const meta = STATUS_META[status];
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} className="stroke-muted" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          className={cn(meta.ringClass, "transition-[stroke-dashoffset] duration-700")}
          strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={cn("text-3xl font-bold font-mono", meta.textClass)}>{Math.round(score)}</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">/ 100</div>
      </div>
    </div>
  );
}
