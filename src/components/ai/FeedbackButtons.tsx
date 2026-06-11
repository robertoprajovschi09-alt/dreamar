import { useState } from "react";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const NEGATIVE_TYPES = ["inaccurate", "too_generic", "missing_context", "bad_tone", "wrong_strategy", "hallucinated_data", "not_useful"];

export function FeedbackButtons({ runId, feature }: { runId: string | null; feature?: string }) {
  const [sent, setSent] = useState<-1 | 0 | 1 | null>(null);
  const [comment, setComment] = useState("");
  const [feedbackType, setFeedbackType] = useState<string>("not_useful");
  const [correction, setCorrection] = useState("");
  const [busy, setBusy] = useState(false);

  if (!runId) return null;

  async function submit(rating: -1 | 0 | 1, opts: { detailed?: boolean } = {}) {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.functions.invoke("ai-feedback-submit", {
      body: {
        run_id: runId, rating,
        feedback_type: rating === 1 ? "useful" : opts.detailed ? feedbackType : null,
        was_useful: rating === 1 ? true : rating === -1 ? false : null,
        comment: opts.detailed ? comment : null,
        correction: opts.detailed ? correction || null : null,
        ai_feature: feature ?? null,
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSent(rating);
    setComment(""); setCorrection("");
    toast.success("Mulțumim pentru feedback");
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
        <PopoverContent className="w-80 space-y-2">
          <div className="text-xs font-medium">Ce a fost greșit?</div>
          <Select value={feedbackType} onValueChange={setFeedbackType}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {NEGATIVE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Optional comment…" />
          <Textarea value={correction} onChange={(e) => setCorrection(e.target.value)} rows={2} placeholder="Optional: provide the correct version…" />
          <Button size="sm" className="w-full" disabled={busy} onClick={() => submit(-1, { detailed: true })}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Submit"}
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
