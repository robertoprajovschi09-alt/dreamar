# Team Invites & Member Management

Build the team workflow so an agency owner can invite teammates that get access to the agency dashboard, mirroring the existing client-invite UX.

## 1. Database (one migration)

**`team_invites` table** (modeled after `client_invites`, agency-scoped only):
- `id, agency_id, email, token (auto random), role (agency_owner|agency_team, default agency_team), invited_by, status (pending|sent|opened|accepted|expired|revoked), created_at, expires_at (now()+7d), accepted_at, opened_at, revoked_at, last_sent_at, send_count`
- GRANTs: `SELECT/INSERT/UPDATE/DELETE` to `authenticated`; `ALL` to `service_role`
- RLS: members of the agency can read/insert/update/delete (insert requires `invited_by = auth.uid()`)
- Unique `(agency_id, lower(email))` where status not in revoked/expired/accepted (partial index) to prevent dupes

**RPCs (SECURITY DEFINER, search_path=public):**
- `get_team_invite_preview(_token)` → agency_name, email, role, status, expires_at (open to anon)
- `mark_team_invite_opened(_token)` — same pattern as `mark_invite_opened`
- `accept_team_invite(_token)` — validates invite; inserts into `agency_members(agency_id, user_id, role)`; upserts profile with `role` + `agency_id` using the existing `app.bypass_profile_lock` pattern; marks invite accepted; respects `enforce_seat_limit` trigger (which already exists)
- `resend_team_invite(_invite_id)` / `revoke_team_invite(_invite_id)` — owner-only via `is_owner_of`

**Update `handle_new_user` trigger** — recognise `team_invite_token` in `raw_user_meta_data` and skip auto-agency creation (same branch as the existing client `invite_token`).

## 2. Edge Function `send-team-invite`

Clone of `send-client-invite`. Reads `team_invites` + `agencies`, sends a Resend email with subject "{agency} te-a invitat în echipă" and a link `https://<host>/accept-team-invite?token=...`. Updates `status` to `sent` and `last_sent_at`.

## 3. UI

**`src/pages/agency/Team.tsx`** (replace placeholder):
- Header with "Invite member" button (owner only).
- **Members card**: lists `agency_members` joined to `profiles` (name, email, role badge). Owner can change role via Select (`agency_owner`/`agency_team`) and Remove (with confirm). Hide controls for the current user / cannot remove last owner.
- **Pending invites card**: lists `team_invites` with status ≠ accepted/revoked; Resend, Copy link, Revoke buttons — mirroring client invite UI.
- Seat usage indicator: `<members + pending> / plans.max_seats` for the agency's plan (show "Plan limit reached" disabled state on Invite button when exceeded).

**`src/components/team/InviteTeamMemberDialog.tsx`** (new): email, role select (owner/team), submits insert into `team_invites`, then invokes `send-team-invite`; offers "Just create link" fallback like the client dialog.

**`src/pages/AcceptTeamInvite.tsx`** (new): mirrors `AcceptInvite.tsx` — preview via `get_team_invite_preview`, sign-up/sign-in tabs (passes `team_invite_token` in user metadata), auto-calls `accept_team_invite` once signed in, refreshes `UserContext`, navigates to `/agency`.

**Route**: add `/accept-team-invite` in `src/App.tsx`.

## 4. Verification

- Owner can invite, see pending status, resend & revoke.
- Invitee receives email, signs up, lands on `/agency` with `agency_team` role and sees agency data (RoleRoute already allows it).
- Seat limit blocks invite/accept once `plans.max_seats` is exceeded (existing `enforce_seat_limit` trigger handles accept).
- Members list reflects role changes & removals immediately.

## Out of scope

- No changes to client invite flow.
- No new email templates beyond the team-specific copy.
- No bulk invite.
