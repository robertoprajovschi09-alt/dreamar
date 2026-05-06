import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HealthScoreRing } from "./HealthScoreRing";
import { STATUS_META, type HealthScore } from "@/lib/healthScore";

export function HealthScoreMini({ score, clientName }: { score: HealthScore; clientName: string }) {
  const meta = STATUS_META[score.score_status];
  return (
    <Link to={`/agency/clients/${score.client_id}?tab=health`}>
      <Card className="hover:border-accent transition">
        <CardContent className="pt-4 pb-4 flex items-center gap-3">
          <HealthScoreRing score={Number(score.total_score)} status={score.score_status} size={70} stroke={8} />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate">{clientName}</div>
            <Badge variant="outline" className={`${meta.badgeClass} mt-1 text-[10px]`}>{meta.label}</Badge>
            {(score.missing_data || []).length > 0 && (
              <div className="text-[10px] text-muted-foreground mt-1">{(score.missing_data as string[]).length} missing</div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
