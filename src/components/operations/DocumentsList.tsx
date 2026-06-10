import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Download, Trash2, Eye, EyeOff, FileIcon } from "lucide-react";
import { toast } from "sonner";
import { DOCUMENT_FOLDERS } from "@/lib/operations";

interface Props {
  agencyId: string;
  clientId?: string | null;        // when provided, scope to this client
  clients?: { id: string; name: string }[]; // when no clientId, allow choosing per upload
  showVisibilityToggle?: boolean;  // hide on global page when no client
}

export function DocumentsList({ agencyId, clientId, clients, showVisibilityToggle = true }: Props) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadFolder, setUploadFolder] = useState<string>("general");
  const [uploadVisibility, setUploadVisibility] = useState<string>(clientId ? "internal" : "internal");
  const [uploadClient, setUploadClient] = useState<string>(clientId || "");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("documents").select("*, clients(name)").eq("agency_id", agencyId).order("created_at", { ascending: false });
    if (clientId) q = q.eq("client_id", clientId);
    const { data } = await q;
    setDocs(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, [agencyId, clientId]);

  const filtered = docs.filter((d) =>
    (folder === "all" || d.folder === folder) &&
    (!search.trim() || d.name.toLowerCase().includes(search.trim().toLowerCase()))
  );

  const onUpload = async (file: File) => {
    if (!file) return;
    setBusy(true);
    const safe = file.name.replace(/[^\w.\-]/g, "_");
    const path = `${agencyId}/documents/${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage.from("agency-files").upload(path, file, { contentType: file.type });
    if (upErr) { setBusy(false); toast.error(`Upload eșuat: ${upErr.message}`); return; }

    const finalClient = clientId || uploadClient || null;
    const visibility = (clientId || finalClient) ? uploadVisibility : "internal";

    const { error: dbErr } = await supabase.from("documents").insert({
      agency_id: agencyId,
      client_id: finalClient,
      folder: uploadFolder,
      visibility,
      name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      storage_path: path,
    });
    setBusy(false);
    if (dbErr) {
      await supabase.storage.from("agency-files").remove([path]);
      return toast.error(dbErr.message);
    }
    toast.success("Uploaded"); load();
    if (fileRef.current) fileRef.current.value = "";
  };

  const download = async (d: any) => {
    const { data, error } = await supabase.storage.from("agency-files").createSignedUrl(d.storage_path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };
  const remove = async (d: any) => {
    if (!confirm(`Delete "${d.name}"?`)) return;
    await supabase.storage.from("agency-files").remove([d.storage_path]);
    const { error } = await supabase.from("documents").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };
  const toggleVisibility = async (d: any) => {
    const next = d.visibility === "client_visible" ? "internal" : "client_visible";
    if (next === "client_visible" && !d.client_id) return toast.error("Atribuie un client ca să distribui documentul");
    const { error } = await supabase.from("documents").update({ visibility: next }).eq("id", d.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <Input ref={fileRef} type="file" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} disabled={busy} />
            </div>
            <Select value={uploadFolder} onValueChange={setUploadFolder}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DOCUMENT_FOLDERS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
            {!clientId && clients ? (
              <Select value={uploadClient || "_none"} onValueChange={(v) => setUploadClient(v === "_none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="No client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No client</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Select value={uploadVisibility} onValueChange={setUploadVisibility}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal only</SelectItem>
                  <SelectItem value="client_visible">Visible to client</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          {busy && <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Uploading...</div>}
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        <Input placeholder="Search files..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={folder} onValueChange={setFolder}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All folders</SelectItem>
            {DOCUMENT_FOLDERS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No documents.</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left p-2.5">Name</th>
                <th className="text-left p-2.5">Folder</th>
                {!clientId && <th className="text-left p-2.5">Client</th>}
                <th className="text-left p-2.5">Visibility</th>
                <th className="text-right p-2.5">Size</th>
                <th className="text-left p-2.5">Uploaded</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-2.5"><div className="flex items-center gap-2"><FileIcon className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-medium truncate max-w-[260px]">{d.name}</span></div></td>
                  <td className="p-2.5"><Badge variant="secondary" className="text-[10px]">{d.folder}</Badge></td>
                  {!clientId && <td className="p-2.5 text-xs">{d.clients?.name || "—"}</td>}
                  <td className="p-2.5 text-xs">{d.visibility === "client_visible" ? <span className="text-emerald-600 dark:text-emerald-400">Client</span> : <span className="text-muted-foreground">Internal</span>}</td>
                  <td className="p-2.5 text-right font-mono text-xs">{d.size_bytes ? `${(d.size_bytes / 1024).toFixed(1)} KB` : "—"}</td>
                  <td className="p-2.5 text-xs">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="p-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      {showVisibilityToggle && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" title={d.visibility === "client_visible" ? "Hide from client" : "Share with client"} onClick={() => toggleVisibility(d)}>
                          {d.visibility === "client_visible" ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => download(d)}><Download className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(d)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
