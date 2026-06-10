import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, FileVideo, FileImage, FileText, Paperclip } from "lucide-react";
import { toast } from "sonner";

export type AssetItem = {
  path: string;
  name: string;
  type: string;
  size: number;
  uploaded_at: string;
};

type Props = {
  agencyId: string;
  postId?: string | null;
  value: AssetItem[];
  onChange: (next: AssetItem[]) => void;
};

function iconFor(type: string) {
  if (type.startsWith("video/")) return FileVideo;
  if (type.startsWith("image/")) return FileImage;
  if (type.startsWith("text/") || type.includes("pdf")) return FileText;
  return Paperclip;
}

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function AssetUploader({ agencyId, postId, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [signed, setSigned] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const out: Record<string, string> = {};
      for (const a of value) {
        if (!a.type.startsWith("image/")) continue;
        const { data } = await supabase.storage.from("agency-files").createSignedUrl(a.path, 600);
        if (data?.signedUrl) out[a.path] = data.signedUrl;
      }
      if (alive) setSigned(out);
    })();
    return () => { alive = false; };
  }, [value]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const folder = postId || `tmp-${Date.now()}`;
    const added: AssetItem[] = [];
    for (const file of Array.from(files)) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
      const path = `content/${agencyId}/${folder}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from("agency-files").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (error) { toast.error(`Nu am putut încărca ${file.name}: ${error.message}`); continue; }
      added.push({ path, name: file.name, type: file.type || "application/octet-stream", size: file.size, uploaded_at: new Date().toISOString() });
    }
    if (added.length) {
      onChange([...value, ...added]);
      toast.success(`${added.length} fișier(e) încărcate`);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = async (a: AssetItem) => {
    await supabase.storage.from("agency-files").remove([a.path]);
    onChange(value.filter((x) => x.path !== a.path));
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${drag ? "border-accent bg-accent/5" : "border-border bg-surface-1"}`}
      >
        <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
        <div className="text-sm font-medium">Trage fișierele aici</div>
        <div className="text-xs text-muted-foreground mt-0.5">video, imagini, PDF — orice ai pregătit</div>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
          Alege fișiere
        </Button>
      </div>
      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((a) => {
            const Icon = iconFor(a.type);
            return (
              <li key={a.path} className="flex items-center gap-3 rounded-xl bg-surface-1 px-3 py-2">
                {signed[a.path] ? (
                  <img src={signed[a.path]} alt="" className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-surface-2 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.name}</div>
                  <div className="text-[11px] text-muted-foreground">{formatSize(a.size)}</div>
                </div>
                <button type="button" onClick={() => remove(a)} className="text-muted-foreground hover:text-destructive p-1">
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
