import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getStrategy, monthLabel, type MonthlyStrategy } from "@/lib/strategies";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function StrategyPrint() {
  const { id } = useParams<{ id: string }>();
  const [s, setS] = useState<MonthlyStrategy | null>(null);
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const data = await getStrategy(id);
      setS(data);
      if (data) {
        const { data: c } = await supabase.from("clients").select("name").eq("id", data.client_id).maybeSingle();
        setClient(c);
      }
      setTimeout(() => window.print(), 600);
    })();
  }, [id]);

  if (!s) return <div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>;

  return (
    <div className="max-w-3xl mx-auto p-8 print:p-0 text-foreground bg-background">
      <header className="mb-6 border-b pb-4">
        <div className="text-xs uppercase tracking-widest text-accent">Strategie lunară</div>
        <h1 className="text-3xl font-bold">{s.strategy_title}</h1>
        <div className="text-sm text-muted-foreground">{client?.name || ""} · {monthLabel(s.month, s.year)}</div>
      </header>
      <Block title="Executive summary"><p className="whitespace-pre-line">{s.executive_summary}</p></Block>
      <Lst title="Business focus" items={s.business_focus} />
      <Lst title="Key insights" items={s.key_insights} />
      <Lst title="Ce a funcționat" items={s.what_worked} />
      <Lst title="Ce nu a funcționat" items={s.what_did_not_work} />
      <Lst title="Content to repeat" items={s.content_to_repeat} />
      <Lst title="Content to stop" items={s.content_to_stop} />
      <Lst title="New tests" items={s.new_tests} />
      <Lst title="Recommended hooks" items={s.recommended_hooks} />
      <Lst title="Formate de conținut" items={s.recommended_content_formats} />
      <Block title="Recommended campaigns">
        {(s.recommended_campaigns || []).map((c, i) => (
          <div key={i} className="mb-3"><div className="font-semibold">{c.name}</div><div className="text-sm text-muted-foreground">{c.goal}</div><div className="text-sm">{c.description}</div></div>
        ))}
      </Block>
      <Block title="Calendar plan">
        <ul className="text-sm">
          <li>Posts/week: {s.suggested_calendar_plan?.posts_per_week}</li>
          <li>Reels: {s.suggested_calendar_plan?.reels}</li>
          <li>Stories: {s.suggested_calendar_plan?.stories}</li>
          <li>Carousels: {s.suggested_calendar_plan?.carousels}</li>
          <li>Campaigns: {s.suggested_calendar_plan?.campaigns}</li>
        </ul>
        {s.suggested_calendar_plan?.notes && <p className="text-sm mt-2">{s.suggested_calendar_plan.notes}</p>}
      </Block>
      <Block title="Action items">
        {(s.action_items || []).map((a, i) => (
          <div key={i} className="mb-2"><div className="font-semibold">{a.title} <span className="text-xs uppercase">[{a.priority}]</span></div><div className="text-sm">{a.description}</div></div>
        ))}
      </Block>
      <Lst title="Risks" items={s.risks} />
      {s.missing_data?.length > 0 && <Lst title="Missing data" items={s.missing_data} />}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mb-5"><h2 className="text-lg font-bold mb-2">{title}</h2>{children}</section>;
}
function Lst({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return <Block title={title}><ul className="list-disc pl-5 text-sm space-y-1">{items.map((it, i) => <li key={i}>{it}</li>)}</ul></Block>;
}
