## Analytics empty state

In `src/pages/agency/Analytics.tsx`, when there are no `analytics_entries` for the selected year/month (`aggregate.length === 0` and every value in `totals(aggregate)` is 0), replace the row of KPI cards with an empty-state card. Otherwise show the normal KPI grid.

### Empty-state card content
- Title: "No data yet for this period"
- Short helper text
- Client picker (required, since the existing dialogs need a `clientId`): a `Select` listing the agency's clients, defaulting to the first one
- Two buttons:
  - "Import CSV" → opens existing `CsvImportDialog` with `target="analytics_entries"`
  - "Add manually" → opens existing `AnalyticsEntryDialog`
- Both pass `defaultYear` / `defaultMonth` from the current filter, and refresh via the existing `load()` callback on `onImported` / `onSaved`
- If `clients.length === 0`, show a link to `/agency/clients` instead of the buttons

### State to add
`csvOpen`, `entryOpen`, `selectedClientId` (defaults to first client when loaded).

### Untouched
- `Kpi`, `ClientList`, missing-data card
- `CsvImportDialog` and `AnalyticsEntryDialog` components themselves
- KPI grid rendering when data exists
- All other dashboard sections

### Files
- Edit only `src/pages/agency/Analytics.tsx`
- No new files, no schema changes
