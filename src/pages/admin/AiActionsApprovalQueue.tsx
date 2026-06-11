import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, PlayCircle, Pencil } from "lucide-react";
import { decideAiAction } from "@/lib/aiActionRequests";

type Req = {
  id: string;
  agency_id: string | null;
  client_id: string | null;
  action_type: string;
  title: string;
  description: string | null;
  reasoning: string | null;
  payload: any;
  edited_payload: any;
  risk_level: "low" | "medium" | "high" | "critical";
  status: string;
  rejection_reason: string | null;
  execution_error: string | null;
  created_at: string;
};

const RISK_STYLE: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  critical: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function AiActionsApprovalQueue() {
  const { agency, profile } = useUser();
  const [items, setItems] = useState<Req[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"pending" | "approved" | "history">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editFor, setEditFor] = useState<Req | null>(null);
  const [editText, setEditText] = useState("");
  const [rejectFor, setRejectFor] = useState<Req | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function load() {
    setLoading(true);
    let q = supabase.from("ai_action_requests").select("*").order("created_at", { ascending: false }).limit(200);
    if (!profile?.is_saas_admin && agency?.id) q = q.eq("agency_id", agency.id);
    if (tab === "pending") q = q.eq("status", "pending");
    else if (tab === "approved") q = q.eq("status", "approved");
    else q = q.in("status", ["executed", "rejected", "failed", "cancelled", "auto_executed"]);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setItems((data || []) as Req[]);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [agency?.id, tab, profile?.is_saas_admin]);

  async function handle(decision: "approve" | "reject" | "execute", req: Req, opts: any = {}) {
    setBusyId(req.id);
    try {
      await decideAiAction(req.id, decision, opts);
      toast.success(`Acțiune ${decision === 'approve' ? 'aprobată' : 'respinsă'}`);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusyId(null);
    }
  }

  async function approveAndExecute(req: Req) {
    setBusyId(req.id);
    try {
      await decideAiAction(req.id, "approve");
      await decideAiAction(req.id, "execute");
      toast.success("Aprobat și executat");
      load();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusyId(null); }
  }

  function openEdit(req: Req) {
    setEditFor(req);
    setEditText(JSON.stringify(req.edited_payload ?? req.payload ?? {}, null, 2));
  }
  function saveEditAndApprove() {
    if (!editFor) return;
    let parsed;
    try { parsed = JSON.parse(editText); } catch { return toast.error("JSON invalid"); }
    handle("approve", editFor, { edited_payload: parsed });
    setEditFor(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="AI Actions" subtitle="Review, approve, and execute actions proposed by AI." />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">În așteptare</TabsTrigger>
          <TabsTrigger value="approved">Aprobate</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {loading && <Loader2 className="h-5 w-5 animate-spin" />}
          {!loading && items.length === 0 && (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Nicio acțiune în această vedere.</CardContent></Card>
          )}
          {items.map((req) => (
            <Card key={req.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-base">{req.title}</CardTitle>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline" className={RISK_STYLE[req.risk_level]}>{req.risk_level} risk</Badge>
                    <Badge variant="outline">{req.action_type}</Badge>
                    <Badge variant="secondary">{req.status}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {req.status === "pending" && (
                    <>
                      <Button size="sm" variant="outline" disabled={busyId === req.id} onClick={() => openEdit(req)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />Modifică
                      </Button>
                      <Button size="sm" variant="outline" disabled={busyId === req.id} onClick={() => { setRejectFor(req); setRejectReason(""); }}>
                        <XCircle className="h-3.5 w-3.5 mr-1" />Reject
                      </Button>
                      <Button size="sm" disabled={busyId === req.id} onClick={() => handle("approve", req)}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="default" disabled={busyId === req.id} onClick={() => approveAndExecute(req)}>
                        <PlayCircle className="h-3.5 w-3.5 mr-1" />Approve & Execute
                      </Button>
                    </>
                  )}
                  {req.status === "approved" && (
                    <Button size="sm" disabled={busyId === req.id} onClick={() => handle("execute", req)}>
                      <PlayCircle className="h-3.5 w-3.5 mr-1" />Execute
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {req.description && <p>{req.description}</p>}
                {req.reasoning && (
                  <div className="rounded-md border border-border bg-muted/40 p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">AI reasoning</div>
                    <div className="whitespace-pre-wrap">{req.reasoning}</div>
                  </div>
                )}
                <details>
                  <summary className="text-xs text-muted-foreground cursor-pointer">Previzualizare payload</summary>
                  <pre className="mt-2 text-xs bg-muted/30 p-2 rounded overflow-auto max-h-64">
{JSON.stringify(req.edited_payload ?? req.payload ?? {}, null, 2)}
                  </pre>
                </details>
                {req.rejection_reason && <div className="text-xs text-destructive">Rejected: {req.rejection_reason}</div>}
                {req.execution_error && <div className="text-xs text-destructive">Execution error: {req.execution_error}</div>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!editFor} onOpenChange={(o) => !o && setEditFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifică payload-ul înainte de aprobare</DialogTitle></DialogHeader>
          <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="font-mono text-xs min-h-[280px]" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditFor(null)}>Anulează</Button>
            <Button onClick={saveEditAndApprove}>Salvează și aprobă</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Respinge acțiunea</DialogTitle></DialogHeader>
          <Textarea placeholder="Motiv (opțional)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectFor(null)}>Anulează</Button>
            <Button variant="destructive" onClick={() => { if (rejectFor) handle("reject", rejectFor, { rejection_reason: rejectReason }); setRejectFor(null); }}>Respinge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
