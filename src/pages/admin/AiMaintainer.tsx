import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";

type Ev = { id: string; level: string; event: string; payload: any; created_at: string };

export default function AiMaintainer() {
  const { profile, agency } = useUser();
  const [events, setEvents] = useState<Ev[]>([]);
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("ai_audit_events").select("*").in("level", ["warn", "error", "critical"]).order("created_at", { ascending: false }).limit(100);
    setEvents((data || []) as Ev[]);
  }
  useEffect(() => { load(); }, []);

  async function scan() {
    if (!agency) return;
    setBusy(true); setOutput(null);
    const { data, error } = await supabase.functions.invoke("ai-maintainer-scan", { body: { agency_id: agency.id } });
    setBusy(false);
    if (error) return toast.error(error.message);
    setOutput(data?.output || "");
    toast.success("Scan complete — see AI Actions for the suggestion");
  }

  if (!profile?.is_saas_admin) return <div className="p-6 text-sm">Admin only.</div>;

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="AI Website/App Maintainer" subtitle="Triages recent errors and proposes fixes (review-only suggestions)." action={
        <Button size="sm" onClick={scan} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-4 w-4 mr-1" />Run scan</>}</Button>
      } />
      {output && (
        <Card><CardHeader><CardTitle className="text-sm">Latest scan</CardTitle></CardHeader>
          <CardContent><pre className="text-xs whitespace-pre-wrap">{output}</pre></CardContent>
        </Card>
      )}
      <Card><CardHeader><CardTitle className="text-sm">Recent issues</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {events.length === 0 && <div className="text-sm text-muted-foreground">No recent issues.</div>}
          {events.map((e) => (
            <div key={e.id} className="border-b border-border pb-2">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant={e.level === "error" || e.level === "critical" ? "destructive" : "secondary"}>{e.level}</Badge>
                <span className="font-medium">{e.event}</span>
                <span className="text-xs text-muted-foreground ml-auto">{new Date(e.created_at).toLocaleString()}</span>
              </div>
              <pre className="text-[11px] text-muted-foreground mt-1">{JSON.stringify(e.payload).slice(0, 300)}</pre>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
