import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { generateStrategy, nextMonth } from "@/lib/strategies";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function GenerateStrategyDialog({
  open, onOpenChange, defaultClientId, onGenerated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultClientId?: string;
  onGenerated?: (id: string) => void;
}) {
  const { agency } = useUser();
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState<string>(defaultClientId || "");
  const nm = nextMonth();
  const [year, setYear] = useState<number>(nm.year);
  const [month, setMonth] = useState<number>(nm.month);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !agency) return;
    if (defaultClientId) { setClientId(defaultClientId); return; }
    supabase.from("clients").select("id,name").eq("agency_id", agency.id).order("name")
      .then(({ data }) => setClients(data || []));
  }, [open, agency, defaultClientId]);

  const submit = async () => {
    if (!clientId) return toast.error("Pick a client");
    setLoading(true);
    try {
      const res = await generateStrategy(clientId, year, month);
      toast.success("Strategy generated");
      onOpenChange(false);
      onGenerated?.(res.id);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> Generate next month strategy</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!defaultClientId && (
            <div>
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Month</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {new Date(2000, i, 1).toLocaleDateString(undefined, { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Year</Label>
              <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            AI uses last month's report, content, goals, business impact, feedback, health, risks, competitors, swipe file. Missing data is flagged explicitly.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />} Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
