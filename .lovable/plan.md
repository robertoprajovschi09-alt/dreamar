## Goal

Make the agency↔client connection smarter by upgrading the existing `client_invites` system into a fully-featured **Client Invitations** model with granular permissions, lifecycle tracking (sent / opened / accepted / expired), email delivery, and a complete **Client Portal Settings** panel inside the Client Profile page.

The existing schema already has the right foundations (`client_invites`, `client_users`, `permissions jsonb`, `portal_role`, `accept_client_invite` RPC). We will extend it rather than create a parallel `client_invitations` table — that keeps RLS, RPC, AcceptInvite page, and AddClientWizard working without breakage.

## Scope summary

```text
1. DB migration  ─ extend client_invites + client_users
2. Edge function  ─ send-client-invite (email + tracking pixel)
3. AcceptInvite   ─ mark "opened" on link visit
4. UI             ─ rebuild Portal Settings tab in ClientProfile
5. Dialog         ─ upgrade InviteClientDialog (permissions + role + email send)
6. Workspace      ─ confirm provisioning already creates all sub-areas
```

## 1. Database migration

Extend existing tables (no breaking renames):

**`client_invites`** — add columns:
- `opened_at timestamptz`
- `accepted_at timestamptz`
- `last_sent_at timestamptz default now()`
- `send_count int not null default 1`
- `revoked_at timestamptz`
- Status check constraint extended to: `pending | sent | opened | accepted | expired | revoked`

**`client_users`** — add columns:
- `last_login_at timestamptz`
- `revoked_at timestamptz`

**Trigger**: on `auth.users` sign-in (or via `accept_client_invite`), update `client_users.last_login_at`. Simpler: update `last_login_at` from a small RPC `touch_client_login()` called by ClientPortal on mount.

**RPC updates**:
- `accept_client_invite(_token)` — set `accepted_at = now()`, status `accepted`.
- New `mark_invite_opened(_token)` — security definer, sets `opened_at`/status `opened` if currently `pending|sent`. Public-callable (token is the secret).
- New `resend_client_invite(_invite_id)` — bumps `last_sent_at`, `send_count`, resets `expires_at = now() + 7 days`, status back to `sent` if expired.
- New `revoke_client_invite(_invite_id)` — sets `revoked_at`, status `revoked`.

**Permissions JSON shape** (stored on both `client_invites.permissions` and `client_users.permissions`, already exists):
```
{
  can_view_dashboard, can_view_calendar, can_approve_content,
  can_request_changes, can_view_reports, can_upload_documents,
  can_complete_impact_forms, can_comment
}
```
All booleans, default `true` for viewer/owner except `can_approve_content` defaults `false` for `client_viewer`.

**RLS** — already enforced (`is_client_viewer_of`); no new tables, so existing policies apply. Confirm clients can only `SELECT` their own `client_id` rows everywhere — already in place.

## 2. Edge function: `send-client-invite`

New function (uses Lovable's built-in transactional emails via `send-transactional-email`).
- Input: `{ invite_id }`
- Loads invite + agency + client
- Calls `supabase.functions.invoke('send-transactional-email', { templateName: 'client-portal-invite', recipientEmail, idempotencyKey: 'invite-<id>-<send_count>', templateData: { agencyName, clientName, inviteUrl, expiresAt } })`
- Updates `last_sent_at`, `status = 'sent'`

Template: `supabase/functions/_shared/transactional-email-templates/client-portal-invite.tsx` — branded React Email with CTA button → `/accept-invite?token=...`.

Prerequisites tool chain (will be triggered automatically): `email_domain--check_email_domain_status` → if no domain, surface `<lov-open-email-setup>` button → `setup_email_infra` → `scaffold_transactional_email` → deploy.

If user has not configured an email domain yet, the **Send Invite** button still works (creates invite + copies link), and we show an inline notice: "Set up an email domain to send invites by email." The link-copy fallback always works.

## 3. AcceptInvite page change

On mount (before login), call `supabase.rpc('mark_invite_opened', { _token })` so the agency sees `opened` status even before account creation.

## 4. Portal Settings panel (ClientProfile → Settings tab)

Replace the current `UsersTab` + `InvitesTab` blocks with a unified **Client Portal Settings** card containing:

```text
┌─ Client Portal Access ──────────────────────────┐
│ [Invite client] button                          │
│                                                 │
│ Active members                                  │
│  • email · role · last login · [⋯ menu]         │
│      ↳ Edit permissions  / Revoke access        │
│                                                 │
│ Pending invitations                             │
│  • email · status badge · expires · [⋯ menu]    │
│      ↳ Copy link / Resend / Revoke              │
└─────────────────────────────────────────────────┘
```

Status badges with color: `not sent` (gray), `sent` (blue), `opened` (amber), `accepted` (green), `expired` (red), `revoked` (muted).

**Edit permissions dialog** — 8 toggles matching the JSON shape above; updates `client_users.permissions` (or `client_invites.permissions` for pending).

## 5. Upgraded InviteClientDialog

Stepper-free, single dialog with:
- Email input
- Display name (optional)
- Portal role: `Owner` / `Viewer` (radio)
- Permissions section (8 switches, sensible defaults per role)
- Two actions:
  - **Send Invite** → insert invite + invoke `send-client-invite` (if email infra ready) + toast with copy-link fallback
  - **Create link only** → insert invite, show copyable link

`AddClientWizard` already inserts an invite at the end; update it to also call `send-client-invite` when `invite_enabled`.

## 6. Workspace provisioning (already done — verify only)

`AddClientWizard` already creates: client record, `client_kpi_schemas`, `client_platforms`, `monthly_goals`, default onboarding tasks. The Client Profile page already exposes all required tabs (Overview, Calendar, Analytics, Reports, Documents, Approvals, Goals, Strategy, Tasks, Settings). The new Portal Settings card lives inside the Settings tab — **no new tab needed**.

The Business Impact form is already covered by the existing `client_feedback` flow; no schema change.

## Files to add / change

**New**
- `supabase/migrations/<ts>_client_invite_lifecycle.sql`
- `supabase/functions/send-client-invite/index.ts`
- `supabase/functions/_shared/transactional-email-templates/client-portal-invite.tsx`
- `src/components/client/PortalSettingsCard.tsx` (the new unified panel)
- `src/components/client/EditPortalPermissionsDialog.tsx`

**Edit**
- `src/pages/agency/InviteClientDialog.tsx` (role + permissions + send email)
- `src/pages/agency/ClientProfile.tsx` (replace UsersTab + InvitesTab with `<PortalSettingsCard />`)
- `src/pages/AcceptInvite.tsx` (call `mark_invite_opened` on mount)
- `src/components/client/AddClientWizard.tsx` (invoke `send-client-invite` after invite insert)
- `src/pages/client/ClientPortal.tsx` (call `touch_client_login` once on mount)
- `src/integrations/supabase/types.ts` (auto-regenerated)

## Out of scope

- A separate `client_invitations` table (existing `client_invites` already covers it; renaming would break the live AcceptInvite flow, RPC, and RLS).
- Real-time "open tracking" via email pixel — we mark `opened` when the user actually visits the accept-invite page, which is more reliable than image-pixel tracking.
- Permission *enforcement* in every UI tab — RLS already restricts data; UI gating per-permission can be layered in afterwards (this plan stores the permissions correctly so enforcement is a UI-only follow-up).
