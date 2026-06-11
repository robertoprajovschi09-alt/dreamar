import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ApprovalVideoPlayer } from "@/components/approvals/ApprovalVideoPlayer";
import { supabase } from "@/integrations/supabase/client";
import { postStatusMeta, PENDING_POST_STATUSES } from "@/lib/approvals";
import { Loader2, ChevronDown, ChevronRight as ChevronRightIcon, Calendar, ExternalLink } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  postId: string | null;
  onGoToApprovals?: () => void;
}

export function PostDetailDialog({ open, onOpenChange, postId, onGoToApprovals }: Props) {
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [thumb, setThumb] = useState<string | null>(null);
  const [scriptOpen, setScriptOpen] = useState(false);

  useEffect(() => {
    if (!open || !postId) { setPost(null); setThumb(null); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("content_posts")
        .select("id,title,status,platform,scheduled_for,hook,caption,script,video_url,thumbnail_url,assets,content_type")
        .eq("id", postId)
        .maybeSingle();
      if (cancelled) return;
      setPost(data);
      if (data?.thumbnail_url) {
        if (/^https?:\/\//i.test(data.thumbnail_url)) setThumb(data.thumbnail_url);
        else {
          const { data: s } = await supabase.storage.from("agency-files").createSignedUrl(data.thumbnail_url, 600);
          if (!cancelled) setThumb(s?.signedUrl || null);
        }
      } else setThumb(null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, postId]);

  const meta = post ? postStatusMeta(post.status) : null;
  const isPending = post && PENDING_POST_STATUSES.includes(post.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {loading || !post ? (
          <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg pr-8">{post.title || "Postare"}</DialogTitle>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {meta && <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${meta.color}`}>{meta.label}</span>}
                {post.platform && <Badge variant="secondary" className="text-[10px] uppercase">{post.platform}</Badge>}
                {post.scheduled_for && (
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(post.scheduled_for).toLocaleString("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {(post.video_url || (Array.isArray(post.assets) && post.assets.length > 0)) ? (
                <ApprovalVideoPlayer post={post} poster={thumb} />
              ) : thumb ? (
                <img src={thumb} alt="" className="w-full rounded-2xl object-cover aspect-video bg-muted" />
              ) : null}

              {post.hook && (
                <section>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Hook</div>
                  <p className="text-sm italic">„{post.hook}"</p>
                </section>
              )}

              {post.caption && (
                <section>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Caption</div>
                  <p className="text-sm whitespace-pre-wrap">{post.caption}</p>
                </section>
              )}

              {post.script && (
                <Collapsible open={scriptOpen} onOpenChange={setScriptOpen}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                      {scriptOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
                      Scenariu
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <pre className="text-xs whitespace-pre-wrap font-sans bg-muted/40 p-3 rounded-lg">{post.script}</pre>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {isPending && onGoToApprovals && (
                <Button
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-full"
                  onClick={() => { onOpenChange(false); onGoToApprovals(); }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" /> Mergi la Aprobări
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
