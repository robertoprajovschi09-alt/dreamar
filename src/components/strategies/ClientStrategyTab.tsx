import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles } from "lucide-react";
import { listStrategiesForClient, monthLabel, type MonthlyStrategy } from "@/lib/strategies";

export function ClientStrategyTab({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<MonthlyStrategy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { setItems(await listStrategiesForClient(clientId, { onlySent: true })); }
      finally { setLoading(false); }
    })();
  }, [clientId]);

  if (loading) return <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-accent" /></div>;
  if (!items.length) return (
    <Card><CardContent className="p-10 text-center text-muted-foreground space-y-2">
      <Sparkles className="h-8 w-8 mx-auto text-accent" />
      <div>No strategy has been shared with you yet.</div>
    </CardContent></Card>
  );

  return (
    <div className="space-y-4">
      {items.map((s) => (
        <Card key={s.id}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle>{s.strategy_title}</CardTitle>
                <div className="text-xs text-muted-foreground">{monthLabel(s.month, s.year)}</div>
              </div>
              <Badge className="bg-accent/20 text-accent">Shared by your agency</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {s.executive_summary && <p className="whitespace-pre-line">{s.executive_summary}</p>}
            <Group title="Main focus" items={s.business_focus} />
            <Group title="What worked last month" items={s.what_worked} />
            <Group title="What we'll try" items={s.new_tests} />
            <Group title="Hooks we'll use" items={s.recommended_hooks} />
            <Group title="Content formats" items={s.recommended_content_formats} />
            {s.recommended_campaigns?.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Campaigns</div>
                <div className="space-y-2">
                  {s.recommended_campaigns.map((c, i) => (
                    <div key={i} className="rounded-md border p-3">
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.goal}</div>
                      <div className="text-sm mt-1">{c.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {s.suggested_calendar_plan?.notes && (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Calendar</div>
                <p>{s.suggested_calendar_plan.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Group({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{title}</div>
      <ul className="list-disc pl-5 space-y-1">{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
    </div>
  );
}
