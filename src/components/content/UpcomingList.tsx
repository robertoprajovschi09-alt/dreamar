import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { statusMeta } from "@/lib/content";
import { platformIcon } from "@/lib/platformIcons";
import type { CalendarItem } from "./MonthCalendar";

type SortKey = "date" | "client" | "status";
type Props = {
  items: CalendarItem[];
  onItemClick?: (it: CalendarItem) => void;
};

export function UpcomingList({ items, onItemClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [asc, setAsc] = useState(true);

  const sorted = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = a.scheduled_for.localeCompare(b.scheduled_for);
      else if (sortKey === "client") cmp = (a.client_name || "").localeCompare(b.client_name || "");
      else cmp = a.status.localeCompare(b.status);
      return asc ? cmp : -cmp;
    });
    return arr;
  }, [items, sortKey, asc]);

  const toggle = (k: SortKey) => {
    if (sortKey === k) setAsc(!asc);
    else { setSortKey(k); setAsc(true); }
  };

  const Header = ({ k, label }: { k: SortKey; label: string }) => (
    <TableHead>
      <button onClick={() => toggle(k)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        {sortKey === k && (asc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </TableHead>
  );

  if (sorted.length === 0) {
    return (
      <div className="border border-border rounded-lg bg-card py-16 text-center text-sm text-muted-foreground">
        Niciun conținut programat în perioada următoare.
      </div>
    );
  }

  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="md:hidden space-y-2">
        {sorted.map((it) => {
          const meta = statusMeta(it.status);
          const Icon = platformIcon(it.platform);
          const d = new Date(it.scheduled_for);
          return (
            <button
              key={it.id}
              onClick={() => onItemClick?.(it)}
              className="w-full text-left border border-border rounded-2xl bg-card p-3 active:bg-surface-2 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-mono text-muted-foreground">
                  {d.toLocaleDateString("ro-RO", { day: "2-digit", month: "short" })}
                  {" · "}
                  {d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <Badge variant="secondary" className={cn("text-[10px] font-medium border-0 shrink-0", meta.color)}>{meta.label}</Badge>
              </div>
              <div className="text-sm font-medium leading-snug line-clamp-2">{it.title}</div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                <span className="capitalize">{it.platform || "—"}</span>
                {it.client_name && <span className="truncate">· {it.client_name}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block border border-border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <Header k="date" label="Data" />
              <Header k="client" label="Client" />
              <TableHead>Titlu</TableHead>
              <TableHead>Platformă</TableHead>
              <Header k="status" label="Status" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((it) => {
              const meta = statusMeta(it.status);
              const Icon = platformIcon(it.platform);
              const d = new Date(it.scheduled_for);
              return (
                <TableRow key={it.id} className="cursor-pointer" onClick={() => onItemClick?.(it)}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {d.toLocaleDateString("ro-RO", { day: "2-digit", month: "short" })}
                    <span className="text-muted-foreground"> · {d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}</span>
                  </TableCell>
                  <TableCell className="text-sm">{it.client_name || "—"}</TableCell>
                  <TableCell className="text-sm font-medium max-w-[360px] truncate">{it.title}</TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-1.5 text-xs capitalize">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {it.platform || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-[10px] font-medium border-0", meta.color)}>{meta.label}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
