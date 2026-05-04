import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { Upload, FileText, Trash2, Download } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];

export function ClientDocuments({ client }: { client: Client }) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("documents").select("*").eq("client_id", client.id).order("created_at", { ascending: false });
    setDocs(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, [client.id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const path = `${client.agency_id}/${client.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("agency-files").upload(path, file);
    if (upErr) { toast.error(upErr.message); setBusy(false); return; }
    const { error } = await supabase.from("documents").insert({
      agency_id: client.agency_id, client_id: client.id, name: file.name,
      storage_path: path, mime_type: file.type, size_bytes: file.size, uploaded_by: user?.id,
    });
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Uploaded"); load(); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const remove = async (d: any) => {
    if (!confirm(`Delete ${d.name}?`)) return;
    await supabase.storage.from("agency-files").remove([d.storage_path]);
    await supabase.from("documents").delete().eq("id", d.id);
    load();
  };

  const download = async (d: any) => {
    const { data } = await supabase.storage.from("agency-files").createSignedUrl(d.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Documents</h2>
        <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
        <Button size="sm" onClick={() => fileRef.current?.click()} disabled={busy} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Upload className="h-4 w-4 mr-2" /> {busy ? "Uploading…" : "Upload"}
        </Button>
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Loading…</div>
        : docs.length === 0 ? <EmptyState icon={FileText} title="No documents" description="Upload briefs, brand files, contracts, and more." />
        : (
          <div className="space-y-2">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <FileText className="h-5 w-5 text-accent flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{d.name}</div>
                  <div className="text-xs text-muted-foreground">{fmtDate(d.created_at)} · {(d.size_bytes / 1024).toFixed(0)} KB</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => download(d)}><Download className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => remove(d)}><Trash2 className="h-4 w-4 text-accent" /></Button>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
