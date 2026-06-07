Add a "Getting started" checklist card to AgencyDashboard that appears only while setup is incomplete, placed above the KPI strip.

## Changes

### 1. `src/pages/agency/AgencyDashboard.tsx`
- Add a query for `client_platforms` (select `"id"`, `eq("agency_id", agency.id)`, `limit(1)`) to the existing `Promise.all` batch.
- Track `hasPlatforms` (boolean) from the result.
- Track `hasAnalytics` (boolean) — reuse the existing `analyticsAny` query result (already fetched).
- Track `hasReports` (boolean) — check if any `reports` rows exist agency-wide (add a head-only count query or reuse if available).
- Define four checklist items:
  1. **Add your first client** — done when `clientCount > 0`, link to `/agency/clients`
  2. **Add platforms & handles** — done when `hasPlatforms`, no link specified
  3. **Import your first analytics data** — done when `hasAnalytics`, link to `/agency/analytics`
  4. **Generate your first report** — done when `hasReports`, link to `/agency/reports`
- Compute `completedCount` and `totalCount`. If `completedCount === totalCount`, render nothing.
- Otherwise render a `<Card>` above the KPI strip containing:
  - CardHeader with title "Getting started" and a `<Progress value={(completedCount/totalCount)*100} />`
  - CardContent with a vertical list of items. Each item shows:
    - A checkmark (green, `text-accent`) or empty circle (`text-muted-foreground`)
    - The item label
    - If undone and a link exists, wrap the label in a `<Link>`; otherwise plain text
- Use existing Tailwind tokens and shadcn Card/Progress components. No new UI dependencies.

## Out of scope
- No changes to other dashboard sections (KPIs, health, risk, lists).
- No new files or components needed beyond the single page edit.
- No database or backend changes.