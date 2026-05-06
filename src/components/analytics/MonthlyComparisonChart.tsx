import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { aggregateByMonth, type AnalyticsEntry } from "@/lib/analytics";

export function MonthlyComparisonChart({ entries }: { entries: AnalyticsEntry[] }) {
  const data = aggregateByMonth(entries);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Monthly trend</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="key" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="views" stroke="hsl(var(--accent))" strokeWidth={2} />
              <Line type="monotone" dataKey="engagement" stroke="hsl(var(--primary))" strokeWidth={2} />
              <Line type="monotone" dataKey="followers_gained" stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
