# AI Website/App Maintainer — Plan

Extends the existing minimal `ai-maintainer-scan` (which only triages error logs into an `ai_action`) into a full module: structured audits, prioritized improvement suggestions with Lovable-ready prompts, and a maintenance task queue. Approval-gated; no destructive AI actions.

## 1. Database (one migration)

Three new tables, all RLS-enabled. `agency_id` nullable so SaaS Admin can run global audits.

**`ai_website_audits`**
- `id uuid pk`, `agency_id uuid null → agencies`, `audit_type text` (ux | copy | dashboard | onboarding | pricing | client_portal | agency_dashboard | conversion | full)
- `page_url text`, `page_name text`
- `findings jsonb` (array of `{problem, evidence, severity, area}`)
- `severity text` (low | medium | high | critical)
- `ai_summary text`, `recommended_actions jsonb`
- `status text` default `'completed'` (running | completed | failed)
- `created_by uuid`, `created_at`, `updated_at` (trigger)

**`ai_improvement_suggestions`**
- `id`, `agency_id null`, `source_type text` (audit | feedback | error_log | manual | scan), `source_id uuid null`
- `title text`, `description text`, `category text` (ux | copy | conversion | onboarding | dashboard | design | bug | performance | feature_cleanup)
- `priority text` (low | medium | high | critical)
- `impact_score int 1-10`, `effort_score int 1-10`
- `ai_reasoning text` — includes "why it matters", "risk if unresolved", "data used"
- `suggested_prompt_for_lovable text` — copy-paste-ready prompt
- `status text` default `'new'` (new | reviewed | approved | rejected | in_progress | implemented)
- `approved_by uuid null`, `approved_at`, `implemented_at`, `created_at`, `updated_at`

**`ai_maintenance_tasks`**
- `id`, `agency_id null`, `suggestion_id uuid → ai_improvement_suggestions`
- `title`, `description`, `task_type text` (fix | improvement | audit | cleanup | content)
- `priority text`, `status text` default `'todo'` (todo | in_progress | done | blocked)
- `assigned_to uuid null`, `due_date timestamptz null`, timestamps

**RLS**
- SaaS Admin (`is_saas_admin`): full access to all rows including `agency_id IS NULL`.
- Agency Owner/Admin: SELECT/UPDATE/INSERT rows where `agency_id = their agency` (via `is_owner_of`).
- INSERT only allowed via service role (edge functions) or owner. Approval columns (`approved_by`, `approved_at`, `status='approved'`) settable only by owner/admin.
- No DELETE policy → AI cannot delete.

`updated_at` trigger using existing `tg_set_updated_at()`.

## 2. Edge functions (two new + extend one)

**`ai-run-audit`** (new)
- Input: `{ agency_id?, audit_type, page_name?, page_url?, context? }`
- Auth: SaaS Admin (any agency_id incl. null) or Agency Owner (their agency only).
- Loads relevant context: recent `ai_audit_events`, recent `ai_feedback` (👎), `content_posts` counts, recent errors. For agency-scoped audits, pulls per-agency data.
- Calls OpenAI via existing `_shared/openai.ts` with system prompt per `audit_type`. Forces JSON output: `{summary, severity, findings:[{problem,evidence,severity,area}], recommended_actions:[…], suggestions:[{title,description,category,priority,impact_score,effort_score,ai_reasoning,suggested_prompt_for_lovable}]}`.
- Runs `runSafety` on output. Logs run via `logRun`.
- Inserts `ai_website_audits` row + N rows in `ai_improvement_suggestions` (status `new`, source_type `audit`, source_id = audit id).
- Returns `{audit_id, suggestions_count}`.

**`ai-generate-fix-prompt`** (new)
- Input: `{ suggestion_id }`
- Auth: SaaS Admin or owner of the suggestion's agency.
- Reads suggestion, asks OpenAI to produce a refined Lovable-ready prompt (with file hints, acceptance criteria), updates `suggested_prompt_for_lovable`.

