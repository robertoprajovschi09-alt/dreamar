import { useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, PointerSensor, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BOARD_COLUMNS, columnAccent, columnToStatus, statusToColumn, type BoardColumnId } from "@/lib/contentBoard";
import { ContentCard, type ContentRow } from "./ContentCard";
import { ContentEditor } from "./ContentEditor";
import { SendForApprovalDialog } from "@/components/approvals/SendForApprovalDialog";
import { PENDING_POST_STATUSES, hasReviewableAsset } from "@/lib/approvals";
import { cn } from "@/lib/utils";

type Props = {
  clientId?: string | null;
  search?: string;
  platform?: string;
  showNewButton?: boolean;
};

export function ContentBoard({ clientId, search, platform, showNewButton = false }: Props) {
  const { agency } = useUser();
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<any>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = async () => {
    if (!agency) return;
    setLoading(true);
    let q = supabase
      .from("content_posts")
      .select("id,title,platform,status,scheduled_for,deadline,content_type,hook,thumbnail_url,assets,assigned_to,client_id,clients(name)")
      .eq("agency_id", agency.id)
      .order("scheduled_for", { ascending: true, nullsFirst: false });
    if (clientId) q = q.eq("client_id", clientId);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [agency, clientId]);

  const filtered = useMemo(() => {
    return rows.filter((r) =>
      (!search || r.title.toLowerCase().includes(search.toLowerCase())) &&
      (!platform || platform === "all" || r.platform === platform),
    );
  }, [rows, search, platform]);

  const byColumn = useMemo(() => {
    const out: Record<BoardColumnId, ContentRow[]> = {
      idea: [], script: [], filming: [], editing: [], approval: [], scheduled: [], published: [],
    };
    for (const r of filtered) out[statusToColumn(r.status)].push(r);
    return out;
  }, [filtered]);

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const targetCol = over.id as BoardColumnId;
    const row = rows.find((r) => r.id === active.id);
    if (!row) return;
    const newStatus = columnToStatus(targetCol, row.status);
    if (newStatus === row.status) return;
    // optimistic
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: newStatus } : r)));
    const { error } = await supabase.from("content_posts").update({ status: newStatus }).eq("id", row.id);
    if (error) {
      toast.error(`Nu am putut muta: ${error.message}`);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: row.status } : r)));
    } else {
      toast.success("Mutat");
    }
  };

  if (loading) {
    return <div className="py-16 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2 snap-x">
          {BOARD_COLUMNS.map((col) => (
            <BoardColumn
              key={col.id}
              column={col}
              rows={byColumn[col.id]}
              onCardClick={(id) => { setEditingId(id); setEditorOpen(true); }}
              onAdd={showNewButton ? () => { setEditingId(null); setDefaultStatus(col.canonical); setEditorOpen(true); } : undefined}
            />
          ))}
        </div>
      </DndContext>
      <ContentEditor
        open={editorOpen}
        onOpenChange={(v) => { setEditorOpen(v); if (!v) setDefaultStatus(null); }}
        postId={editingId}
        defaultClientId={clientId || null}
        defaultStatus={defaultStatus}
        onSaved={load}
      />
    </>
  );
}

function BoardColumn({
  column, rows, onCardClick, onAdd,
}: {
  column: typeof BOARD_COLUMNS[number];
  rows: ContentRow[];
  onCardClick: (id: string) => void;
  onAdd?: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id });
  const overdueCount = rows.filter((r) => r.deadline && new Date(r.deadline) < new Date()).length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "snap-start shrink-0 w-[290px] rounded-3xl bg-surface-1 p-3 transition-colors",
        isOver && "ring-2 ring-accent bg-accent/5",
      )}
    >
      <div className="flex items-center gap-2 px-1 pb-3">
        <div className={cn("h-2 w-2 rounded-full", columnAccent(column.id))} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold">{column.label}</h3>
            <span className="text-xs text-muted-foreground">{rows.length}</span>
            {overdueCount > 0 && (
              <span className="text-[10px] bg-destructive/10 text-destructive rounded-full px-1.5 py-0.5 font-semibold">
                {overdueCount} întârziat
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{column.hint}</p>
        </div>
        {onAdd && (
          <button type="button" onClick={onAdd} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-surface-2">
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="space-y-2 min-h-[120px]">
        {rows.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground/70 py-8 px-2 border-2 border-dashed border-border/40 rounded-2xl">
            Trage aici sau adaugă cu „+"
          </div>
        ) : (
          rows.map((r) => <ContentCard key={r.id} row={r} onClick={() => onCardClick(r.id)} />)
        )}
      </div>
    </div>
  );
}
