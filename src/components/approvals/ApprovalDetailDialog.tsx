import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { aiSuggestClarifications, APPROVAL_STATUS_META, resendForApproval } from "@/lib/approvals";
import { Loader2, Sparkles, RotateCw, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  approvalId: string | null;
  onChanged?: () => void;
}

export function ApprovalDetailDialog({ open, onOpenChange, approvalId, onChanged }: Props) {
  const [row, setRow] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [interpretation, setInterpretation] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    if (!open || !approvalId) return;
    setQuestions([]); setInterpretation("");
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("content_approvals")
        .select("*, content_posts(id,title,hook,caption,script,thumbnail_url,video_url,assets,platform,content_type,scheduled_for,client_id,agency_id,status), clients(name)")
        .eq("id", approvalId)
        .single();
      setRow(data);
      if (data?.content_post_id) {
        const { data: hist } = await supabase
          .from("content_approvals")
          .select("id,status,feedback,comment,responded_at,requested_at")
          .eq("content_post_id", data.content_post_id)
          .order("requested_at", { ascending: false });
        setHistory(hist || []);
      }
      setLoading(false);
    })();
  }, [open, approvalId]);

  const aiSuggest = async () => {
    if (!approvalId) return;
    setAiBusy(true);
    try {
      const r = await aiSuggestClarifications(approvalId);
      setQuestions(r.questions || []);
      setInterpretation(r.interpretation || "");
    } catch (e: any) {
      toast.error(e.message || "AI failed");
    } finally {
      setAiBusy(false);
    }
  };

  const resend = async () => {
    if (!row?.content_posts) return;
    try {
      await resendForApproval({
        id: row.content_posts.id,
        agency_id: row.content_posts.agency_id,
        client_id: row.content_posts.client_id,
        title: row.content_posts.title,
      });
      toast.success("Resent for approval");
      onOpenChange(false);
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    }
  };

  const post = row?.content_posts;
  const meta = row ? APPROVAL_STATUS_META[row.status as keyof typeof APPROVAL_STATUS_META] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {post?.title || "Approval"}
            {meta && <span className={cn("px-2 py-0.5 rounded text-[11px] font-medium", meta.color)}>{meta.label}</span>}
          </DialogTitle>
        </DialogHeader>

        {loading || !row ? (
          <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              Client: <strong>{row.clients?.name}</strong> · Platform: {post?.platform || "—"} · Type: {post?.content_type || "—"}
            </div>
            {post?.thumbnail_url && (
              <img src={post.thumbnail_url} alt={post.title} className="rounded border border-border max-h-60" />
            )}
            {post?.hook && <Field label="Hook" value={post.hook} />}
            {post?.caption && <Field label="Caption" value={post.caption} />}
            {post?.script && <Field label="Script" value={post.script} />}

            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Latest feedback</div>
              <div className="text-sm p-3 rounded bg-muted whitespace-pre-wrap">
                {row.feedback || row.comment || <em className="text-muted-foreground">No feedback yet.</em>}
              </div>
            </div>

            <div className="border border-dashed border-border rounded p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-accent" /> AI clarifying questions</div>
                <Button size="sm" variant="outline" onClick={aiSuggest} disabled={aiBusy}>
                  {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Suggest"}
                </Button>
              </div>
              {interpretation && <p className="text-xs text-muted-foreground italic">{interpretation}</p>}
              {questions.length > 0 && (
                <ul className="space-y-1.5">
                  {questions.map((q, i) => (
                    <li key={i} className="flex items-start justify-between gap-2 text-sm">
                      <span>• {q}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(q); toast.success("Copied"); }}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {history.length > 1 && (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">History</div>
                <div className="space-y-2">
                  {history.map((h) => {
                    const m = APPROVAL_STATUS_META[h.status as keyof typeof APPROVAL_STATUS_META];
                    return (
                      <div key={h.id} className="text-xs flex items-start gap-2 p-2 rounded bg-muted/40">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px]", m?.color)}>{m?.label}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-muted-foreground">{new Date(h.requested_at).toLocaleString()}</div>
                          {(h.feedback || h.comment) && <div className="mt-0.5 truncate">"{h.feedback || h.comment}"</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {row?.status === "changes_requested" && (
            <Button onClick={resend} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <RotateCw className="h-4 w-4 mr-1.5" /> Resend for approval
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm whitespace-pre-wrap">{value}</div>
    </div>
  );
}
