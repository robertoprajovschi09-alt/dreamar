import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAgency } from "@/contexts/AgencyContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, Loader2 } from "lucide-react";

export default function Dashboard() {
  const { currentAgency } = useAgency();
  const [count, setCount] = useState<number | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentAgency) return;
    (async () => {
      setLoading(true);
      const [{ count: c }, { data }] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("agency_id", currentAgency.id),
        supabase.from("clients").select("id,name,niche,city,status,created_at").eq("agency_id", currentAgency.id).order("created_at", { ascending: false }).limit(5),
      ]);
      setCount(c ?? 0);
      setRecent(data || []);
      setLoading(false);
    })();
  }, [currentAgency]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome to {currentAgency?.name}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : count}
            </div>
            <Link to="/app/clients">
              <Button size="sm" variant="outline" className="mt-3">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add client
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent clients</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : recent.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No clients yet. <Link to="/app/clients" className="text-accent underline">Add your first one</Link>.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((c) => (
                <li key={c.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.niche} {c.city ? `· ${c.city}` : ""}</div>
                  </div>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{c.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
