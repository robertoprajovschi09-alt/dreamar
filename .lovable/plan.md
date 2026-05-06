## Goal

Replace the heavy 4-step `BriefWizard` with a **single-screen, 3-question Quick Onboarding**, then ship a **niche-aware, AI-personalized Client Dashboard** that pulls everything else from data the agency already provided in `Add Client` (`clients.*`, `client_kpi_schemas`, `client_platforms`, `monthly_goals`, `ai_strategy_base`).

The client never re-types information the agency already filled in — they only confirm priorities and what they want to track. AI assembles the rest. Missing data is rendered as an explicit "Missing data" state, never invented.

## What changes

### 1. Onboarding — `QuickClientOnboarding.tsx` (replaces `BriefWizard` for new clients)

One screen. Pre-filled from `clients` row + `client_kpi_schemas`. Three lightweight questions:

1. **Confirm your top priority for the next 90 days** — single-select from goals already created in Add Client + a freeform "Other". Default = first existing `monthly_goals` row.
2. **What does success look like in plain words?** — one short textarea (becomes `client_briefs.main_objective`).
3. **What should we NEVER post or say?** — short textarea (becomes `client_briefs.content_donts`).

Optional collapsible "Anything else we should know?" → `extra_notes`.

On submit:
- Upsert `client_briefs` row with: `main_objective`, `content_donts`, `extra_notes`, `completed = true`, plus `business_description = clients.brand_voice`, `target_audience = clients.target_audience`, `brand_tone = clients.tone_of_voice`, `preferred_platforms = clients.platforms`, `unique_selling_points = clients.notes` (only fields not already set). This satisfies the existing `briefStatus === "done"` gate without making the client retype them.
- If priority differs from existing top goal, insert a new `monthly_goals` row for the current month so the dashboard reflects the choice.
- Trigger AI personalization (step 3 below).

Fallback: if `clients` is empty (rare), the screen still works — the three fields alone are enough to mark the brief complete.

### 2. AI personalization — edge function `client-dashboard-personalize`

New edge function (Lovable AI Gateway, model `google/gemini-2.5-flash`).

Input: `{ client_id }`. Reads (service role): `clients`, `client_kpi_schemas`, `client_platforms`, `monthly_goals`, `client_briefs`, `business_impact_entries` (last 30 days), `analytics_entries` (last 90 days). Auth check: caller must be `is_member_of` agency OR `is_client_viewer_of` client.

Output JSON (saved to `clients.ai_strategy_base.dashboard_personalization`):
```
{
  greeting: "Short personalized welcome line",
  niche_focus: "1 sentence describing what this dashboard prioritizes for this niche",
  priority_metrics: ["kpi_key_1", "kpi_key_2", "kpi_key_3"],   // chosen from client_kpi_schemas.kpi_fields
  insight_cards: [
    { title, body, severity: "info|good|warning", missing_data?: string[] }
  ],
  next_actions: [{ label, why }],
  generated_at: ISO
}
```

The function MUST NOT invent metrics. If a KPI value is absent, it goes into `missing_data` and the card body says exactly which field is missing.

Triggered: (a) at the end of QuickOnboarding, (b) once per 24h on dashboard mount via lightweight check.

### 3. New dashboard — `ClientDashboard.tsx` (replaces current `OverviewTab`)

Layout, in order:

```text
┌─ Hero (greeting + niche_focus + priority chips) ───┐
├─ Priority KPIs row (3 cards from priority_metrics) │
│   each: label · value · target · sparkline · status│
├─ AI Insights (insight_cards, color-coded)          │
├─ Goals progress (this month from monthly_goals)    │
├─ Business Impact mini-form (driven by              │
│   client_kpi_schemas.business_impact_fields)       │
├─ Content snapshot (scheduled / awaiting / published│
│   counts already in OverviewTab)                   │
├─ Latest report card                                │
└─ Next actions (from AI)                            │
```

Niche-awareness comes entirely from `client_kpi_schemas` (set during Add Client wizard) — no hard-coded niche tables. KPI cards render with the right unit (number / % / currency / boolean / text) using `kpi_type` already stored. Missing KPI values render a muted "Missing data — your agency hasn't logged this yet" pill.

`NicheSummaryCard` is kept but only shown for the legacy hard-coded niches (`real_estate`, `restaurant`, `dental`, `fitness`) where the dedicated detail tables exist; for everything else the per-client KPI snapshot is the source of truth.

### 4. Business Impact mini-form

Replaces the heavyweight Feedback tab as the primary client-facing data-entry surface. Renders directly from `client_kpi_schemas.business_impact_fields` (already configured per niche). Single inline form, autosaves to `business_impact_entries` for `entry_date = today`. Required-by-RLS `created_by = auth.uid()`, `client_id`, `agency_id` all pre-set.

Existing Feedback tab stays for monthly retrospectives but is deprioritized.

### 5. Files

**New**
- `src/components/client/QuickClientOnboarding.tsx`
- `src/components/client/ClientDashboard.tsx`
- `src/components/client/PriorityKpiCard.tsx`
- `src/components/client/BusinessImpactQuickForm.tsx`
- `supabase/functions/client-dashboard-personalize/index.ts`

**Edit**
- `src/pages/client/ClientPortal.tsx` — swap `BriefWizard` → `QuickClientOnboarding`; replace the `OverviewTab` body with `<ClientDashboard />`.
- `supabase/config.toml` — register the new edge function (verify_jwt true, default).

**Keep / unchanged**
- `client_briefs` table (just used differently) — no schema migration.
- `BriefWizard.tsx` left in place but no longer rendered in the portal flow; agency can still trigger it manually for clients that want the long form.

## Multi-tenant & security

- All inserts use the client's own `agency_id` and `client_id` from `useUser()`; never trust query params.
- Edge function uses service role for reads but checks the caller's JWT against `client_users` and rejects if the requested `client_id` doesn't match.
- RLS on `client_briefs`, `monthly_goals`, `business_impact_entries`, `clients`, `ai_strategy_base` already enforces tenant isolation — no policy changes needed.
- AI personalization output is stored on `clients.ai_strategy_base.dashboard_personalization` (existing JSONB column), so we don't add a new table.

## Out of scope

- Removing the existing `BriefWizard` file (kept for agencies that want the long brief later).
- Schema migrations — none needed; everything plugs into existing tables.
- Reordering the portal tabs (Overview / Calendar / Approvals etc. stay; only Overview's contents change).
