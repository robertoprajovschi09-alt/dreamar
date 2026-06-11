import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type KpiType = "number" | "percentage" | "currency" | "text" | "boolean";

export type PriorityKpi = {
  key: string;
  label: string;
  type: KpiType;
  value: number | string | boolean | null;
  target?: number | null;
  unit?: string | null;
};

function format(v: any, type: KpiType): string {
  if (v === null || v === undefined || v === "") return "—";
  switch (type) {
    case "currency": return `€${Number(v).toLocaleString()}`;
    case "percentage": return `${Number(v).toFixed(1)}%`;
    case "boolean": return v ? "Yes" : "No";
    case "number": return Number(v).toLocaleString();
    default: return String(v);
  }
}

export function PriorityKpiCard({ kpi }: { kpi: PriorityKpi }) {
  const missing = kpi.value === null || kpi.value === undefined || kpi.value === "";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{kpi.label}</div>
        <div className="text-2xl font-semibold font-mono mt-1">{format(kpi.value, kpi.type)}</div>
        {kpi.target != null && !missing && (
          <div className="text-[11px] text-muted-foreground mt-1">Target: {format(kpi.target, kpi.type)}</div>
        )}
        {missing && (
          <Badge variant="outline" className="mt-2 text-[10px] font-normal">Date lipsă</Badge>
        )}
      </CardContent>
    </Card>
  );
}
