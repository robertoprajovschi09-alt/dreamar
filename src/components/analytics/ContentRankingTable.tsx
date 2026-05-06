import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { rankContent, type ContentMetric } from "@/lib/analytics";

export function ContentRankingTable({ metrics, posts }: { metrics: ContentMetric[]; posts: { id: string; title: string }[] }) {
  const ranked = rankContent(metrics, posts);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Content ranking</CardTitle></CardHeader>
      <CardContent>
        {ranked.length === 0 ? <p className="text-sm text-muted-foreground">No content metrics logged yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="py-2 pr-2">Title</th><th className="py-2 px-2">Platform</th>
                <th className="py-2 px-2 text-right">Views</th><th className="py-2 px-2 text-right">Engagement</th>
                <th className="py-2 pl-2">Tier</th>
              </tr></thead>
              <tbody>
                {ranked.slice(0, 20).map((r, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-2 font-medium truncate max-w-xs">{r.title}</td>
                    <td className="py-2 px-2 text-muted-foreground">{(r as any).platform || "—"}</td>
                    <td className="py-2 px-2 text-right font-mono">{r.views.toLocaleString()}</td>
                    <td className="py-2 px-2 text-right font-mono">{r.engagement.toLocaleString()}</td>
                    <td className="py-2 pl-2">
                      <Badge variant={r.tier === "top" ? "default" : r.tier === "low" ? "destructive" : "secondary"} className="text-[10px] uppercase">
                        {r.tier === "top" ? "Top" : r.tier === "low" ? "Under" : "Avg"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
