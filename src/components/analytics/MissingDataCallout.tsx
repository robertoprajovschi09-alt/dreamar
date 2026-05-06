import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MissingField } from "@/lib/analytics";

export function MissingDataCallout({ missing, onAdd }: { missing: MissingField[]; onAdd?: () => void }) {
  if (!missing.length) return null;
  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <div className="font-medium text-sm">Missing data ({missing.length})</div>
        </div>
        <ul className="space-y-2">
          {missing.map((m, i) => (
            <li key={i} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <div className="font-medium">{m.field}</div>
                <div className="text-xs text-muted-foreground">{m.reason}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[10px] uppercase">{m.owner}</Badge>
                <Badge variant="secondary" className="text-[10px] uppercase">{m.importance}</Badge>
              </div>
            </li>
          ))}
        </ul>
        {onAdd && <Button size="sm" variant="outline" onClick={onAdd}>Add missing data</Button>}
      </CardContent>
    </Card>
  );
}
