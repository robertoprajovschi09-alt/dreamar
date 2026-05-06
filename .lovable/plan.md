# Module Integration & Coherence Pass

Goal: ship a coherent, end-to-end experience across the 7 premium modules (Health Score, Risk Detector, Swipe File, Competitors, Approvals, Strategies, Analytics) that already exist in the codebase, with the exact navigation, dashboards, and tabs you specified. No new tables — schema is already in place and RLS is correct (verified below).

## 1. RLS & multi-tenancy verification (no migrations expected)

Audit pass — confirm each module table has the standard quartet (already present in schema):
- `is_member_of(auth.uid(), agency_id)` for agency CRUD
- `is_client_viewer_of(auth.uid(), client_id)` for read where client must see
- `is_saas_admin(auth.uid())` for super-admin read everywhere

Already correct: `client_health_scores`, `client_risk_alerts` (agency-only, not exposed to clients ✓), `competitor_observations` (client read only when `visible_to_client=true` ✓), `competitors` (agency-only ✓), `content_approvals` (agency + client viewer ✓), `monthly_strategies` (client read only when `status='sent_to_client'` ✓), `analytics_entries` & `content_metrics` (client read-only ✓).

Action: only add a new migration if the audit (a single `supabase--linter` + targeted `read_query`s) finds a gap. Expectation: zero migrations.

## 2. Navigation refactor (`src/components/AgencyLayout.tsx`)

Replace the current `nav` array with the exact ordered list:

```
Dashboard · Clients · Calendar · Content · Approvals · Analytics · Campaigns ·
Reports · Strategies · Documents · Tasks · Swipe File · Competitors ·
AI Assistant · Team · Billing · Settings
```

- Drop standalone `Performance` and `Risk` from the sidebar (Risk surfaces inside Dashboard + Clients; Performance is replaced by Analytics).
- Add a new top-level `/agency/competitors` page (agency-wide competitor library — currently only exists per-client).
- Add placeholders routes for `Team`, `Billing`, `Settings` that render a clean "Coming soon" premium card if no implementation exists yet (keeps nav coherent without faking data).

For the **Client Portal** (`src/pages/client/ClientPortal.tsx`), replace tabs with the exact list:

```
Overview · Calendar · Approvals · Reports · Results · Objectives · Documents · Feedback
```

- "Results" = read-only `ClientPortalAnalyticsTab` (renamed label).
- "Objectives" = read-only monthly goals view.
- Remove `Health`, `Strategy`, `Market Insights` from client tabs (Strategy still accessible inline only when `sent_to_client`, surfaced inside Overview as a card link; Health Score and Market Insights are agency-internal per your spec).

## 3. Client Detail tabs (`src/pages/agency/ClientProfile.tsx`)

Reduce to the exact ordered set:

```
Overview · Content · Calendar · Analytics · Goals · Reports · Strategy ·
Approvals · Documents · Competitors · Tasks · Settings
```

- Merge `Brand`, `Platforms`, `Brief`, `Users`, `Invites`, `Feedback` into a single **Settings** tab with sub-sections (accordion). Keeps tab bar premium and scannable.
- Add new `Content` tab (filtered `content_posts` for that client) and `Approvals` tab (filtered `content_approvals`).
- Drop `Health` / `Performance` from the tab bar; show Health Score as a card in the Overview header.

## 4. Agency Dashboard (`src/pages/agency/AgencyDashboard.tsx`)

Restructure into the requested 8 sections, all powered by real Supabase queries (no mock data):

1. **Health Score overview** — average + distribution from `client_health_scores` (already wired).
2. **Clients at Risk** — `client_risk_alerts` where `status='active'`, sorted by `risk_score` desc.
3. **Pending Approvals** — `content_approvals` where `status='pending_approval'`, oldest first; overdue badge if `due_date < now()`.
4. **Missing Analytics Data** — clients with zero `analytics_entries` for current month.
5. **Reports to Generate** — clients without a `monthly_reports` row for previous month.
6. **Top Performing Content** — top 5 `content_metrics` by `views` for current month, joined with `content_posts`.
7. **Upcoming Content** — next 5 `content_posts` with `scheduled_for >= now()`.
8. **AI Recommendations** — surfaces unread items from latest health score `ai_recommendation` jsonb across clients.

