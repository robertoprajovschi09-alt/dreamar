## Plan

Logos are currently uploaded to the private `agency-files` bucket under `staging/<uid>/...` and the wizard stores a 1-year signed URL in `clients.logo_url`. Both issues need fixing so logos never expire.

### 1. Create a dedicated public bucket for client logos
- Call `storage_create_bucket` with `name: "client-logos"`, `public: true`.
- If the workspace blocks public buckets, surface the error and stop — do not silently fall back.

### 2. Add RLS policies on `storage.objects` for `client-logos`
Via a migration:
- Public `SELECT` for everyone (bucket is public).
- `INSERT` / `UPDATE` / `DELETE` restricted to authenticated users on objects under `client-logos`. Keep it simple (any authenticated agency user can write); the wizard is already gated behind agency auth.

### 3. Update the upload logic in `src/components/client/AddClientWizard.tsx`
In `onLogoFile`:
- Upload to bucket `client-logos` at path `<user.id>/<timestamp>.<ext>` (no `staging/` prefix).
- Replace the `createSignedUrl(..., 1 year)` call with `getPublicUrl(path)`.
- Save the resulting public URL into `form.logo_url` (which already flows into `clients.logo_url` on create).
- Keep the rest of the upload UX (file picker, spinner, preview thumbnail) unchanged.

### Notes
- `clients.logo_url` is a free-form text column, so no schema change is needed.
- Existing clients with old signed URLs are left as-is (they will continue to work until expiry); only new uploads use the public bucket.
- No other component reads logos from `agency-files/staging/`, so nothing else needs to change.