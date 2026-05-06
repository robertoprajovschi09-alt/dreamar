import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { ImpactField, ImpactValueMode, NicheImpactConfig, ImpactEntry } from "@/lib/businessImpactByNiche";

type Props = {
  config: NicheImpactConfig;
  values: Record<string, ImpactEntry>;
  onChange: (key: string, entry: ImpactEntry) => void;
};

const MODES: { key: ImpactValueMode; label: string; short?: string }[] = [
  { key: "exact", label: "Exact" },
  { key: "approx", label: "Aproximativ", short: "Aprox." },
  { key: "unknown", label: "Nu știu" },
  { key: "not_applicable", label: "Nu se aplică", short: "N/A" },
];

export function BusinessImpactSection({ config, values, onChange }: Props) {
  const missingCount = Object.values(values).filter((v) => v?.mode === "unknown").length;

  return (
    <div className="space-y-4 p-4 rounded-md border border-accent/30 bg-accent/5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-accent">{config.title}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{config.intro}</p>
        </div>
        {missingCount > 0 && (
          <Badge variant="outline" className="text-[10px]">
            {missingCount} {missingCount === 1 ? "câmp marcat „nu știu”" : "câmpuri marcate „nu știu”"}
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {config.fields.map((f) => (
          <ImpactRow
            key={f.key}
            field={f}
            entry={values[f.key] || { mode: "exact", value: "" }}
            onChange={(e) => onChange(f.key, e)}
          />
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        „Nu știu” și „Nu se aplică” nu blochează trimiterea. AI-ul va marca datele lipsă.
      </p>
    </div>
  );
}

function ImpactRow({
  field, entry, onChange,
}: { field: ImpactField; entry: ImpactEntry; onChange: (e: ImpactEntry) => void }) {
  const mode = entry.mode;
  const isNumericLike = field.kind === "number" || field.kind === "currency";
  const modes = field.kind === "text" || field.kind === "choice"
    ? MODES.filter((m) => m.key === "exact" || m.key === "unknown" || m.key === "not_applicable")
    : MODES;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label className="text-xs">
          {field.label}
          {field.kind === "currency" && <span className="text-muted-foreground"> (lei)</span>}
        </Label>
        <div className="flex flex-wrap gap-1">
          {modes.map((m) => {
            const active = mode === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => onChange({ mode: m.key, value: m.key === "exact" || m.key === "approx" ? entry.value : "" })}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition ${
                  active ? "bg-accent text-accent-foreground border-accent" : "border-border hover:border-foreground/40"
                }`}
              >
                {m.short || m.label}
              </button>
            );
          })}
        </div>
      </div>

      {(mode === "exact" || mode === "approx") && (
        <>
          {isNumericLike && (
            <Input
              type="number"
              min={0}
              step={field.kind === "currency" ? "0.01" : "1"}
              value={entry.value}
              onChange={(e) => onChange({ mode, value: e.target.value })}
              placeholder={mode === "approx" ? "estimare aproximativă" : "—"}
            />
          )}
          {field.kind === "text" && (
            <Textarea
              rows={2}
              value={entry.value}
              onChange={(e) => onChange({ mode, value: e.target.value })}
              maxLength={500}
              placeholder={field.placeholder || "—"}
            />
          )}
          {field.kind === "choice" && field.options && (
            <div className="flex flex-wrap gap-1.5">
              {field.options.map((o) => {
                const active = entry.value === o.key;
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => onChange({ mode, value: o.key })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      active ? "bg-accent text-accent-foreground border-accent" : "border-border hover:border-foreground/40"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {mode === "unknown" && (
        <p className="text-[11px] text-muted-foreground italic">Marcat ca „nu știu” — agenția va vedea datele lipsă.</p>
      )}
      {mode === "not_applicable" && (
        <p className="text-[11px] text-muted-foreground italic">Marcat ca „nu se aplică”.</p>
      )}
    </div>
  );
}
