import { Card, CardContent } from "@/components/ui/card";
import { engagementRate, fmtNum, fmtPct, sumField } from "@/lib/performance";

export function PerformanceStats({ videos, prevVideos }: { videos: any[]; prevVideos?: any[] }) {
  const totals = {
    videos: videos.length,
    views: sumField(videos, "views"),
    reach: sumField(videos, "reach"),
    likes: sumField(videos, "likes"),
    comments: sumField(videos, "comments"),
    shares: sumField(videos, "shares"),
    saves: sumField(videos, "saves"),
    calls: sumField(videos, "calls"),
    dms: sumField(videos, "dms"),
    sales: sumField(videos, "estimated_sales_impact"),
  };
  const er = engagementRate({
    likes: totals.likes, comments: totals.comments, shares: totals.shares, saves: totals.saves,
    views: totals.views, reach: totals.reach,
  });

  const prevViews = prevVideos ? sumField(prevVideos, "views") : null;
  const delta = prevViews && prevViews > 0 ? ((totals.views - prevViews) / prevViews) * 100 : null;

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
      <Stat label="Videos" value={totals.videos} />
      <Stat label="Views" value={fmtNum(totals.views)} hint={delta != null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}% vs prev` : undefined} positive={delta != null && delta >= 0} />
      <Stat label="Reach" value={fmtNum(totals.reach)} />
      <Stat label="Engagement rate" value={fmtPct(er)} />
      <Stat label="Sales impact" value={totals.sales ? `€${fmtNum(totals.sales)}` : "—"} />
      <Stat label="Likes" value={fmtNum(totals.likes)} />
      <Stat label="Comments" value={fmtNum(totals.comments)} />
      <Stat label="Shares" value={fmtNum(totals.shares)} />
      <Stat label="Calls/DMs" value={fmtNum(totals.calls + totals.dms)} />
      <Stat label="Saves" value={fmtNum(totals.saves)} />
    </div>
  );
}

function Stat({ label, value, hint, positive }: { label: string; value: any; hint?: string; positive?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold font-mono mt-1">{value}</div>
        {hint && <div className={`text-[11px] mt-0.5 ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{hint}</div>}
      </CardContent>
    </Card>
  );
}