**`ai-maintainer-scan`** (extend existing)
- Currently writes to `ai_actions`. Update so output is also persisted as an `ai_improvement_suggestions` row with `source_type='scan'`. Keep approval flow via existing `ai_actions`.

All functions: `verify_jwt = false` in code (default), validate user via `requireUser`, log via `logRun`, run `runSafety`. No DB writes outside the three tables + logging.

## 3. Frontend — `/admin/ai-maintainer` rebuilt

Replaces current minimal page. Tabs:

**Overview**
- Cards: Last audit (date, type, severity), Critical issues count, New suggestions, Approved suggestions, Tasks open, Estimated impact (sum of `impact_score` of approved-not-implemented).
- Buttons: **Run AI Audit** (opens dialog → choose `audit_type` + optional page + optional agency for SaaS Admin), **View Suggestions**, **View Tasks**.

**Audits tab**
- Table: type, page, severity, summary, date. Row click → drawer with `findings`, `recommended_actions`, list of generated suggestions.

**Suggestions tab**
- Filter: status, category, priority. Card per suggestion shows: title, description, impact/effort badges, AI reasoning, **risk if unresolved**, **data used**, code-block with `suggested_prompt_for_lovable` + Copy button.
- Actions per suggestion: **Approve**, **Reject**, **Generate Lovable Fix Prompt** (calls `ai-generate-fix-prompt`), **Create Task** (creates `ai_maintenance_tasks` row, status=todo), **Mark as Implemented**.
- Approval button only visible to Agency Owner / SaaS Admin (UI gate + RLS enforcement).

**Tasks tab**
- Table grouped by status (todo / in_progress / done / blocked). Inline status change, assignee select (agency members), due date.

## 4. Navigation

`AgencyLayout.tsx` — add **AI Maintainer** under Admin section (already present, just expand). For non-SaaS-admin agency owners, also surface a scoped link `/agency/ai-maintainer` (reuses same page, agency-scoped).

`App.tsx` — register the route (already exists for admin; add agency-scoped route).

## 5. Components

- `src/components/admin/maintainer/RunAuditDialog.tsx`
- `src/components/admin/maintainer/SuggestionCard.tsx` (with Copy-prompt, Approve, Reject, Create Task, Generate Fix Prompt, Mark Implemented)
- `src/components/admin/maintainer/AuditDetailDrawer.tsx`
- `src/components/admin/maintainer/TaskRow.tsx`

## 6. Safety guarantees (enforced)

- No DELETE policies on any of the three tables.
- Edge functions only INSERT/UPDATE the three maintainer tables + `ai_prompt_runs` + `ai_audit_events`. Never touch `subscriptions`, `plans`, `agency_members`, `profiles.role`, `profiles.is_saas_admin`, `content_posts.status`, or auth tables.
- Status `approved` / `implemented` requires authenticated owner/admin (RLS update policy checks `is_owner_of` or `is_saas_admin`).
- All AI output passes existing `runSafety` guardrails before persistence.
- "Generate Lovable Fix Prompt" produces text only — never invokes Lovable APIs or modifies code.

## 7. Out of scope

- Auto-execution of suggestions (always review-only).
- Cron scheduling (manual "Run AI Audit" only; cron can be added later).
- Public-facing audit reports to clients.

## Files

**Created**
- `supabase/migrations/<ts>_ai_website_maintainer.sql`
- `supabase/functions/ai-run-audit/index.ts`
- `supabase/functions/ai-generate-fix-prompt/index.ts`
- `src/components/admin/maintainer/RunAuditDialog.tsx`
- `src/components/admin/maintainer/SuggestionCard.tsx`
- `src/components/admin/maintainer/AuditDetailDrawer.tsx`
- `src/components/admin/maintainer/TaskRow.tsx`

**Edited**
- `src/pages/admin/AiMaintainer.tsx` (full rebuild with tabs)
- `supabase/functions/ai-maintainer-scan/index.ts` (also write suggestion row)
- `src/components/AgencyLayout.tsx` (nav link)
- `src/App.tsx` (route)
