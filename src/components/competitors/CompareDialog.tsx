import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles } from "lucide-react";
import { aiCompare, type Competitor } from "@/lib/competitors";
import { toast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  clientId: string;
  competitors: Competitor[];
};

export function CompareDialog({ open, onOpenChange, clientId, competitors }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any | null>(null);

  useEffect(() => { if (open) { setSelected([]); setData(null); } }, [open]);

  const toggle = (id: string) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const run = async () => {
    if (selected.length < 2) { toast({ title: "Pick at least 2 competitors", variant: "destructive" }); return; }
    setLoading(true);
    try { setData(await aiCompare(clientId, selected)); }
    catch (e: any) { toast({ title: "AI failed", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Compare competitors</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {competitors.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm p-2 border rounded cursor-pointer">
                <Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggle(c.id)} />
                {c.name}
              </label>
            ))}
          </div>
          <Button onClick={run} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}Compare
          </Button>
          {data && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(data.rows || []).map((r: any, i: number) => (
                  <div key={i} className="border rounded p-3">
                    <div className="font-semibold mb-2">{r.competitor_name}</div>
                    <Mini title="Strengths" items={r.strengths} />
                    <Mini title="Weaknesses" items={r.weaknesses} />
                    <Mini title="Content mix" items={r.content_mix} />
                  </div>
                ))}
              </div>
              <Mini title="What you should adopt" items={data.adopt} />
              <Mini title="What to avoid" items={data.avoid} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Mini({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-2">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <ul className="list-disc pl-5 text-xs space-y-0.5">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}
