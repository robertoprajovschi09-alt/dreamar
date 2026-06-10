import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { statusMeta } from "@/lib/content";
import { platformIcon } from "@/lib/platformIcons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  month: Date;
  items: CalendarItem[];
  onDayClick?: (date: string, anchor: { x: number; y: number }) => void;
  onItemClick?: (item: CalendarItem) => void;
  onItemDrop?: (itemId: string, newDate: string) => void;
  weekdayLabels?: string[];
  moreLabel?: (n: number) => string;
};

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfGrid(d: Date) {
  const s = startOfMonth(d);
  const day = (s.getDay() + 6) % 7;
  s.setDate(s.getDate() - day);
  return s;
}
function fmtDay(d: Date) { return d.toISOString().slice(0, 10); }
function isSameMonth(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth(); }

export function ItemChip({
  item, onClick,
}: { item: CalendarItem; onClick?: (it: CalendarItem) => void }) {
  const meta = statusMeta(item.status);
  const Icon = platformIcon(item.platform);
  return (
    <button
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
      onClick={(e) => { e.stopPropagation(); onClick?.(item); }}
      className={cn(
        "w-full text-left flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] leading-tight border-l-2 border-current/40 overflow-hidden",
        meta.color
      )}
      title={`${item.title} · ${meta.label}${item.client_name ? " · " + item.client_name : ""}`}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" />
      <span className="truncate font-medium">{item.title}</span>
    </button>
  );
}

function MoreChipsPopover({
  items, onItemClick,
}: { items: CalendarItem[]; onItemClick?: (it: CalendarItem) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className="text-[10px] text-muted-foreground hover:text-foreground px-1 text-left"
        >
          +{items.length} în plus
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 space-y-1" align="start">
        <div className="text-[11px] text-muted-foreground px-1 pb-1">{items.length} elemente</div>
        {items.map((it) => (
          <ItemChip key={it.id} item={it} onClick={(i) => { setOpen(false); onItemClick?.(i); }} />
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function MonthCalendar({ month, items, onDayClick, onItemClick, onItemDrop, weekdayLabels, moreLabel }: Props) {
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
  const weekdays = weekdayLabels && weekdayLabels.length === 7 ? weekdayLabels : ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="grid grid-cols-7 text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
        {weekdays.map((d) => (
          <div key={d} className="px-2 py-2 text-center font-semibold">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6">
        {days.map((d) => {
          const key = fmtDay(d);
          const inMonth = isSameMonth(d, month);
          const list = byDay.get(key) || [];
          const visible = list.slice(0, 3);
          const overflow = list.slice(3);
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
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                onDayClick?.(key, { x: r.left + 8, y: r.top + 8 });
              }}
            >
              <div className={cn("text-[11px] font-mono", key === today && "text-accent font-bold")}>
                {d.getDate()}
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {visible.map((it) => (
                  <ItemChip key={it.id} item={it} onClick={onItemClick} />
                ))}
                {overflow.length > 0 && (
                  <MoreChipsPopover items={list} onItemClick={onItemClick} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
