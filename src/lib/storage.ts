import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BUCKET = "agency-files";

/** Sanitize a single path segment (no slashes, only safe chars). */
function sanitize(seg: string): string {
  return String(seg).replace(/[^a-zA-Z0-9._-]+/g, "_");
}

/**
 * Build a storage object key that ALWAYS starts with `{agencyId}/...`,
 * which is what the storage RLS policies on `agency-files` require.
 */
export function agencyFilePath(agencyId: string, ...segments: string[]): string {
  if (!agencyId) throw new Error("agencyFilePath: agencyId is required");
  const tail = segments
    .filter(Boolean)
    .flatMap((s) => String(s).split("/"))
    .filter(Boolean)
    .map(sanitize)
    .join("/");
  return tail ? `${agencyId}/${tail}` : agencyId;
}

export type UploadOptions = {
  contentType?: string;
  upsert?: boolean;
  /** Show a toast on failure (default true). */
  toastOnError?: boolean;
};

/**
 * Upload `file` to `agency-files` at `{agencyId}/{subpath}`.
 * Returns the storage path on success, or null on error (toast is shown).
 */
export async function uploadAgencyFile(
  agencyId: string,
  subpath: string,
  file: File,
  opts: UploadOptions = {},
): Promise<string | null> {
  const path = subpath.startsWith(`${agencyId}/`) ? subpath : agencyFilePath(agencyId, subpath);
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: opts.contentType ?? file.type ?? "application/octet-stream",
    upsert: opts.upsert ?? false,
  });
  if (error) {
    if (opts.toastOnError !== false) toast.error(`Upload eșuat: ${error.message}`);
    return null;
  }
  return path;
}

/**
 * Resolve a value stored in DB (`logo_url`, `storage_path`, etc.) to a URL that
 * can be put in <img src>. Accepts:
 *  - null / "" -> null
 *  - http(s):// URL -> returned as-is (legacy signed/public URLs)
 *  - storage path -> signed URL (default 1h)
 */
export async function resolveStorageUrl(
  value: string | null | undefined,
  expiresIn = 3600,
): Promise<string | null> {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v) || v.startsWith("data:")) return v;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(v.replace(/^\/+/, ""), expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** React hook: resolves a stored value to a usable URL. */
export function useSignedUrl(value: string | null | undefined, expiresIn = 3600): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!value) { setUrl(null); return; }
    resolveStorageUrl(value, expiresIn).then((u) => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [value, expiresIn]);
  return url;
}
