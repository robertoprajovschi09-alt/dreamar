import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, PlayCircle } from "lucide-react";
import { toast } from "sonner";

type Action = {
  id: string; action_type: string; status: string; reasoning: string | null;
  payload: any; result: any; created_at: string; client_id: string | null;
};

export default function AiActions() {
  const { agency } = useUser();
  const [items, setItems] = useState<Action[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  async function load() {
    if (!agency) return;
    let q = supabase.from("ai_actions").select("*").eq("agency_id", agency.id).order("created_at", { ascending: false }).limit(100);
    if (filter === "pending") q = q.eq("status", "pending");
    const { data } = await q;
    setItems((data || []) as Action[]);
  }
  useEffect(() => { load(); }, [agency, filter]);

  async function decide(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    const { error } = await supabase.from("ai_actions").update({ status, decided_at: new Date().toISOString() }).eq("id", id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    if (status === "approved") {
      setBusyId(id);
      const { error: e2 } = await supabase.functions.invoke("ai-action-execute", { body: { action_id: id } });
      setBusyId(null);
      if (e2) return toast.error(e2.message);
      toast.success("Action executed");
    } else toast.success("Rejected");
    load();
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="AI Actions" subtitle="Approve or reject actions proposed by AI before they touch your data." />
      <div className="flex gap-2">
        <Button size="sm" variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>Pending</Button>
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
      </div>
      {items.length === 0 && <div className="text-sm text-muted-foreground">No actions.</div>}
      <div className="space-y-3">
        {items.map((a) => (
          <Card key={a.id}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {a.action_type}
                <Badge variant={a.status === "pending" ? "secondary" : a.status === "executed" ? "default" : "outline"}>{a.status}</Badge>
              </CardTitle>
              <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
            </CardHeader>
            <CardContent className="space-y-2">
              {a.reasoning && <p className="text-sm">{a.reasoning}</p>}
              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">{JSON.stringify(a.payload, null, 2)}</pre>
              {a.result && <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">Result: {JSON.stringify(a.result, null, 2)}</pre>}
              {a.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" disabled={busyId === a.id} onClick={() => decide(a.id, "approved")}>
                    {busyId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve & execute</>}
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyId === a.id} onClick={() => decide(a.id, "rejected")}>
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
