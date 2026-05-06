# Module 6 — AI Next Month Strategy

A monthly strategy generator that turns prior-month data (reports, content, goals, business impact, feedback, health, risk, competitors, swipe file, niche) into a structured strategy document the agency can edit, approve, send to the client, and convert into tasks + calendar drafts.

## Database (single migration)

`monthly_strategies`
- `id uuid pk`, `agency_id uuid`, `client_id uuid`
- `month int`, `year int` (target month — the upcoming one)
- `based_on_report_id uuid` nullable (FK reports.id)
- `strategy_title text`, `executive_summary text`
- jsonb columns (structured arrays/objects so we can edit + render):
  - `key_insights jsonb default '[]'`
  - `what_worked jsonb default '[]'`
  - `what_did_not_work jsonb default '[]'`
  - `content_to_repeat jsonb default '[]'`
  - `content_to_stop jsonb default '[]'`
  - `new_tests jsonb default '[]'`
  - `recommended_hooks jsonb default '[]'`
  - `recommended_content_formats jsonb default '[]'`
  - `recommended_campaigns jsonb default '[]'`
  - `suggested_calendar_plan jsonb default '{}'` (e.g. `{ posts_per_week, reels, stories, carousels, campaigns, key_dates: [] }`)
  - `business_focus jsonb default '[]'`
  - `risks jsonb default '[]'`
  - `action_items jsonb default '[]'` (array of `{ title, description?, priority, owner? }`)
  - `missing_data jsonb default '[]'` — explicit list of inputs not available
- `status text` check `(draft|generated|reviewed|approved|sent_to_client)` default `draft`
- `sent_to_client_at timestamptz`, `created_by uuid`, timestamps + `tg_set_updated_at` trigger
- Unique `(client_id, year, month)`

RLS:
- Agency members: full CRUD.
- Client viewers: SELECT only when `status = 'sent_to_client'` AND `is_client_viewer_of(auth.uid(), client_id)`.

## Edge function

`generate-monthly-strategy` (Lovable AI Gateway, `google/gemini-3-flash-preview`, tool-calling for structured output)
Inputs: `client_id`, `year`, `month`.
Workflow:
1. Server pulls a comprehensive context bundle for the previous month: latest `reports`, `monthly_goals`, `content_posts` + ordering (top/bottom by available signals), `business_impact_entries`, `client_feedback`, latest `client_health_scores`, active `client_risk_alerts`, latest `competitor_observations`, recent `swipe_files` for client/niche.
2. Builds a system prompt: Romanian, concrete, no invented numbers — only reference data present; missing items must be listed in `missing_data`.
3. Calls AI with a tool schema mirroring the strategy fields above.
4. Upserts a `monthly_strategies` row (status `generated`).

Returns the saved row id.

## Frontend

### Lib
`src/lib/strategies.ts`
- Types + helpers: `STRATEGY_STATUS_META`, fetch/list/get, `generateStrategy(clientId, year, month)`, `updateStrategy(id, patch)`, `setStrategyStatus(id, status)`, `createTasksFromStrategy(strategy)`, `createDraftsFromStrategy(strategy)`.
- `createTasksFromStrategy`: inserts one row per `action_items[i]` into `tasks` (agency_id, client_id, title, description, priority, status `todo`, task_type `strategy`).
- `createDraftsFromStrategy`: for each entry in `recommended_hooks`/`recommended_content_formats`, inserts `content_posts` rows with `status='draft'`, populated `hook`, `format`, `content_type`, scheduled across the target month based on `suggested_calendar_plan.posts_per_week`.
- `exportStrategyPdf(strategy, client)`: client-side PDF using `jspdf` (already a common dep — verify; otherwise use a printable view + `window.print()` — fall back if jspdf not installed). Plan: implement using a printable HTML route + `window.print()` to avoid new deps.

### Pages / components
- `src/pages/agency/Strategies.tsx` — `/agency/strategies` list across all clients with filters (client, month, status), KPIs (drafts, generated, approved, sent), "New strategy" button.
- `src/pages/agency/StrategyDetail.tsx` — `/agency/strategies/:id` rich editor:
  - Header: title, client, target month, status badge, action buttons.
  - Sections (each a card with editable list/textarea):
    - Executive summary, Main focus, Key insights, What worked, What didn't, Content to repeat/stop, New tests, Hooks, Formats, Campaigns, Calendar plan, Action items, Risks, Missing data.
  - Action toolbar:
    - **Generate Next Month Strategy** (re-run AI, prompts confirm overwrite)
    - **Create Tasks From Strategy**
    - **Create Calendar From Strategy**
    - **Send to Client** (sets status `sent_to_client`, sends notification)
    - **Export PDF** (opens `/agency/strategies/:id/print` and triggers `window.print()`)
- `src/pages/agency/StrategyPrint.tsx` — minimal print-friendly view.
- `src/components/strategies/GenerateStrategyDialog.tsx` — pick client + month/year, calls edge function.
- `src/components/strategies/ClientStrategyTab.tsx` — read-only timeline shown inside Client Portal `Strategy` tab when any strategy is `sent_to_client`.

Integration with `ClientProfile.tsx`: add a "Strategy" tab listing strategies for that client + "Generate next month".

Sidebar: add `Strategies` (icon `Lightbulb`) to `AgencyLayout.tsx` and route in `App.tsx`.

Client Portal: add a `Strategy` tab using `ClientStrategyTab`. Only renders strategies with status `sent_to_client`.

### Notifications
On `setStrategyStatus(id, "sent_to_client")`: insert one notification per active client_user (`type='strategy_sent'`, `link='/client/portal?tab=strategy'`).

## Permissions summary
- Agency members: full CRUD on strategies; can generate, edit, approve, send.
- Client viewer: read-only and only for `sent_to_client` strategies of their own client.

## Files

New:
- `supabase/migrations/<ts>_monthly_strategies.sql`
- `supabase/functions/generate-monthly-strategy/index.ts`
- `src/lib/strategies.ts`
- `src/pages/agency/Strategies.tsx`
- `src/pages/agency/StrategyDetail.tsx`
- `src/pages/agency/StrategyPrint.tsx`
- `src/components/strategies/GenerateStrategyDialog.tsx`
- `src/components/strategies/ClientStrategyTab.tsx`

Edited:
- `src/App.tsx` (3 routes)
- `src/components/AgencyLayout.tsx` (nav item)
- `src/pages/agency/ClientProfile.tsx` (add Strategy tab)
- `src/pages/client/ClientPortal.tsx` (add Strategy tab)

## Out of scope (v1)
- Server-rendered PDF (we use the browser print pipeline; fast and dependency-free).
- Versioning/diffing of regenerated strategies (overwrite with confirmation).
