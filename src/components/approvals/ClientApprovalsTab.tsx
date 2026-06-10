import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, X, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { respondToApproval, APPROVAL_STATUS_META, statusPillKind } from "@/lib/approvals";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/ui/status-pill";
import { ApprovalVideoPlayer } from "./ApprovalVideoPlayer";

export function ClientApprovalsTab({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, any[]>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("content_approvals")
      .select("id,status,feedback,comment,due_date,requested_at,responded_at,content_posts(id,title,hook,caption,script,thumbnail_url,video_url,assets,platform,content_type,scheduled_for,post_url)")
      .eq("client_id", clientId)
      .in("status", ["pending_approval", "approved", "changes_requested", "rejected"])
      .order("requested_at", { ascending: false });
    setItems(data || []);
    // Load history per post
    const postIds = Array.from(new Set((data || []).map((d: any) => d.content_posts?.id).filter(Boolean)));
    if (postIds.length) {
      const { data: hist } = await supabase
        .from("content_approvals")
        .select("id,status,feedback,comment,responded_at,requested_at,content_post_id")
        .in("content_post_id", postIds as string[])
        .order("requested_at", { ascending: false });
      const grouped: Record<string, any[]> = {};
      (hist || []).forEach((h: any) => {
        grouped[h.content_post_id] ||= [];
        grouped[h.content_post_id].push(h);
      });
      setHistory(grouped);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [clientId]);

  const decide = async (
    approval: any,
    status: "approved" | "changes_requested" | "rejected",
    quickComment?: string,
  ) => {
    const c = quickComment ?? comments[approval.id] ?? "";
    if (status !== "approved" && !c.trim()) {
      toast.error("Please tell us what to change");
      return;
    }
    setBusyId(approval.id);
    try {
      await respondToApproval(approval.id, status, c.trim() || null);
      toast.success(status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Changes requested");
      setComments({ ...comments, [approval.id]: "" });
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const pending = items.filter((i) => i.status === "pending_approval");
  const others = items.filter((i) => i.status !== "pending_approval");

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4 flex items-center gap-3">
          <div className="text-3xl font-bold text-accent">{pending.length}</div>
          <div className="text-sm text-muted-foreground">item{pending.length === 1 ? "" : "s"} waiting for your approval</div>
        </CardContent>
      </Card>

      {items.length === 0 && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nothing waiting for your approval right now.</CardContent></Card>
      )}

      {[...pending, ...others].map((approval) => {
        const p = approval.content_posts;
        if (!p) return null;
        const m = APPROVAL_STATUS_META[approval.status as keyof typeof APPROVAL_STATUS_META];
        const hist = (history[p.id] || []).filter((h) => h.id !== approval.id);
        const isPending = approval.status === "pending_approval";
        return (
          <Card key={approval.id} className="overflow-hidden">
            {p.thumbnail_url && <img src={p.thumbnail_url} alt={p.title} className="w-full max-h-72 object-cover bg-muted" />}
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-lg">{p.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {p.platform || "—"} · {p.content_type || "—"}
                    {p.scheduled_for ? ` · planned ${new Date(p.scheduled_for).toLocaleString()}` : ""}
                    {approval.due_date ? ` · due ${new Date(approval.due_date).toLocaleDateString()}` : ""}
                  </div>
                </div>
                <span className={cn("px-2 py-0.5 rounded text-[11px] font-medium", m?.color)}>{m?.label}</span>
              </div>

              {p.hook && <Block label="Hook" value={p.hook} />}
              {p.caption && <Block label="Caption" value={p.caption} />}
              {p.script && <details><summary className="text-xs uppercase tracking-wide text-muted-foreground cursor-pointer">Script</summary><div className="text-sm whitespace-pre-wrap mt-1">{p.script}</div></details>}

              {!isPending && (approval.feedback || approval.comment) && (
                <div className="text-xs p-2 rounded bg-muted">
                  Your feedback: "{approval.feedback || approval.comment}"
                </div>
              )}

              {hist.length > 0 && (
                <details>
                  <summary className="text-xs text-muted-foreground cursor-pointer">Previous decisions ({hist.length})</summary>
                  <div className="mt-2 space-y-1.5">
                    {hist.map((h) => {
                      const hm = APPROVAL_STATUS_META[h.status as keyof typeof APPROVAL_STATUS_META];
                      return (
                        <div key={h.id} className="text-xs p-2 rounded bg-muted/40">
                          <span className={cn("px-1.5 py-0.5 rounded text-[10px] mr-2", hm?.color)}>{hm?.label}</span>
                          {new Date(h.requested_at).toLocaleString()}
                          {(h.feedback || h.comment) && <div className="mt-0.5">"{h.feedback || h.comment}"</div>}
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}

              {isPending && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Textarea
                    rows={2}
                    placeholder="Tell the agency what to adjust… (required for changes)"
                    value={comments[approval.id] || ""}
                    onChange={(e) => setComments({ ...comments, [approval.id]: e.target.value })}
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => decide(approval, "approved")}
                      disabled={busyId === approval.id}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      {busyId === approval.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1.5" /> Approve</>}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => decide(approval, "approved", "Looks good 👍")}
                      disabled={busyId === approval.id}
                    >
                      <ThumbsUp className="h-4 w-4 mr-1.5" /> Looks good
                    </Button>
                    <Button variant="outline" onClick={() => decide(approval, "changes_requested")} disabled={busyId === approval.id}>
                      Request changes
                    </Button>
                    <Button variant="ghost" onClick={() => decide(approval, "rejected")} disabled={busyId === approval.id} className="text-red-600 hover:text-red-700">
                      <X className="h-4 w-4 mr-1.5" /> Reject
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Block({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="text-sm whitespace-pre-wrap">{value}</div></div>;
}
