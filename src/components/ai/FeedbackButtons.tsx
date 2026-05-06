import { useState } from "react";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function FeedbackButtons({ runId }: { runId: string | null }) {
  const [sent, setSent] = useState<-1 | 0 | 1 | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  if (!runId) return null;

  async function submit(rating: -1 | 0 | 1, withComment = false) {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.functions.invoke("ai-feedback-submit", {
      body: { run_id: runId, rating, comment: withComment ? comment : null },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSent(rating);
    setComment("");
    toast.success("Thanks for the feedback");
  }

  return (
    <div className="flex items-center gap-1 mt-1.5">
      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={sent !== null} onClick={() => submit(1)}>
        <ThumbsUp className={`h-3.5 w-3.5 ${sent === 1 ? "text-accent" : ""}`} />
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={sent !== null}>
            <ThumbsDown className={`h-3.5 w-3.5 ${sent === -1 ? "text-destructive" : ""}`} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72">
          <div className="text-xs font-medium mb-2">What was wrong?</div>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Optional feedback…" />
          <Button size="sm" className="mt-2 w-full" disabled={busy} onClick={() => submit(-1, true)}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Submit"}
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
