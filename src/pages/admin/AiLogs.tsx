import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

type Run = {
  id: string; created_at: string; prompt_key: string | null; model: string | null;
  status: string; tokens_in: number | null; tokens_out: number | null; cost_usd: number | null;
  latency_ms: number | null; safety_flags: any; error_text: string | null;
};

export default function AiLogs() {
  const { agency } = useUser();
  const [runs, setRuns] = useState<Run[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!agency) return;
    (async () => {
      const { data } = await supabase.from("ai_prompt_runs").select("*").eq("agency_id", agency.id).order("created_at", { ascending: false }).limit(200);
      setRuns((data || []) as Run[]);
    })();
  }, [agency]);

  const filtered = runs.filter((r) => !q || r.prompt_key?.includes(q) || r.model?.includes(q) || r.status.includes(q));
  const total = runs.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="AI Logs & Monitoring" subtitle="Every AI request, with cost, latency and safety flags." />
      <div className="grid md:grid-cols-3 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs">Runs (last 200)</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{runs.length}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs">Total cost</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">${total.toFixed(4)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs">Errors</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{runs.filter(r => r.status !== "success").length}</CardContent></Card>
      </div>
      <Input placeholder="Filter by prompt_key, model, status…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead><TableHead>Prompt</TableHead><TableHead>Model</TableHead>
                <TableHead>Status</TableHead><TableHead>Tokens</TableHead><TableHead>Cost</TableHead><TableHead>Latency</TableHead><TableHead>Safety</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{r.prompt_key || "—"}</TableCell>
                  <TableCell className="text-xs">{r.model || "—"}</TableCell>
                  <TableCell><Badge variant={r.status === "success" ? "secondary" : "destructive"}>{r.status}</Badge></TableCell>
                  <TableCell className="text-xs">{r.tokens_in ?? 0}/{r.tokens_out ?? 0}</TableCell>
                  <TableCell className="text-xs">${(Number(r.cost_usd) || 0).toFixed(5)}</TableCell>
                  <TableCell className="text-xs">{r.latency_ms ?? "—"}ms</TableCell>
                  <TableCell className="text-xs">{Array.isArray(r.safety_flags) && r.safety_flags.length > 0 ? <Badge variant="outline">{r.safety_flags.length}</Badge> : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
