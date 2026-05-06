import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Loader2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; name: string; competitor_count: number; observation_count: number };

export default function Competitors() {
  const { agency } = useUser();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agency) return;
    (async () => {
      setLoading(true);
      const [{ data: clients }, { data: comps }, { data: obs }] = await Promise.all([
        supabase.from("clients").select("id,name").eq("agency_id", agency.id).order("name"),
        supabase.from("competitors").select("client_id").eq("agency_id", agency.id),
        supabase.from("competitor_observations").select("client_id").eq("agency_id", agency.id),
      ]);
      const cMap = new Map<string, number>();
      (comps || []).forEach((c: any) => cMap.set(c.client_id, (cMap.get(c.client_id) || 0) + 1));
      const oMap = new Map<string, number>();
      (obs || []).forEach((o: any) => oMap.set(o.client_id, (oMap.get(o.client_id) || 0) + 1));
      setRows((clients || []).map((c: any) => ({
        id: c.id, name: c.name,
        competitor_count: cMap.get(c.id) || 0,
        observation_count: oMap.get(c.id) || 0,
      })));
      setLoading(false);
    })();
  }, [agency?.id]);

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Competitors</h1>
        <p className="text-sm text-muted-foreground mt-1">Track competitor activity across all your clients. Private by default.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-accent" /> By client</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            : rows.length === 0 ? <div className="py-10 text-center text-sm text-muted-foreground">No clients yet.</div>
            : <ul className="divide-y divide-border">
                {rows.map((r) => (
                  <li key={r.id} className="py-3 flex items-center justify-between">
                    <Link to={`/agency/clients/${r.id}?tab=competitors`} className="font-medium hover:underline">{r.name}</Link>
                    <div className="text-xs text-muted-foreground">{r.competitor_count} competitors · {r.observation_count} observations</div>
                  </li>
                ))}
              </ul>}
        </CardContent>
      </Card>
    </div>
  );
}
