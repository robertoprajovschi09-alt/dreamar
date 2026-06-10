## Problem

The private bucket `agency-files` has 8 RLS policies on `storage.objects` — 4 correct (`agency_files_insert/read/update/delete`) and 4 buggy (`agency_files_member_write/read/update/delete`). The buggy ones use `storage.foldername(c.name)` (the client's *name* column) instead of `storage.foldername(name)` (the storage object's path), so they never match. The correct policies require the first path segment to be a valid agency UUID — but most of the app uploads to paths like `staging/{user_id}/...` or `content/{agency_id}/...`, which fail the UUID cast and get rejected. Bucket is private, but some code uses `getPublicUrl` which can't return usable links.

## Fix overview

One convention everywhere: **every object key starts with `{agency_id}/`**. Drop the buggy policies. Always render private files through `createSignedUrl`. Store the storage *path* in DB (not the signed URL, which expires).

## Migration (new file `supabase/migrations/<ts>_storage_agency_files_cleanup.sql`)

```sql
DROP POLICY IF EXISTS agency_files_member_write  ON storage.objects;
DROP POLICY IF EXISTS agency_files_member_read   ON storage.objects;
DROP POLICY IF EXISTS agency_files_member_update ON storage.objects;
DROP POLICY IF EXISTS agency_files_member_delete ON storage.objects;
```

Then verify the 4 clean policies exist (recreate if absent) with the form:
`bucket_id = 'agency-files' AND (is_saas_admin(auth.uid()) OR is_member_of(auth.uid(), ((storage.foldername(name))[1])::uuid))` for SELECT/INSERT(WITH CHECK)/UPDATE/DELETE.

(No data backfill of existing `logo_url` values — code is taught to handle both legacy signed URLs and bare paths; new uploads always write paths.)

## Code changes

New helper `src/lib/storage.ts`:
- `agencyFilePath(agencyId, ...segments)` → joins to `"{agencyId}/seg1/seg2/..."`, sanitizing.
- `resolveStorageUrl(value)` → if value is `null` returns null; if it starts with `http(s)://` returns it as-is (legacy signed URL); otherwise calls `createSignedUrl(value, 3600)` and returns the signed URL. Used everywhere a stored `logo_url`/`storage_path` is rendered.
- `uploadAgencyFile(agencyId, subpath, file, opts?)` → wraps `.upload`, surfaces clear toast on error, returns the path.

Upload call sites switched to `{agency_id}/...`:
- `src/components/client/AddClientWizard.tsx` (logo upload): `staging/{user.id}/...` → `{agency_id}/clients/staging/{user.id}/{ts}.{ext}`. Persist the **path** in `form.logo_url`, not the signed URL. Show preview via `resolveStorageUrl`.
- `src/components/client/QuickAddClientDialog.tsx` (logo upload): same fix.
- `src/components/content/AssetUploader.tsx`: `content/{agencyId}/{folder}/...` → `{agencyId}/content/{folder}/{ts}-{name}`.
- `src/components/operations/DocumentsList.tsx`: already prefixed with `{agencyId}/` — keep, but route through helper + toast.
- `src/lib/competitors.ts`: keep path (already `{agencyId}/competitors/...`); replace `getPublicUrl` with `resolveStorageUrl` (signed). Update `screenshotUrl` to be async or expose `screenshotSignedUrl(path)`, and update the 2-3 call sites in `CompetitorCard` / observations to await it.
- `src/pages/agency/Settings.tsx`: add an **Agency logo** upload field (file input + preview). Upload to `{agency_id}/agency/logo-{ts}.{ext}`, store path in `agencies.logo_url`, render via `resolveStorageUrl`.

Render call sites — wrap stored `logo_url` through `resolveStorageUrl` (small `useSignedUrl(path)` hook for React):
- `src/pages/agency/ClientProfile.tsx` (client logo)
- `src/pages/client/ClientPortal.tsx` (client logo)
- `src/pages/agency/ReportPrint.tsx` (agency + client logos)
- `src/components/reports/ClientReportsView.tsx` (agency + client logos)
- `src/components/reports/ClientReportsTab.tsx` + `src/pages/agency/Reports.tsx` (pass-through)
- `src/components/client/AddClientWizard.tsx` preview thumb
- `src/components/competitors/CompetitorCard.tsx` (screenshot)

All upload error paths show a `toast.error(error.message)` (no silent failure).

## What stays untouched

- AI / Gemini code (`supabase/functions/ai-*`, `supabase/functions/openai-*`, prompts, memory, etc.).
- The 4 correct `agency_files_*` policies.
- Bucket privacy (stays private).
- The `agencies.logo_url` / `clients.logo_url` schema — semantics change from "URL" to "path (or legacy URL)" and `resolveStorageUrl` handles both.

## Tests (manual in test tenant)

1. Add Client wizard → upload logo → preview shows → save → opens in ClientProfile with logo visible.
2. Settings → upload agency logo → preview shows → appears in ReportPrint header.
3. Documents page → upload PDF → appears in list → download works.
4. Content card → upload video asset → thumbnail/preview signed URL works.
5. Competitor → upload screenshot → renders in card.
6. All uploads land under `{agency_id}/...` (verify via `select name from storage.objects where bucket_id='agency-files' order by created_at desc limit 20`).
