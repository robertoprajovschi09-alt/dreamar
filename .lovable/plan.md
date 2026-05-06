## Goal

After the client submits Quick Check-In, the system runs an AI pipeline that builds a per-month **Client Dashboard Context**: summary, priorities, KPIs to surface, recommended widgets, missing-data flags, client-friendly insights, and agency-internal notes. Both the structured check-in and the generated context are persisted in two new tables.

## Database changes

### Table `client_checkins`
Structured monthly check-in (1 row per client per year+month).

Columns: `id`, `agency_id`, `client_id`, `client_user_id`, `month` (1–12), `year`, `main_priority`, `priority_custom`, `promoted_focus`, `observed_real_results` (`yes` | `no` | `unknown`), `real_results_data` jsonb, `customer_feedback`, `important_notes`, `satisfaction_score` (1–5), `requested_direction_change`, `direction_change_custom`, `ai_processed` bool default false, `created_at`, `updated_at`. Unique on `(client_id, year, month)`.

RLS:
- Agency members: full access for their own agency rows.
- Client portal users: SELECT + INSERT + UPDATE (only when `client_user_id = auth.uid()`, `is_client_viewer_of(auth.uid(), client_id)`, and `ai_processed = false`).

### Table `client_dashboard_contexts`
AI-generated context (1 row per client per year+month).

Columns: `id`, `agency_id`, `client_id`, `month`, `year`, `generated_summary`, `ai_priorities` jsonb, `recommended_widgets` jsonb, `missing_data` jsonb, `client_friendly_insights` jsonb, `agency_internal_notes`, `confidence_score` numeric(3,2), `generated_by_ai_output_id` uuid, `created_at`, `updated_at`. Unique on `(client_id, year, month)`.

RLS:
- Agency members: full access for their own agency rows.
- Client portal users: SELECT only (cannot insert/update/delete).

Both tables get `tg_set_updated_at` trigger and indexes on `(client_id, year DESC, month DESC)` and `(agency_id, year DESC, month DESC)`.

### Migration of existing check-in writes
`ClientQuickCheckIn` currently writes only to `client_feedback` (with structured payload in `objections`). Update it to **also** insert into `client_checkins` with the explicit columns. `client_feedback` is kept for backward compatibility with existing reports.

## Edge function `client-dashboard-context-generate`

New function that produces and stores the AI context.

Input (POST JSON, JWT verified in code via Supabase auth):
```
{ client_id: uuid, year?: number, month?: number }   // defaults to current month
```

Authorization: caller must be either an active `agency_members` row of the client's agency OR an active `client_users` row for that client. Otherwise 403.

Pipeline (uses service role to read across tables, scoped to the client_id):
1. Load **client** (`clients`), **niche** (label + `client_kpi_schemas`), **platforms** (`client_platforms`).
2. Load **goals** for current and previous month (`monthly_goals`).
3. Load **content calendar** (`content_posts` last 60 days + scheduled next 30).
4. Load **analytics** (`analytics_entries` last 90 days).
5. Load **content_metrics** for the same posts (if table present).
6. Load **monthly_reports** (last 3) and **documents** marked `client_visible`.
7. Load **business_impact_entries** last 90 days.
8. Load **client_feedback** + the new **client_checkins** row for `(year, month)`.
9. Load **competitor_observations** (if any) and **swipe_files** scoped to agency/client.
10. Load **ai_memory** entries for `(agency_id, client_id)` (most recent N).
11. Build a compact, redacted JSON context (cap each section to top-N, strip PII like emails/phones).
12. Call Lovable AI Gateway (`google/gemini-2.5-flash`) with a strict JSON-schema response:
   ```json
   {
     "generated_summary": "string",
     "ai_priorities": [{ "title": "...", "why": "...", "owner": "agency|client" }],
     "recommended_widgets": [{ "key": "...", "title": "...", "props": { ... } }],
     "missing_data": [{ "field": "...", "where_to_fill": "...", "blocks": "summary|kpi|insight" }],
     "client_friendly_insights": [{ "title": "...", "body_plain_language": "...", "tone": "good|neutral|warning" }],
     "agency_internal_notes": "string",
     "confidence_score": 0.0
   }
   ```
   System prompt instructs the model to **never invent metrics** — if a metric is missing, add it to `missing_data` and reference it in insights instead.
13. UPSERT into `client_dashboard_contexts` on `(client_id, year, month)`.
14. UPDATE `client_checkins.ai_processed = true` for that period.
15. Return `{ context }`.

CORS handled, zod input validation, timeout-safe (14s soft cap), errors return 4xx with structured messages.

## Client wiring

1. **`ClientQuickCheckIn` submit**: after the existing `client_feedback` insert, also insert into `client_checkins` (mapping check-in payload 1:1). Then `await supabase.functions.invoke("client-dashboard-context-generate", { body: { client_id } })` (fire-and-forget UI, but we await to flip into the new dashboard context once it lands).
2. **`ClientDashboard`**: read `client_dashboard_contexts` for the current month first; fall back to the existing `clients.ai_strategy_base.dashboard_personalization` for legacy clients. Render:
   - Hero = `generated_summary`
   - Priority KPI cards = derived from `recommended_widgets[*].key` mapped against existing aggregates (impact + analytics) — same `resolveKpiValue` helper as today.
   - "AI insights" section = `client_friendly_insights`.
   - "What we're missing" section = `missing_data` (one chip per item; clicking deep-links to the right form).
3. **Agency `ClientProfile` Overview**: new `<DashboardContextCard />` showing `generated_summary`, `ai_priorities`, `agency_internal_notes`, and a "Regenerate" button calling the same edge function.

## Files

**New**
- `supabase/functions/client-dashboard-context-generate/index.ts`
- `src/components/client/DashboardContextCard.tsx` (agency-side)

**Edit**
- `src/components/client/ClientQuickCheckIn.tsx` — also insert into `client_checkins`, then invoke the edge function
- `src/components/client/ClientDashboard.tsx` — read from `client_dashboard_contexts` first
- `src/pages/agency/ClientProfile.tsx` — mount `<DashboardContextCard />`
- `src/integrations/supabase/types.ts` — auto-regenerated after migration

## Multi-tenant & security

- New tables enforce tenant isolation via `is_member_of` / `is_client_viewer_of` (existing security definer helpers).
- Client portal users can never write to `client_dashboard_contexts` and can only update their own check-in before it's processed.
- Edge function double-checks caller membership against the requested client before reading anything; service role is used only for the read fan-out.
- AI prompt strictly forbids inventing data; missing inputs surface in `missing_data` instead of being hallucinated.
- All inputs validated with zod; outputs stored in jsonb columns with size caps (truncate any field over 8KB before persist).

## Out of scope

- Backfilling historical months (only generate for the current period on submit + on demand).
- Email/Slack notifications when a new context is generated.
- Showing version history of contexts (we keep one row per period; regenerate overwrites).
