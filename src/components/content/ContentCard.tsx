import { useEffect, useState, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, AlertTriangle, XCircle } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { statusPillKind } from "@/lib/contentBoard";
import { statusMeta } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export type ContentRow = {
  id: string;
  title: string;
  platform: string | null;
  status: string;
  scheduled_for: string | null;
  deadline: string | null;
  content_type: string | null;
  hook: string | null;
  thumbnail_url: string | null;
  assets: any;
  assigned_to: string | null;
  client_id: string;
  clients?: { name: string } | null;
  assignee?: { full_name: string | null; email: string | null } | null;
};

function firstImagePath(row: ContentRow): string | null {
  if (row.thumbnail_url) return null;
  if (!Array.isArray(row.assets)) return null;
  const img = row.assets.find((a: any) => typeof a?.type === "string" && a.type.startsWith("image/"));
  return img?.path || null;
}

export function ContentCard({ row, onClick }: { row: ContentRow; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: row.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  const [signedThumb, setSignedThumb] = useState<string | null>(null);
  const imgPath = useMemo(() => firstImagePath(row), [row]);

  useEffect(() => {
    let alive = true;
    if (row.thumbnail_url) { setSignedThumb(row.thumbnail_url); return; }
    if (!imgPath) { setSignedThumb(null); return; }
    supabase.storage.from("agency-files").createSignedUrl(imgPath, 600).then(({ data }) => {
      if (alive) setSignedThumb(data?.signedUrl || null);
    });
    return () => { alive = false; };
  }, [row.thumbnail_url, imgPath]);

  const overdue = row.deadline && new Date(row.deadline) < new Date() && !["published", "posted", "analyzed", "approved", "scheduled"].includes(row.status);
  const flag = row.status === "changes_requested" ? "changes" : row.status === "rejected" ? "rejected" : null;
  const assigneeInitials = (row.assignee?.full_name || row.assignee?.email || "")
    .split(/[ @.]/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "?";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => { if (!isDragging) onClick(); e.stopPropagation(); }}
      className={cn(
        "group bg-card rounded-2xl border border-border/60 shadow-soft p-3 cursor-grab active:cursor-grabbing select-none transition-all hover:shadow-md hover:-translate-y-0.5",
        isDragging && "opacity-50 ring-2 ring-accent",
      )}
    >
      <div className="aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-surface-2 to-surface-3 mb-2.5 relative">
        {signedThumb ? (
          <img src={signedThumb} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            fără preview
          </div>
        )}
        {flag && (
          <div className={cn(
            "absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1",
            flag === "changes" ? "bg-orange-500 text-white" : "bg-red-500 text-white",
          )}>
            {flag === "changes" ? <><AlertTriangle className="h-3 w-3" /> Schimbări cerute</> : <><XCircle className="h-3 w-3" /> Respins</>}
          </div>
        )}
      </div>
      <div className="font-semibold text-sm leading-snug line-clamp-2">{row.title}</div>
      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        {row.clients?.name && <span className="text-[11px] text-muted-foreground truncate max-w-[110px]">{row.clients.name}</span>}
        {row.platform && (
          <span className="text-[10px] uppercase tracking-wide bg-surface-2 rounded-full px-2 py-0.5 font-medium">
            {row.platform}
          </span>
        )}
        <StatusPill kind={statusPillKind(row.status)} className="text-[9px]">
          {statusMeta(row.status).label}
        </StatusPill>
      </div>
      {row.hook && (
        <p className="text-xs italic text-muted-foreground mt-2 line-clamp-1">„{row.hook}"</p>
      )}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
        <span className={cn("flex items-center gap-1", overdue && "text-destructive font-medium")}>
          {overdue ? <Clock className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
          {row.scheduled_for ? new Date(row.scheduled_for).toLocaleDateString("ro-RO", { day: "numeric", month: "short" }) : "fără dată"}
        </span>
        {row.assigned_to && (
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[9px] bg-accent/15 text-accent">{assigneeInitials}</AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}
