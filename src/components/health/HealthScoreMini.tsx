import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HealthScoreRing } from "./HealthScoreRing";
import { CollectingDataBadge } from "./CollectingDataBadge";
import { STATUS_META, type HealthScore } from "@/lib/healthScore";

export function HealthScoreMini({ score, clientName, collecting = false }: { score: HealthScore; clientName: string; collecting?: boolean }) {
  const meta = STATUS_META[score.score_status];
  return (
    <Link to={`/agency/clients/${score.client_id}?tab=health`}>
      <Card className="hover:border-accent transition">
        <CardContent className="pt-4 pb-4 flex items-center gap-3">
          {collecting ? (
            <div className="h-[70px] w-[70px] flex items-center justify-center rounded-full border border-dashed border-border text-[10px] text-muted-foreground text-center px-1">
              New
            </div>
          ) : (
            <HealthScoreRing score={Number(score.total_score)} status={score.score_status} size={70} stroke={8} />
          )}
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate">{clientName}</div>
            {collecting ? (
              <CollectingDataBadge className="mt-1 text-[10px]" />
            ) : (
              <Badge variant="outline" className={`${meta.badgeClass} mt-1 text-[10px]`}>{meta.label}</Badge>
            )}
            {!collecting && (score.missing_data || []).length > 0 && (
              <div className="text-[10px] text-muted-foreground mt-1">{(score.missing_data as string[]).length} missing</div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
