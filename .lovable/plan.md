# Module 5 — Client Approval Flow

A premium, focused approval lifecycle integrated with Content Calendar, with a dedicated Approvals dashboard for the agency, an upgraded client experience, and AI-assisted clarification when feedback is vague.

## What exists today
- `content_posts` with enum `post_status`: idea, script, filming, editing, sent_for_approval, approved, scheduled, published, analyzed.
- `content_posts.approval_status` text column (pending / approved / changes_requested).
- `content_approvals` table (id, agency_id, client_id, content_post_id, decision, comment, decided_by). RLS already supports both agency members and client viewers.
- A minimal `ApprovalsTab` inside `ClientPortal.tsx` that lists `sent_for_approval` posts and writes a `content_approvals` row.

We will keep the existing table and extend it to match the spec, expand the post lifecycle, and build the missing agency-side dashboard plus an upgraded client UI.

## Database changes (one migration)

1. Extend `post_status` enum (preserve existing values, no breaking change):
   - add `draft`, `internal_review`, `ready_for_client`, `pending_approval`, `changes_requested`, `posted`
   - keep legacy values (`sent_for_approval` etc.) for back-compat; new code targets the new ones. `sent_for_approval` will be treated as alias of `pending_approval` in the UI helpers.

2. Extend `content_approvals` to match spec:
   - add `requested_by uuid`, `assigned_to_client_user uuid` nullable
   - add `status text` enum-like check: `not_sent | pending_approval | approved | changes_requested | rejected | expired` (default `pending_approval`)
   - add `feedback text` (mirror of comment for new code; keep `comment` for back-compat)
   - add `requested_at timestamptz default now()`, `responded_at timestamptz`, `due_date timestamptz`
   - add unique partial index `(content_post_id) where status = 'pending_approval'` to enforce one open request per post
   - trigger `tg_set_updated_at` on update

3. RLS additions on `content_approvals`:
   - agency members: full CRUD (existing).
   - client viewers: SELECT + UPDATE only of their own client's rows where `status = 'pending_approval'` (to set status/feedback/responded_at). They cannot insert new approval requests.

4. Trigger: when an approval row transitions to `approved` / `changes_requested` / `rejected`, mirror the change on the related `content_posts` (`status` and `approval_status`) and stamp `responded_at = now()`. Expiry handled via a lightweight scheduled edge function (out of scope for v1 — we'll mark expired in the read query when `due_date < now()` and status is still pending).

5. `notifications` table already exists for the app (verified earlier in project). Add four notification types via inserts at the call sites:
   - `approval_requested` (agency → client user)
   - `client_approved` (client → agency owner + assignees)
   - `client_changes_requested` (client → agency owner + assignees)
   - `approval_overdue` (system → agency)

   If the `notifications` table is not yet present, the migration also creates a minimal `notifications` table (id, user_id, agency_id, type, title, body, link, read_at, created_at) with RLS `user_id = auth.uid()`. We will check during implementation and only create if missing.

## Edge function

`approval-clarify` (Lovable AI Gateway, `google/gemini-3-flash-preview`):
- Input: post (title, hook, caption, platform, content_type) + raw client feedback text.
- Output: 3–5 short clarifying questions (Romanian by default, fallback English) to send back to the client, plus a one-line "interpretation" hint for the agency.
- Used by the agency Approvals dashboard via a "Suggest clarifying questions" button when feedback is short / vague (< 25 chars or detected as non-actionable).

## Frontend

### New lib
`src/lib/approvals.ts`
- Types: `ApprovalStatus`, `PostStatus`, helpers `postStatusMeta`, `approvalStatusMeta`, `isPendingForClient(post)`.
- API helpers:
  - `sendForApproval(post, { dueDate?, assignedToClientUser? })` — sets post.status to `pending_approval`, post.approval_status `pending`, inserts `content_approvals` row with `status=pending_approval, requested_by=auth.uid()`, fires notification.
  - `respondToApproval(approvalId, decision, feedback)` — client side; updates approval row.
  - `resendForApproval(post)` — after agency edits, creates a new approval row (closing prior changes_requested one).
  - `aiSuggestClarifications(approvalId)` — invokes edge function.

### Agency
`src/pages/agency/Approvals.tsx` — new route `/agency/approvals` (added to `App.tsx` + `AgencyLayout.tsx` sidebar with `ClipboardCheck` icon).
- KPI strip: Pending approvals · Overdue · Approved this week · Changes requested · Avg. approval time (hrs).
- Tabs: `Pending`, `Changes requested`, `Approved`, `All`.
- Table/grid with: thumbnail, title, client, platform, requested_at, due_date (with overdue badge), latest feedback excerpt.
- Row click → `ApprovalDetailDialog` showing full post + feedback timeline + "Suggest clarifying questions" (AI) + "Edit post" (deep-links to existing Content editor) + "Resend for approval".

`src/components/content/SendForApprovalDialog.tsx`
- Triggered from Content Calendar / Content list when a post is `ready_for_client`.
- Fields: due date (default +3 days), assigned client user (dropdown of `client_users` for that client), optional message.
- Calls `sendForApproval`.

Edits to `src/pages/agency/Content.tsx` and `src/pages/agency/Calendar.tsx`:
- New status pill colors via `postStatusMeta`.
- Status quick-actions: `Mark as Ready for Client`, `Send for Approval` (opens dialog above), shown contextually.
- Show approval state badge (Pending / Changes requested / Approved) on each card.

### Client portal
Replace the inline `ApprovalsTab` in `src/pages/client/ClientPortal.tsx` with a polished component `src/components/approvals/ClientApprovalsTab.tsx`:
- Hero KPI: "X items waiting for you".
- Large card per post: media preview (thumbnail / video iframe if `post_url`), platform + planned posting date, hook, caption, script (collapsible), history of prior decisions.
- Primary actions: big `Approve` (accent), `Request Changes` (outline), `Looks good 👍` quick-action that approves with a default comment.
- Comment box with placeholder "Tell the agency what to adjust…"; required when choosing "Request Changes".
- After action: optimistic update + toast.

### Notifications
- Use existing `notifications` table (or freshly created in migration). Hook calls in `sendForApproval`, `respondToApproval`. The bell already in `AgencyLayout` / `ClientPortal` will pick them up automatically.

## Permissions summary
- Client User: only sees approvals for their own client (`is_client_viewer_of`); can SELECT and UPDATE pending rows; cannot insert.
- Agency Team Member: sees approvals only for clients where they're an agency member (existing `is_member_of`).
- Saas admin: all.

## Files

New:
- `supabase/migrations/<ts>_approval_flow.sql`
- `supabase/functions/approval-clarify/index.ts`
- `src/lib/approvals.ts`
- `src/pages/agency/Approvals.tsx`
- `src/components/approvals/ApprovalDetailDialog.tsx`
- `src/components/approvals/SendForApprovalDialog.tsx`
- `src/components/approvals/ClientApprovalsTab.tsx`

Edited:
- `src/App.tsx` (route)
- `src/components/AgencyLayout.tsx` (nav item)
- `src/pages/agency/Content.tsx` (status actions, badges)
- `src/pages/agency/Calendar.tsx` (status badges, send action)
- `src/pages/client/ClientPortal.tsx` (use new `ClientApprovalsTab`)
- `src/lib/content.ts` (statusMeta extended for new statuses)

## Out of scope (v1)
- Cron-based auto-expiry (we surface "overdue" via query; full expiry job can be added later).
- Email notifications (in-app only).
