import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Download, Pencil, Eye, EyeOff } from "lucide-react";
import { formatPeriod, formatMetricKey, statusKind, statusLabel, type Report } from "@/lib/reports";
import { useSignedUrl } from "@/lib/storage";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  report: Report | null;
  clientName?: string;
  agencyLogoUrl?: string | null;
  clientLogoUrl?: string | null;
  printHref: (id: string) => string;
  onEdit?: (r: Report) => void;
};

export function ReportView({ open, onOpenChange, report, clientName, agencyLogoUrl, clientLogoUrl, printHref, onEdit }: Props) {
  const agencyLogo = useSignedUrl(agencyLogoUrl ?? null);
  const clientLogo = useSignedUrl(clientLogoUrl ?? null);
  if (!report) return null;
  const r = report;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="sr-only">{r.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-2 space-y-6">
          {/* Header */}
          <div className="rounded-2xl border border-border bg-card/60 p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {agencyLogoUrl && (
                  <img src={agencyLogo ?? undefined} alt="" className="h-9 w-9 rounded-md object-cover bg-muted" />
                )}
                {clientLogoUrl && (
                  <>
                    <span className="text-muted-foreground">×</span>
                    <img src={clientLogo ?? undefined} alt="" className="h-9 w-9 rounded-md object-cover bg-muted" />
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <StatusPill kind={statusKind(r.status)}>{statusLabel(r.status)}</StatusPill>
                <StatusPill kind={r.client_visible ? "success" : "muted"}>
                  {r.client_visible ? <><Eye className="h-3 w-3 mr-1 inline" />Vizibil</> : <><EyeOff className="h-3 w-3 mr-1 inline" />Intern</>}
                </StatusPill>
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-bold tracking-tight">{r.title}</h2>
              <div className="text-sm text-muted-foreground mt-1">
                {clientName ? `${clientName} · ` : ""}{formatPeriod(r.period_start, r.period_end)}
              </div>
            </div>
          </div>

          {/* Summary */}
          {r.summary && (
            <section className="rounded-2xl border border-border p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Rezumat</h3>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{r.summary}</p>
            </section>
          )}

          {/* Metrics */}
          {r.metrics && Object.keys(r.metrics).length > 0 && (
            <section className="rounded-2xl border border-border p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Snapshot metrici</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(r.metrics).map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-accent/5 border border-accent/10 p-3">
                    <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{formatMetricKey(k)}</div>
                    <div className="text-lg font-bold mt-1">{String(v)}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Highlights */}
          {(r.highlights || []).length > 0 && (
            <section className="rounded-2xl border border-border p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Momente cheie</h3>
              <ul className="space-y-2">
                {r.highlights.map((h, i) => (
                  <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Recommendations */}
          {(r.recommendations || []).length > 0 && (
            <section className="rounded-2xl border border-border p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Recomandări</h3>
              <ul className="space-y-2">
                {r.recommendations.map((h, i) => (
                  <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" asChild>
              <a href={printHref(r.id)} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-1.5" /> Descarcă PDF
              </a>
            </Button>
            {onEdit && (
              <Button onClick={() => onEdit(r)}>
                <Pencil className="h-4 w-4 mr-1.5" /> Editează
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
