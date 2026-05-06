# Continuous Improvement Engine

A controlled 7-step loop that turns real app data + feedback into reviewed, human-approved improvements. No auto-training: all impactful actions go through the existing `ai_action_requests` approval queue.

## 1. Database

### Type
- `cie_status`: `collecting | evaluating | awaiting_review | completed | failed`

### Table `continuous_improvement_runs`
`id`, `agency_id` (nullable — null = platform run), `run_type` (`weekly_agency` | `monthly_strategy` | `manual` | `platform`), `input_summary` jsonb, `detected_patterns` jsonb[], `recommended_improvements` jsonb[], `approved_improvements` jsonb[], `rejected_improvements` jsonb[], `performance_before` jsonb, `performance_after` jsonb, `status` cie_status, `triggered_by` uuid, `created_at`, `updated_at`. Trigger `tg_set_updated_at`.

### RLS
- Saas admin: full access (incl. platform-wide rows where `agency_id` is null).
- Agency members: read/insert/update only for their own agency.
- Client viewers: no access.

## 2. Edge function `continuous-improvement-engine`

Body: `{ run_type, agency_id?, since_days?, measure_run_id? }`. Auth required; agency members must belong to `agency_id`.

Pipeline:

1. **Collect** — pulls last N days from: `analytics_entries`, `content_metrics`, `monthly_reports`, `monthly_strategies`, `ai_outputs`, `ai_feedback`, `post_approvals`, `tasks`, `client_health_scores`, `client_risk_alerts`, `swipe_files`, `competitor_observations`, `documents`. Each table read is wrapped in a safe try (degrades gracefully if a table is missing or empty).
2. **Evaluate** — computes per-feature feedback aggregates, useful/not-useful counts, avg rating, strategy approval/rejection counts, AI-sourced task completion rate, and per-`prompt_version_id` success/missing/blocked stats from `ai_outputs`.
3. **Detect Patterns** — heuristics over the evaluation: `weak_prompt_version` (success <60%), `frequent_missing_data` (>40%), `ai_feedback_negative`, `strategy_rejection_high`, `clients_at_risk`, `winning_niches` (top swipe niches by avg performance), `ai_tasks_low_completion`.
4. **Recommend Improvements** — heuristic mapping pattern → action (e.g. `weak_prompt_version` → `update_prompt_version` (high risk); `frequent_missing_data` → `create_task` to collect data; `winning_niches` → `create_content_idea`; `ai_feedback_negative` → `create_lovable_prompt`; etc.). Optional Lovable AI enrichment via `google/gemini-2.5-flash` with strict JSON output (no invention — only patterns are sent in).
5. **Human Review** — every recommendation is inserted into `ai_action_requests` with appropriate `risk_level`, the existing risk-vs-role matrix in `ai-action-decide` enforces who can approve.
6. **Implement** — already handled by the existing `ai-action-decide` execute step (creates tasks, flips prompts, queues lovable prompts, creates memory items, etc.).
7. **Measure Again** — calling the function with `measure_run_id` re-runs Collect+Evaluate over the same window and stores `performance_after` on the original run. UI compares before vs after.

The run row is updated through `collecting → evaluating → awaiting_review → completed (after measure)`. Any throw sets `failed`.

## 3. Cron jobs

Add scheduled invocations using `pg_cron` + `pg_net` (run via the insert tool, not migration, since they include the project URL/anon key):
- `cie-weekly-agencies`: every Monday 06:00 UTC, fan-out to each agency_id (a tiny SQL function loops over `agencies` and calls the function per agency).
- `cie-monthly-strategy`: 1st of each month 06:30 UTC, run with `run_type='monthly_strategy'` and `since_days=30` per agency.
- `cie-platform-weekly`: Sunday 22:00 UTC, `agency_id=null`, `run_type='platform'` (admin overview).

## 4. Frontend

### `src/lib/continuousImprovement.ts`
Helpers: `runEngine({ run_type, agency_id?, since_days? })`, `measureRunAgain(run_id)`, `listRuns({ agency_id? })`, `getRun(run_id)`.

### `src/pages/admin/ContinuousImprovement.tsx`  (route `/agency/admin/continuous-improvement`)
- "Run Improvement Engine" button (admin) with run_type + scope (all agencies / specific agency) + since_days.
- Table of recent runs: status badge, run_type, agency, recommendations count, performance delta (when after exists).
- Click row → detail drawer showing input_summary counts, detected patterns, recommendations (with "View in approvals" link to existing AI Actions page), and a "Measure again" button that calls the function with `measure_run_id`.
- Add nav link in `AgencyLayout.tsx` admin block.

## 5. Files
- `supabase/migrations/<ts>_continuous_improvement_runs.sql` (table + RLS)
- `supabase/functions/continuous-improvement-engine/index.ts`
- Insert-tool SQL to register the 3 cron jobs
- `src/lib/continuousImprovement.ts`
- `src/pages/admin/ContinuousImprovement.tsx`
- edit `src/App.tsx` (add route) and `src/components/AgencyLayout.tsx` (nav link)

## 6. Guarantees
- No auto-changes: every recommendation is queued in the existing approval system; the engine itself never flips prompts, sends emails, or mutates client data.
- Source-cited evaluation: all metrics derive from real tables; missing tables are reported as zero counts in `input_summary` rather than hallucinated.
- RLS prevents agencies from seeing each other's runs.
