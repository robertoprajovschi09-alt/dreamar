## Plan: Romanian translation pass for the agency UI

Pure translation — no logic, no layout, no route or identifier changes.

### Scope
**Translate to Romanian:**
- `src/components/AgencyLayout.tsx` — sidebar labels, header items, dropdown menu entries ("Sign out", "Soon" badge, etc.).
- `src/components/PageHeader.tsx`, `EmptyState.tsx`, `NavLink.tsx` — any user-visible strings.
- `src/pages/agency/*.tsx` — page titles, subtitles, buttons, empty states, table headers, toasts shown to the agency user, dialog titles/labels in:
  - AgencyDashboard, AiActions, AiMemory, Analytics, Approvals, Assistant, Billing, Calendar, Campaigns, ClientProfile, Clients, Competitors, Content, Documents, InviteClientDialog, Reports, Settings, Strategies, StrategyDetail, StrategyPrint, SwipeLibrary, Tasks, Team.
- Shared agency components under `src/components/`:
  - `client/AddClientWizard.tsx` — all step titles, labels, placeholders, helper text, buttons, and toasts. Also normalize the existing Romanian draft prompt ("Am găsit un draft salvat. Continui de unde ai rămas?", "Șterge", "Continuă") so it matches the rest (already Romanian, just verify wording consistency with the rest of the wizard).
  - `ai/`, `analytics/`, `approvals/`, `competitors/`, `content/`, `health/`, `operations/`, `performance/`, `reports/`, `risk/`, `strategies/`, `swipe/` — only the strings used by the agency UI.

**Leave in English (do NOT translate):**
- `src/pages/admin/*` and `src/pages/AdminLogin.tsx` (saas_admin area).
- `src/pages/client/*` (client portal — out of scope for this pass).
- `src/components/ui/*` (shadcn primitives — generally no user-visible copy).
- Code identifiers, variable names, prop names, file names, routes.
- Database enum values and column values (e.g. `status: "active"`, `niche: "real_estate"`). Where these values are rendered to the user, translate via the existing label maps (`NICHES`, `STATUSES` in `src/lib/niches.ts`) — update the labels there, not the values.
- Console logs and developer comments.
- Third-party brand names ("Instagram", "TikTok", "Google Ads", etc.).

### Approach
1. Translate `src/lib/niches.ts` label fields (NICHES labels, STATUSES — note STATUSES is a `string[]`, so either keep raw values in code and add a `STATUS_LABELS` map, or only translate at call sites; will choose the lowest-risk option per file).
2. Translate shared layout/components first (`AgencyLayout`, `PageHeader`, `EmptyState`) so navigation reads Romanian everywhere.
3. Translate each agency page top-to-bottom, file by file, replacing only string literals inside JSX, toast calls, dialog titles, button text, placeholders, and aria-labels.
4. Translate the Add Client wizard end-to-end (Basics, Niche & KPIs, Platforms, Goals, Context, Invite, Review) including KPI/preset helper text and validation toast messages. Confirm the existing Romanian draft prompt phrasing and reuse it as the style baseline.
5. Spot-check shared components used by agency pages for any remaining English strings.

### Out of scope
- No new components, no restyling, no copy rewrites beyond translation.
- No changes to the SaaS admin area, client portal, auth/landing pages, or shadcn primitives.
- No DB migrations.

### Risks / notes
- Niche/status values are used both as DB values and as display strings in places. The plan keeps raw values intact and translates only display labels.
- Some agency pages share components with the client portal; translations will be applied only to strings clearly rendered in the agency context. If a shared component is used in both, I'll either pass a localized prop or leave the shared component untouched and translate at the call site to avoid affecting the client portal.