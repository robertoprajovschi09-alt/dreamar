## Goal

Replace the current single-area `/app` shell with a fully working multi-role access system:
- **Agency area** at `/agency` (owners + team members)
- **Client portal** at `/client` (client viewers, scoped to one client)
- Token-based **client invitation** flow at `/accept-invite`
- Strict **RLS** so a client viewer can never see another client, and a second agency can never see the first agency's data

No new "feature" modules (no AI, no Stripe, no calendar, no documents, no analytics). Just access + invites + feedback.

---

## 1. Database changes (one migration)

Reuse what already exists where it matches the contract; add only what's missing. Existing `agency_members` already covers the user's requested `agency_users` table (same columns: `agency_id`, `user_id`, `role`, `created_at`) — we keep it and treat `agency_members` as the canonical name in code, no rename needed.

**New tables**

- `client_users` — links an auth user to a single client as a viewer  
  `id, agency_id, client_id, user_id, email, role (default 'client_viewer'), status ('invited'|'active'|'disabled'), created_at`
- `client_invites` — token-based invite for the client portal  
  `id, agency_id, client_id, email, token (unique, default random hex), status ('pending'|'accepted'|'expired'), invited_by, created_at, expires_at (default now()+7d)`
- `client_feedback` — monthly client feedback + business impact  
  `id, agency_id, client_id, submitted_by, month (date, first day of month), feedback_text, calls_received int, messages_received int, bookings int, sales_estimate numeric, real_life_impact text, objections text, promote_next_month text, created_at`

**Profile additions**

Add `client_id uuid` (nullable) and `agency_id uuid` (nullable) to `profiles`. The existing `app_role` enum already contains `agency_owner`, `agency_team`, `client_viewer`, `saas_admin` — we keep using it and treat `agency_team` as `agency_team_member`.

**Helper functions (SECURITY DEFINER, search_path=public)**

- `accept_client_invite(_token text)` — validates token, marks invite accepted, inserts/updates `client_users` (status='active'), updates the caller's `profiles.client_id` + `profiles.agency_id`, returns the `client_id`. Runs as definer to bypass RLS during the linking step.
- `is_client_viewer_of(_user uuid, _client uuid)` — boolean used in client RLS.
- Keep existing `is_member_of`, `is_owner_of`, `is_saas_admin`.

**RLS rewrites (drop existing relevant policies, recreate)**

- `clients` SELECT: `is_member_of(auth.uid(), agency_id) OR is_client_viewer_of(auth.uid(), id) OR is_saas_admin(auth.uid())`. INSERT/UPDATE/DELETE: agency owner of that agency only (UPDATE allowed for any agency member, DELETE owner-only).
- `client_users`: agency members of the row's agency can read/insert/update/delete; the linked user can read their own row.
- `client_invites`: agency members can read/insert/delete for their agency. No public SELECT — invite acceptance goes through the SECURITY DEFINER function so the token never needs anonymous read.
- `client_feedback`:  
  SELECT — agency members of the agency, OR the client_viewer for that client.  
  INSERT — `is_client_viewer_of(auth.uid(), client_id) AND submitted_by = auth.uid()`.  
  No UPDATE/DELETE from client side.
- `profiles`: keep self-read/update; ensure no client can elevate `role`, `agency_id`, or `client_id` via update — use a `BEFORE UPDATE` trigger that resets these columns to OLD values when the caller is not a SaaS admin.

**Cleanup**

- Drop the old `invites` table (replaced by `client_invites`) — only if it's empty; otherwise leave it untouched and just stop using it in code.

---

## 2. Routing & guards (`src/App.tsx`)

Replace the `/app` route subtree with three areas:

```text
/                  → public landing (Index)
/auth              → Auth (signup/login). If logged in, redirect by role.
/accept-invite     → token handler (public; prompts auth if needed)
/agency            → AgencyLayout (sidebar + outlet)
  /agency             → Dashboard (client list summary)
  /agency/clients     → Clients list (CRUD + invite)
  /agency/clients/:id → Client profile (details, client users, invites, feedback)
/client            → ClientPortal (single page, no sidebar)
*                  → NotFound
```

**`<RoleRoute allow={['agency_owner','agency_team']}>`** wrapper:
- Wait for `AuthContext` + a new `useUserRole()` hook to resolve.
- If not logged in → `/auth`.
- If role not in `allow`:
  - `client_viewer` → `/client`
  - `agency_owner|agency_team` → `/agency`
- Otherwise render children.

`/auth` → if already authed, redirect by role.

`Index.tsx` "Sign in" buttons keep going to `/auth`. Remove the now-broken `/app` link from `Dashboard.tsx`.

---

## 3. Auth + role context

Replace `AgencyContext` with a simpler `UserContext` that exposes:
- `user`, `session`, `loading` (from existing `AuthContext`)
- `profile` (with `role`, `agency_id`, `client_id`)
- `agency` (single row joined via `profile.agency_id` for agency users)
- `client` (single row for client viewers)
- `refresh()`

Loading rule: render nothing protected until `loading === false`. This is the single source of truth for guards and prevents the race that's currently breaking redirects.

