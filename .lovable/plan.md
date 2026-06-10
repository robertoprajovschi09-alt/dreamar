# Approvals — make it fully functional (agency + client)

Goal: connect the existing `content_approvals` + `content_posts` tables to a real, polished flow on both sides. No AI changes. Reuse the soft-UI kit, signal-red brand, light/dark, responsive.

## 1. Canonical data model (cleanup, no new tables)

- Source of truth = `content_approvals.status` ∈ `pending_approval | approved | changes_requested | rejected | expired`.
- Note from client = `feedback`. Legacy `decision`/`comment` are written-through for back-compat but UI reads/writes only `status` + `feedback`.
- On `content_posts`: pick `pending_approval` as the single in-flight status (drop usage of `sent_for_approval` everywhere). `approval_status` mirrors approval status (`pending | approved | changes_requested | rejected`).
- Sync via a DB trigger on `content_approvals` (insert + update) → updates `content_posts.status` + `approval_status`. Removes drift between code paths.

## 2. Migration (`supabase/migrations/<ts>_approvals_wire.sql`)

- Trigger `tg_sync_post_from_approval` (already exists for UPDATE) extended to also fire on INSERT with `status='pending_approval'` → set post status `pending_approval` + approval_status `pending`.
- Replace overly broad `content_approvals_update` policy with two scoped ones:
  - `content_approvals_agency_update` (agency members, full update incl. resending/expiring)
  - `content_approvals_client_respond` (client_viewer): USING `is_client_viewer_of(auth.uid(), client_id) AND status='pending_approval'`, WITH CHECK same client + status ∈ approved/changes_requested/rejected + decided_by = auth.uid().
- SECURITY DEFINER RPC `respond_to_approval(_id uuid, _status text, _feedback text)` — validates client_viewer owns it, updates status/feedback/decided_by/responded_at, lets trigger sync the post. The client uses this RPC (avoids row-level write race + ensures responded_at set server-side).
- Add `content_posts` to `supabase_realtime` publication (or just `content_approvals`) so the agency view live-refreshes.

## 3. Agency side

**Send for approval (already exists in `SendForApprovalDialog` + `Content.tsx`/`Calendar`)**
- Add a guard: require post to have at least a video asset (in `assets` jsonb) OR a script before sending. Show inline error otherwise.
- Expire any previous pending row for that post before inserting (already done).
- Assigned-to: dropdown of `client_users`; default = all active.

**`/agency/approvals` (`src/pages/agency/Approvals.tsx`)**
- KPI cards already wired through `fetchApprovalKpis` — keep, restyle with `MetricCard`/StatusPill, signal-red accent.
- Tabs: Pending / Changes requested / Approved / All (already there). Add "Overdue" filter pill on Pending tab.
- Row: thumbnail or video icon, title, client, platform, requested ago, due badge, StatusPill. Empty/loading/error states standardized.

**Detail dialog (`ApprovalDetailDialog.tsx`)**
- Render a real `<video controls>` player for the first video asset on `content_posts.assets` (look up signed URL via Storage if path is in `agency-files`). Fallback to `thumbnail_url`.
- Show hook, script, caption, scheduled_for, requested_at, responded_at, due_date, latest feedback.
- "Resend for approval" creates a fresh round (already implemented in lib). Add due-date picker on resend.
- Keep AI clarifications panel untouched.

## 4. Client portal side

**`ClientApprovalsTab.tsx`**
- Restyle with soft-UI cards + StatusPill (`pending` amber, `approved` green, `changes_requested` orange, `rejected` red).
- Add `<video controls>` for the post asset (same helper as agency).
- Three actions: Approve / Request changes / Reject. Request changes + Reject open a modal/inline textarea — feedback is required and validated before submit.
- Submit calls the new `respond_to_approval` RPC. On success: toast, optimistic remove from pending list, refetch.
- Loading / empty / error states.

## 5. Shared helpers (`src/lib/approvals.ts`)

- `getPostVideoUrl(post)` — finds first video in `assets` jsonb, returns signed Storage URL when path is in `agency-files`, else passes through public URL.
- `respondToApproval` → swap to `supabase.rpc('respond_to_approval', ...)`.
- `sendForApproval` → require `video_or_script_present(post)`; throws friendly error.
- `fetchApprovalKpis` — unchanged math; add unit test.

## 6. Realtime

- In `Approvals.tsx`, subscribe to `postgres_changes` on `content_approvals` filtered by `agency_id` and refetch on any change. Cleanup on unmount.

## 7. Status pills

Single source `APPROVAL_STATUS_META` mapped to `<StatusPill kind="...">`:
- `pending_approval` → `pending` (amber)
- `approved` → `success` (green)
- `changes_requested` → `warning` (orange)
- `rejected` → `danger` (red)
- `expired` → `muted`

## 8. Tests

- **Unit (`src/lib/__tests__/approvals.test.ts`)**: `fetchApprovalKpis` math (pending, overdue, approvedThisWeek window, avgHours). Pure function with seeded rows.
- **Unit**: status transition map (`canRespond`, `nextPostStatus(approvalStatus)`).
- **E2E (manual script in report)** in test tenant only: create post + video → send → log in as client_viewer → approve / request changes → verify agency KPIs + StatusPill + post.status sync.

## Files touched

```text
supabase/migrations/<ts>_approvals_wire.sql        # trigger, RLS split, RPC, realtime
src/lib/approvals.ts                                # RPC call, video URL helper, guard
src/lib/__tests__/approvals.test.ts                 # NEW
src/pages/agency/Approvals.tsx                      # realtime, restyle, overdue pill
src/components/approvals/ApprovalDetailDialog.tsx   # video player, resend w/ due
src/components/approvals/SendForApprovalDialog.tsx  # asset guard
src/components/approvals/ClientApprovalsTab.tsx     # video player, required-feedback modal, RPC
src/components/ui/status-pill.tsx                   # add `pending` kind if missing
```

## Out of scope

- AI (`approval-clarify`, Gemini, prompts) — untouched.
- Calendar lifecycle rewrite — only the approval-related status field is synced.
- New tables / new buckets.

## Final report (after build)

End-to-end flow walkthrough + which unit tests pass + manual E2E checklist results.
