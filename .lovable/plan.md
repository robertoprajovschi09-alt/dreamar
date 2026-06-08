## Bug
`accept_client_invite` casts `'client_owner'` to `app_role`, but the enum only has `client_viewer`. Accepting any invite created with `portal_role='client_owner'` fails.

## Fix — collapse to viewer everywhere, keep owner-ness only as permissions

### 1. New migration: rewrite `accept_client_invite`
Replace the function so it always sets `_role := 'client_viewer'::app_role` for both `client_users.role` and `profiles.role`. Drop the `CASE … client_owner …` branch. Everything else (conflict handling, profile lock bypass, accepted_at, old-agency cleanup) stays unchanged. No enum changes, no routing changes — accepted users still land on `/client` via the existing `roleHome` logic.

### 2. Stop creating `client_owner` invites in the UI
- `src/components/client/QuickAddClientDialog.tsx` (line 167): change `portal_role: "client_owner"` → `"client_viewer"`.
- `src/components/client/AddClientWizard.tsx`: remove the `client_owner` option from the invite-role select (line 30) and default `form.invite_role` to `"client_viewer"`; keep the field hidden or as a single read-only viewer label. The wizard will always send `portal_role: "client_viewer"`.
- `src/pages/agency/InviteClientDialog.tsx`: remove the owner/viewer `RadioGroup`, hardcode `role = "client_viewer"`, and drop the unused state. Permissions toggles remain (that's where any "owner-like" capabilities live now).

### 3. Leave alone
- `app_role` enum — no new values.
- `client_users.permissions` / `defaultPermissions("client_owner"|"client_viewer")` helpers — they still work for permission defaults if ever reused, but no UI path will pass `"client_owner"` anymore.
- `PortalSettingsCard` owner/viewer labels — harmless for any legacy rows; can stay.
- `RoleRoute` / `roleHome` — `client_viewer` already routes to `/client`.

### Out of scope
Backfilling any existing `client_invites` rows that have `portal_role='client_owner'` — the new function ignores that column for role assignment, so old rows accept cleanly.