The existing `handle_new_user` trigger already auto-creates an agency + `agency_members` row + `profiles` row on signup, so `agency_owner` signup flow needs no extra code. We will update that trigger to also set `profiles.agency_id` and `profiles.role = 'agency_owner'`.

---

## 4. Pages to build

**`/auth`** — keep current Auth.tsx, but redirect by role on success (`agency_*` → `/agency`, `client_viewer` → `/client`). The signup form stays as-is (becomes an agency owner). Client viewers only enter the system through `/accept-invite`.

**`/agency` (AgencyLayout + Dashboard)** — sidebar with: Dashboard, Clients. Header with agency name + sign out. Dashboard shows client count + recent clients (kept from current `Dashboard.tsx`, paths updated).

**`/agency/clients`** — kept from current `Clients.tsx`, paths updated, "Open" button added that navigates to `/agency/clients/:id`.

**`/agency/clients/:id` (new `ClientProfile.tsx`)** — tabs:
1. *Details* — editable client fields.
2. *Client users* — list `client_users` for this client + "Invite client" button. Modal asks for email; calls a `create_client_invite` insert and shows the resulting `/accept-invite?token=…` link in a copyable input + a toast. (Email sending is out of scope; we explicitly show the copyable link as the spec allows.)
3. *Invites* — pending/accepted/expired list with revoke (delete row).
4. *Feedback* — list of `client_feedback` rows for this client, newest first, read-only display.

**`/client` (new `ClientPortal.tsx`)** — single page for the assigned client:
- Header: client name, niche, city, agency name.
- Section: monthly objectives placeholder (static "Coming soon" card).
- Section: content awaiting approval placeholder (static empty state).
- Section: latest reports placeholder (static empty state).
- Section: **Feedback + Business Impact form** (single combined form, exactly the fields listed in the spec). On submit → insert into `client_feedback` with `agency_id`, `client_id`, `submitted_by = auth.uid()`. Toast success, reset form. Below the form: "Your previous submissions" list of the user's own past entries.

**`/accept-invite`** — reads `?token=` from the URL.
- If not logged in: show "Create account or sign in to accept this invite from <agency>" with email pre-filled (read non-sensitive invite info via the SECURITY DEFINER `get_invite_preview(token)` function, which returns just agency name + client name + email if pending).
- After auth: call `accept_client_invite(token)` RPC. On success → refresh profile → `navigate('/client')`. On failure (expired/invalid) → error message + link back to `/auth`.

---

## 5. Files

**Create**
- `supabase/migrations/<ts>_multirole_access.sql`
- `src/contexts/UserContext.tsx`
- `src/components/RoleRoute.tsx`
- `src/components/AgencyLayout.tsx`
- `src/pages/agency/AgencyDashboard.tsx` (moved from current Dashboard)
- `src/pages/agency/Clients.tsx` (moved + updated paths)
- `src/pages/agency/ClientProfile.tsx`
- `src/pages/agency/InviteClientDialog.tsx`
- `src/pages/client/ClientPortal.tsx`
- `src/pages/AcceptInvite.tsx`

**Edit**
- `src/App.tsx` — new route tree, drop AgencyProvider, add UserProvider.
- `src/pages/Auth.tsx` — role-based post-login redirect.
- `src/pages/Onboarding.tsx` — delete (auto-agency on signup makes it dead).
- `src/components/ProtectedRoute.tsx` — replaced by `RoleRoute`.
- `src/pages/Index.tsx` — leave landing intact; just ensure CTAs go to `/auth`.

**Delete**
- `src/contexts/AgencyContext.tsx`
- `src/components/AppLayout.tsx` (replaced by `AgencyLayout`)
- `src/pages/Onboarding.tsx`
- `src/pages/Dashboard.tsx` (logic moved)
- `src/pages/Clients.tsx` (logic moved)

---

## 6. Test plan (run after build)

I'll walk through these manually in the preview before declaring done:

**Agency flow**
1. Sign up `owner1@test.com` → lands on `/agency` with auto-created agency.
2. Add client "Bistro X" → appears, persists across refresh.
3. Open client → Invite client `viewer1@test.com` → invite row created, token link shown.

**Client flow**
4. Open invite link in incognito → prompted to sign up.
5. Sign up `viewer1@test.com` → invite auto-accepted → redirected to `/client` showing only Bistro X.
6. Submit feedback form → success → row visible to `owner1` in client profile → Feedback tab.

**Security**
7. As `viewer1`, manually navigate to `/agency` → redirected to `/client`.
8. As `viewer1`, attempt `supabase.from('clients').select('*')` in console → returns only Bistro X.
9. Sign up `owner2@test.com` (separate agency) → cannot see Bistro X or `viewer1`'s feedback.
10. Refresh on every page after each action — session and data persist.

If any of those fail, I fix and re-test before stopping.

---

## Out of scope (explicitly not built)

AI reports, Stripe/billing, content calendar, documents library, advanced analytics, niche dashboards, SaaS admin panel, email sending for invites (copyable link only).
