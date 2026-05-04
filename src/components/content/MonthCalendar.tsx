import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { statusMeta } from "@/lib/content";

export type CalendarItem = {
  id: string;
  title: string;
  scheduled_for: string;
  status: string;
  platform?: string | null;
  client_id: string;
  client_name?: string;
};

type Props = {
  month: Date; // any date in target month
  items: CalendarItem[];
  onDayClick?: (date: string) => void;
  onItemClick?: (item: CalendarItem) => void;
  onItemDrop?: (itemId: string, newDate: string) => void;
};

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfGrid(d: Date) {
  const s = startOfMonth(d);
  const day = (s.getDay() + 6) % 7; // monday-first
  s.setDate(s.getDate() - day);
  return s;
}
function fmtDay(d: Date) { return d.toISOString().slice(0, 10); }
function isSameMonth(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth(); }

export function MonthCalendar({ month, items, onDayClick, onItemClick, onItemDrop }: Props) {
  const days = useMemo(() => {
    const start = startOfGrid(month);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month]);

  const byDay = useMemo(() => {
    const m = new Map<string, CalendarItem[]>();
    for (const it of items) {
      const key = it.scheduled_for.slice(0, 10);
      const arr = m.get(key) || [];
      arr.push(it); m.set(key, arr);
    }
    return m;
  }, [items]);

  const today = fmtDay(new Date());

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="grid grid-cols-7 text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
          <div key={d} className="px-2 py-2 text-center font-semibold">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6">
        {days.map((d) => {
          const key = fmtDay(d);
          const inMonth = isSameMonth(d, month);
          const list = byDay.get(key) || [];
          return (
            <div
              key={key}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("bg-accent/10"); }}
              onDragLeave={(e) => e.currentTarget.classList.remove("bg-accent/10")}
              onDrop={(e) => {
                e.currentTarget.classList.remove("bg-accent/10");
                const id = e.dataTransfer.getData("text/plain");
                if (id && onItemDrop) onItemDrop(id, key);
              }}
              className={cn(
                "min-h-[110px] border-r border-b border-border p-1.5 text-xs flex flex-col gap-1 transition-colors cursor-pointer",
                !inMonth && "bg-muted/30 text-muted-foreground",
                key === today && "bg-accent/5"
              )}
              onClick={() => onDayClick?.(key)}
            >
              <div className={cn("text-[11px] font-mono", key === today && "text-accent font-bold")}>
                {d.getDate()}
              </div>
              <div className="flex flex-col gap-1 overflow-hidden">
                {list.slice(0, 4).map((it) => {
                  const meta = statusMeta(it.status);
                  return (
                    <button
                      key={it.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", it.id)}
                      onClick={(e) => { e.stopPropagation(); onItemClick?.(it); }}
                      className={cn("text-left truncate px-1.5 py-1 rounded text-[11px] leading-tight", meta.color)}
                      title={`${it.title} · ${meta.label}`}
                    >
                      <div className="truncate font-medium">{it.title}</div>
                      {it.client_name && <div className="truncate opacity-70 text-[10px]">{it.client_name}</div>}
                    </button>
                  );
                })}
                {list.length > 4 && <div className="text-[10px] text-muted-foreground px-1">+{list.length - 4} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
