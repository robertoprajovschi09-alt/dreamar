import { useEffect, useState, useMemo } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { statusPillKind } from "@/lib/contentBoard";
import { statusMeta } from "@/lib/content";
import { ContentEditor } from "./ContentEditor";
import { SaveToSwipeButton } from "@/components/swipe/SaveToSwipeButton";
import { SendForApprovalDialog } from "@/components/approvals/SendForApprovalDialog";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

type Props = { clientId?: string | null; search?: string; platform?: string; statusFilter?: string };

export function ContentList({ clientId, search, platform, statusFilter }: Props) {
  const { agency } = useUser();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [sendPost, setSendPost] = useState<any | null>(null);

  const load = async () => {
    if (!agency) return;
    setLoading(true);
    let q = supabase.from("content_posts")
      .select("id,title,platform,status,scheduled_for,content_type,client_id,agency_id,hook,script,caption,clients(name)")
      .eq("agency_id", agency.id)
      .order("scheduled_for", { ascending: false, nullsFirst: false });
    if (clientId) q = q.eq("client_id", clientId);
    const { data } = await q;
    setRows(data || []); setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [agency, clientId]);

  const filtered = useMemo(() => rows.filter((r) =>
    (!search || r.title.toLowerCase().includes(search.toLowerCase())) &&
    (!platform || platform === "all" || r.platform === platform) &&
    (!statusFilter || statusFilter === "all" || r.status === statusFilter)
  ), [rows, search, platform, statusFilter]);

  return (
    <Card className="overflow-hidden">
      {loading ? (
        <div className="p-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">Nimic de afișat aici. Schimbă filtrele sau adaugă conținut nou.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-1 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Titlu</th>
                <th className="text-left px-4 py-3 font-semibold">Client</th>
                <th className="text-left px-4 py-3 font-semibold">Platformă</th>
                <th className="text-left px-4 py-3 font-semibold">Tip</th>
                <th className="text-left px-4 py-3 font-semibold">Programat</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-surface-1/50 cursor-pointer transition-colors" onClick={() => { setEditingId(r.id); setEditorOpen(true); }}>
                  <td className="px-4 py-3 font-medium">{r.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.clients?.name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.platform || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.content_type || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.scheduled_for ? new Date(r.scheduled_for).toLocaleString("ro-RO") : "—"}</td>
                  <td className="px-4 py-3"><StatusPill kind={statusPillKind(r.status)}>{statusMeta(r.status).label}</StatusPill></td>
                  <td className="px-4 py-3 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                    {(r.status === "ready_for_client" || r.status === "changes_requested" || r.status === "internal_review") && (
                      <Button size="sm" variant="outline" className="h-8" onClick={() => setSendPost(r)}>
                        <Send className="h-3.5 w-3.5 mr-1" /> Trimite
                      </Button>
                    )}
                    <SaveToSwipeButton defaults={{
                      title: r.title,
                      type: "video_idea",
                      platform: r.platform || undefined,
                      client_id: r.client_id || null,
                      hook: r.hook || null,
                      script: r.script || null,
                      caption: r.caption || null,
                      content_format: r.content_type || null,
                      source_post_id: r.id,
                    }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ContentEditor open={editorOpen} onOpenChange={setEditorOpen} postId={editingId} defaultClientId={clientId || null} onSaved={load} />
      <SendForApprovalDialog open={!!sendPost} onOpenChange={(v) => !v && setSendPost(null)} post={sendPost} onSent={load} />
    </Card>
  );
}
