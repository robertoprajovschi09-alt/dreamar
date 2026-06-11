import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { parseCsv, suggestCsvMapping, importAnalyticsCsv, ANALYTICS_COLUMNS, CONTENT_METRIC_COLUMNS, type CsvParsed } from "@/lib/analytics";

type Props = {
  open: boolean; onOpenChange: (v: boolean) => void;
  agencyId: string; clientId: string;
  target: "analytics_entries" | "content_metrics";
  onImported?: () => void;
};

export function CsvImportDialog({ open, onOpenChange, agencyId, clientId, target, onImported }: Props) {
  const [step, setStep] = useState<"upload" | "map" | "preview">("upload");
  const [parsed, setParsed] = useState<CsvParsed | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const cols = target === "analytics_entries" ? ANALYTICS_COLUMNS : CONTENT_METRIC_COLUMNS;

  const reset = () => { setStep("upload"); setParsed(null); setMapping({}); };

  const onFile = async (f: File) => {
    setBusy(true);
    try {
      const p = await parseCsv(f);
      setParsed(p);
      const m = await suggestCsvMapping(p.headers, target);
      setMapping(m);
      setStep("map");
    } catch (e: any) { toast.error(e.message || "Failed to parse CSV"); }
    finally { setBusy(false); }
  };

  const doImport = async () => {
    if (!parsed) return;
    setBusy(true);
    try {
      const count = await importAnalyticsCsv({
        rows: parsed.rows, mapping, target,
        defaults: { agency_id: agencyId, client_id: clientId },
      });
      toast.success(`${count} rânduri importate`);
      onImported?.(); onOpenChange(false); reset();
    } catch (e: any) { toast.error(e.message || "Import failed"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Import CSV — {target === "analytics_entries" ? "Analytics" : "Content metrics"}</DialogTitle></DialogHeader>

        {step === "upload" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Încarcă un fișier CSV cu rând de antet. Detectăm coloanele automat.</p>
            <input type="file" accept=".csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} className="block w-full text-sm" />
            {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Parsing & analyzing…</div>}
          </div>
        )}

        {step === "map" && parsed && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Sparkles className="h-3 w-3" /> AI suggested mapping. Review and adjust.</div>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
              {parsed.headers.map((h) => (
                <div key={h} className="grid grid-cols-2 gap-3 items-center">
                  <Label className="text-sm font-mono truncate">{h}</Label>
                  <Select value={mapping[h] || ""} onValueChange={(v) => setMapping({ ...mapping, [h]: v === "__skip" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="— skip —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip">— skip —</SelectItem>
                      {cols.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">{parsed.rows.length} rows ready to import</div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Anulează</Button>
          {step === "map" && (
            <Button onClick={doImport} disabled={busy} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Import ${parsed?.rows.length || 0} rows`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
