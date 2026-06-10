import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { aggregateByPlatform, PLATFORM_LABEL, type AnalyticsEntry } from "@/lib/analytics";

export function PlatformBreakdown({ entries }: { entries: AnalyticsEntry[] }) {
  const data = aggregateByPlatform(entries).map((d) => ({ ...d, platform: PLATFORM_LABEL[d.platform] || d.platform }));
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Platform breakdown</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? <p className="text-sm text-muted-foreground">Nu există date încă.</p> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="platform" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Bar dataKey="views" fill="hsl(var(--accent))" radius={[4,4,0,0]} />
              <Bar dataKey="engagement" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
