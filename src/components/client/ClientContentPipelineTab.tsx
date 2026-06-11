import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { postStatusMeta } from "@/lib/approvals";
import { subscribeTables } from "@/lib/realtime";

const STAGES: Array<{ key: string; label: string; statuses: string[] }> = [
  { key: "idea", label: "Idee", statuses: ["idea", "draft"] },
  { key: "script", label: "Scenariu", statuses: ["script"] },
  { key: "filming", label: "Filmare", statuses: ["filming"] },
  { key: "editing", label: "Editare/Montaj", statuses: ["editing", "internal_review"] },
  { key: "approval", label: "În aprobare", statuses: ["sent_for_approval", "pending_approval", "changes_requested"] },
  { key: "approved", label: "Aprobat", statuses: ["approved", "ready_for_client"] },
  { key: "scheduled", label: "Programat", statuses: ["scheduled"] },
  { key: "published", label: "Publicat", statuses: ["published", "posted", "analyzed"] },
];

type Row = {
  id: string; title: string; status: string; platform: string | null;
  scheduled_for: string | null; thumbnail_url: string | null;
};

export function ClientContentPipelineTab({ clientId, onOpenPost }: { clientId: string; onOpenPost: (id: string) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("content_posts")
      .select("id,title,status,platform,scheduled_for,thumbnail_url")
      .eq("client_id", clientId)
      .order("scheduled_for", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    setRows((data || []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [clientId]);
  useEffect(() => subscribeTables(
    `client-pipeline-${clientId}`,
    [{ table: "content_posts", filter: `client_id=eq.${clientId}` }],
    load,
  ), [clientId]);

  const byStage = useMemo(() => {
    const map: Record<string, Row[]> = {};
    for (const s of STAGES) map[s.key] = [];
    for (const r of rows) {
      const stage = STAGES.find((s) => s.statuses.includes(r.status));
      if (stage) map[stage.key].push(r);
    }
    return map;
  }, [rows]);

  if (loading) {
    return <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  if (rows.length === 0) {
    return <Card className="rounded-2xl md:rounded-3xl"><CardContent className="py-10 text-center text-sm text-muted-foreground">Încă nu există conținut pentru tine.</CardContent></Card>;
  }

  return (
    <div className="flex flex-col md:flex-row md:gap-3 md:overflow-x-auto md:-mx-4 md:px-4 gap-4">
      {STAGES.map((stage) => {
        const list = byStage[stage.key];
        return (
          <section key={stage.key} className="md:w-72 md:shrink-0 space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stage.label}</h3>
              <span className="text-[10px] text-muted-foreground">{list.length}</span>
            </div>
            {list.length === 0 ? (
              <div className="text-[11px] text-muted-foreground/70 px-1 italic">—</div>
            ) : (
              <ul className="space-y-2">
                {list.map((r) => {
                  const m = postStatusMeta(r.status);
                  return (
                    <li key={r.id}>
                      <button
                        onClick={() => onOpenPost(r.id)}
                        className="w-full text-left bg-card border border-border/60 rounded-2xl p-3 hover:bg-muted/40 transition-colors min-h-[44px]"
                      >
                        <div className="text-sm font-medium line-clamp-2">{r.title || "(fără titlu)"}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${m.color}`}>{m.label}</span>
                          {r.platform && <span className="text-[10px] uppercase text-muted-foreground">{r.platform}</span>}
                          {r.scheduled_for && (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(r.scheduled_for).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" })}
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