Each card links to the deep view. Loading + empty states styled premium.

## 5. Client Dashboard (Overview tab in Client Portal)

Rebuild Overview to show, in order, only the cards the client should see:

- Health Score (read-only mini, only if agency has marked client-visible — gated by a new `clients.show_health_to_client` boolean? **No new column** — instead always hide per your spec; show a friendlier "Account Health" qualitative summary derived from `monthly_strategies.executive_summary` when sent).
- Monthly Goals (from `monthly_goals`).
- Analytics Summary (current month from `analytics_entries`, read-only).
- Best Performing Content (top 3 from `content_metrics`).
- Upcoming Calendar (next 5 `content_posts` with `scheduled_for`).
- Pending Approvals badge → link to Approvals tab.
- Reports list (only `sent_to_client` reports).
- Business Impact Form (existing `business_impact_entries` insert form).
- AI Recommendations card — render only if a `monthly_strategies` row with `status='sent_to_client'` exists for current/previous month.

## 6. Cleanup & deduplication

- Remove `src/pages/agency/Performance.tsx` route + file (superseded by Analytics).
- Remove `src/pages/agency/Risk.tsx` route (Risk lives inside Dashboard + Client tabs).
- Audit `videos` table usages in `AgencyDashboard.tsx` — replace with `content_metrics` aggregation (the `videos` table is legacy/mock; `content_metrics` is the real source).
- Search for any remaining mock arrays / placeholder data in dashboard components and replace with live queries (`rg "mock|placeholder|TODO" src/pages src/components`).
- Ensure every Supabase select in dashboards filters by `agency_id` (or relies on RLS for client-scoped views).

## 7. Acceptance verification

Run a manual smoke test after build (no automated e2e in scope):

1. Create a fresh agency owner → see empty dashboard with friendly empty states (no mock data).
2. Create a client, pick a niche → appears in Clients + Dashboard.
3. Add an analytics entry manually → flows to Analytics tab, Health Score recompute available.
4. Generate Risk → appears in Dashboard "Clients at Risk".
5. Save a swipe item → only visible to agency.
6. Add a competitor + observation with `visible_to_client=true` → appears in Client Portal Market Insights (kept only as inline card on Overview if any visible exists).
7. Send a post for approval → client sees it in Approvals tab, can approve/request changes.
8. Generate strategy → agency edits, sets `sent_to_client` → client sees AI Recommendations on Overview.
9. Import CSV → rows land in `analytics_entries` with `source='csv_import'`.
10. Sign in as client of agency A → cannot see any data from agency B (RLS enforced via existing helpers).

## Out of scope

- Real platform API integrations (Instagram/TikTok/Meta) — manual + CSV only, per spec.
- New tables or columns — schema already covers all 7 modules.
- Team / Billing / Settings full implementations — only premium "Coming soon" placeholders so nav is coherent.
- Visual redesign of existing module components — only dashboards + nav + tabs are restructured.

## File changes (estimated)

Edited:
- `src/components/AgencyLayout.tsx` (nav array)
- `src/App.tsx` (route additions/removals)
- `src/pages/agency/AgencyDashboard.tsx` (8-section rebuild)
- `src/pages/agency/ClientProfile.tsx` (tab reduction + Settings consolidation)
- `src/pages/client/ClientPortal.tsx` (tab list + Overview rebuild)

Created:
- `src/pages/agency/Competitors.tsx` (agency-wide list)
- `src/pages/agency/Team.tsx`, `Billing.tsx`, `Settings.tsx` (premium placeholder cards)
- `src/components/dashboard/*` small cards split out for readability (RiskList, PendingApprovalsList, MissingAnalytics, ReportsToGenerate, TopContent, UpcomingContent, AIRecommendations)

Deleted:
- `src/pages/agency/Performance.tsx`
- `src/pages/agency/Risk.tsx` (route only — `risk.ts` lib + components stay, used by dashboard)
