import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ItemChip, type CalendarItem } from "./MonthCalendar";

type Props = {
  cursor: Date;
  items: CalendarItem[];
  onDayClick?: (date: string, anchor: { x: number; y: number }) => void;
  onItemClick?: (item: CalendarItem) => void;
  onItemDrop?: (itemId: string, newDate: string) => void;
};

function fmtDay(d: Date) { return d.toISOString().slice(0, 10); }

function startOfWeek(d: Date) {
  const s = new Date(d);
  const day = (s.getDay() + 6) % 7;
  s.setDate(s.getDate() - day);
  s.setHours(0, 0, 0, 0);
  return s;
}

const DAY_LABEL = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export function WeekCalendar({ cursor, items, onDayClick, onItemClick, onItemDrop }: Props) {
  const days = useMemo(() => {
    const s = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(s); d.setDate(s.getDate() + i); return d;
    });
  }, [cursor]);

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
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 min-w-[700px]">
          {days.map((d, i) => {
            const key = fmtDay(d);
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
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  onDayClick?.(key, { x: r.left + 8, y: r.top + 8 });
                }}
                className={cn(
                  "border-r border-border last:border-r-0 p-2 min-h-[400px] flex flex-col gap-1 cursor-pointer",
                  key === today && "bg-accent/5"
                )}
              >
                <div className="flex items-baseline justify-between border-b border-border pb-1.5 mb-1">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                    {DAY_LABEL[i]}
                  </div>
                  <div className={cn("font-mono text-sm", key === today && "text-accent font-bold")}>
                    {d.getDate()}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {list.map((it) => (
                    <ItemChip key={it.id} item={it} onClick={onItemClick} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
