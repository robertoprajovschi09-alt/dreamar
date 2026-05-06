
# Module 7: Manual + AI Analytics

Build a flexible analytics system that works without social platform APIs — agencies enter data manually, import CSVs, or use AI to extract insights.

## 1. Database

### New table: `analytics_entries`
Period-level metrics per client/platform. Columns:
- `id`, `agency_id`, `client_id`, `platform` (text: instagram/tiktok/facebook/youtube/linkedin/other)
- `period_type` (text: day/week/month/custom), `month` (int), `year` (int), `date_start` (date), `date_end` (date)
- Reach metrics: `views`, `reach`, `impressions`
- Engagement: `likes`, `comments`, `shares`, `saves`, `engagement_rate` (numeric)
- Audience: `followers_start`, `followers_end`, `followers_gained`, `profile_visits`, `website_clicks`
- Business: `messages`, `calls`, `leads`, `bookings`, `sales`, `revenue` (numeric)
- Ads: `ad_spend`, `roas`, `cost_per_lead`, `cost_per_purchase` (all numeric)
- Meta: `notes`, `source` (text check: manual/csv_import/ai_extracted/integration), `created_by`, `created_at`, `updated_at`

### New table: `content_metrics`
Per-content-item metrics. Columns:
- `id`, `agency_id`, `client_id`, `content_item_id` (refs `content_posts.id`), `platform`
- `views`, `reach`, `impressions`, `likes`, `comments`, `shares`, `saves`
- `watch_time`, `average_view_duration`, `retention_rate`, `hook_rate`, `completion_rate` (numeric)
- `followers_gained`, `leads`, `sales`, `bookings`, `revenue`
- `notes`, `source`, `created_by`, `created_at`, `updated_at`
- Unique on `(content_item_id, platform)`

### RLS
- Agency members: full CRUD on rows where `is_member_of(auth.uid(), agency_id)`
- Client viewers: SELECT only via `is_client_viewer_of(auth.uid(), client_id)`
- SaaS admins: SELECT all

### Indexes
- `(client_id, year, month)`, `(client_id, platform, date_start)` on `analytics_entries`
- `(client_id, platform)`, `(content_item_id)` on `content_metrics`

## 2. Edge functions

### `analytics-insights`
Input: `{ client_id, year, month }` (or date range). Loads `analytics_entries` + `content_metrics` + `content_posts` + `monthly_goals` for the period, calls Lovable AI (`google/gemini-3-flash-preview`) with strict prompt: only use given numbers, do NOT invent. Returns structured JSON via tool calling:
- `best_platform`, `worst_platform`, `top_content[]`, `bottom_content[]`
- `what_worked[]`, `what_dropped[]`, `recommendations[]`, `next_month_focus[]`
- `missing_data[]` (list of metrics that were null/empty and matter)

### `analytics-csv-suggest-mapping`
Input: `{ headers: string[], target: 'analytics_entries' | 'content_metrics' }`. AI suggests `header -> column` mapping. Returns `{ mapping: Record<string,string>, unmapped: string[] }`. Also returns a non-AI heuristic fallback (string similarity) if AI fails.

## 3. Frontend library — `src/lib/analytics.ts`

Centralized API:
- `listAnalyticsEntries({ clientId, year?, month?, platform? })`
- `upsertAnalyticsEntry(entry)` / `deleteAnalyticsEntry(id)`
- `listContentMetrics({ clientId, contentItemId? })`
- `upsertContentMetric(row)` / `deleteContentMetric(id)`
- `aggregateByPlatform(entries)` → totals + averages per platform
- `aggregateByMonth(entries)` → monthly rollups for charts
- `rankContent(metrics, posts)` → top/bottom performers vs client average
- `detectMissingData(entries, contentMetrics)` → returns array of `{ field, importance, owner }`
- `generateInsights(clientId, year, month)` → calls edge function
- `parseCsv(file)` → returns `{ headers, rows }` (uses `papaparse`)
- `importAnalyticsCsv({ rows, mapping, target, clientId, agencyId, defaults })` → batched insert with validation

## 4. Agency UI

### Pages
- `src/pages/agency/Analytics.tsx` (`/agency/analytics`): aggregate across all clients
  - KPI cards: total views, reach, engagement, followers gained, leads, revenue (current month)
  - Top performing clients (by growth %), worst performing, biggest drop, clients with missing data
  - Filter by month/year

### Per-client Analytics tab
Add **Analytics** tab in `src/pages/agency/ClientProfile.tsx`:
- `ClientAnalyticsTab.tsx` — month/platform filter, overview KPI cards, line charts (views/engagement/followers over time), bar chart (platform comparison), content ranking table, monthly comparison, AI Insights panel, "Add Entry" + "Import CSV" buttons, missing-data callout

### Components — `src/components/analytics/`
- `AnalyticsEntryDialog.tsx` — manual entry form (all metrics, grouped in collapsible sections)
- `ContentMetricDialog.tsx` — per-post metrics entry (opened from content list / detail)
- `CsvImportDialog.tsx` — multi-step: upload → preview headers → mapping (AI-assisted) → validate → confirm
- `PlatformBreakdown.tsx` — bar/pie comparison
- `ContentRankingTable.tsx` — sortable, top/underperformer badges
- `MonthlyComparisonChart.tsx` — current vs previous month
- `AnalyticsInsightsPanel.tsx` — AI insights display + Generate button
- `MissingDataCallout.tsx` — list missing fields + "Add Missing Data" CTA

### Navigation
- Add `BarChart3` "Analytics" item to `AgencyLayout.tsx` sidebar
- Register routes in `App.tsx`

## 5. Client portal
Add read-only "Analytics" tab in `ClientPortal.tsx` showing the client's own KPI cards, monthly chart, and platform breakdown. No editing, no CSV import.

## 6. Integration with existing modules
- **Content list** (`Content.tsx`): add "Add Metrics" button per post → opens `ContentMetricDialog`
- **Monthly Strategies** (Module 6): strategy generator already reads reports; extend `generate-monthly-strategy` context bundle to also pull `analytics_entries` + `content_metrics` for that month
- **Health scores / risk alerts**: existing functions can later consume these tables (not in this module)

## 7. Out of scope (v1)
- Real platform API integrations (Instagram/TikTok/Meta)
- Realtime dashboards
- Custom column mapping templates saved per agency
- Export to PDF (use browser print)

## Files to create
- `supabase/migrations/<ts>_analytics.sql`
- `supabase/functions/analytics-insights/index.ts`
- `supabase/functions/analytics-csv-suggest-mapping/index.ts`
- `src/lib/analytics.ts`
- `src/pages/agency/Analytics.tsx`
- `src/components/analytics/` (8 components above)
- `src/components/analytics/ClientAnalyticsTab.tsx`
- `src/components/analytics/ClientPortalAnalyticsTab.tsx`

## Files to edit
- `src/App.tsx` (route)
- `src/components/AgencyLayout.tsx` (nav)
- `src/pages/agency/ClientProfile.tsx` (tab)
- `src/pages/client/ClientPortal.tsx` (tab)
- `src/pages/agency/Content.tsx` (Add Metrics button)
- `supabase/functions/generate-monthly-strategy/index.ts` (extend context)

## Dependencies
- Add `papaparse` + `@types/papaparse` for CSV parsing

