# Convert QuickClientOnboarding into a full guided multi-step onboarding

Replace the current single-screen "three quick questions" component with a four-step, mobile-first wizard. Every step is pre-filled from the client's niche preset (`getNichePreset`) merged with what the agency already saved, so the client edits/confirms instead of starting from blank fields.

## Shape

`src/components/client/QuickClientOnboarding.tsx` — keeps the same exported name, props, and the `onCompleted` contract (so `ClientPortal.tsx` doesn't need changes). Internally it becomes a stepper with one card per step, a sticky bottom bar (Înapoi / Continuă) sized for mobile, and a header progress indicator (`Pas X din 4`).

Romanian copy throughout, matching the rest of the client UI.

## Initial load

Run in parallel before showing the wizard:

- `clients` row → `niche`, `custom_niche`, `niche_id`, `platforms`, `target_audience`, `brand_voice`, `tone_of_voice`, `notes`
- `client_kpi_schemas` for this client (canonical source of niche-specific structure — populated at client creation)
- `client_platforms` for this client (existing rows if agency pre-filled any)
- `monthly_goals` for the current month
- `getClientBrief(clientId)` for resume

Preset resolution: prefer `client_kpi_schemas.kpi_fields` / `monthly_questions` for this client; fall back to `getNichePreset(client.niche)` if the schema row is empty/missing. Treat custom niches with empty kpi lists as a single editable blank row.

## Step 1 — Platforme & conturi

- Render one row per platform from `PLATFORMS` (`src/lib/niches.ts`).
- Pre-check the rows present in `client.platforms` or in existing `client_platforms`. Default-suggest Instagram + Facebook if neither client nor agency selected anything.
- For each checked row: `Handle / @username` and `URL profil` inputs (URL optional). Pre-fill from existing `client_platforms` (`handle`, `url`).
- On Continuă: upsert into `client_platforms` for every checked row using `onConflict: "client_id,platform"`; delete rows for platforms the client unchecked. Update `clients.platforms` to the new list.

## Step 2 — Obiective

- Pre-fill 2–3 goal cards from the niche preset KPIs (one per KPI, e.g. real_estate → "Mai mulți leads calificați", "Mai multe vizionări"). Each card has: `objective` (text), `metric` (text, defaulted to KPI label), `target` (number).
- Allow add / remove. At least one objective must remain.
- On Continuă: replace this month's goals — delete `monthly_goals` for `client_id` + current month, then insert the new set with `agency_id`, `client_id`, `month = date_trunc('month', now())::date`, `owner = userId`, `created_by = userId`, `status = "in_progress"`.

## Step 3 — KPI (confirmare)

- List the preset KPI fields as toggleable rows (label + small description from `type`/`unit`). All on by default.
- The client can also toggle the `monthly_questions` they want to see in their monthly check-in (all on by default).
- On Continuă: upsert `client_kpi_schemas` for this client (`onConflict: "client_id"`) with `kpi_fields` set to only the confirmed KPIs (keeping their original metadata), `business_impact_fields` kept as-is from the existing row, and `monthly_questions` set to the confirmed subset. `niche_key`/`custom_niche_label` reuse the values already on the row (or derive from `client.niche` if creating fresh).

## Step 4 — Context business

The existing short-form questions, expanded slightly and pre-filled from `client_briefs` + the agency-collected client fields:

- `business_description` (textarea, prefilled with `client.brand_voice`)
- `target_audience` (textarea, prefilled with `client.target_audience`)
- `main_objective` (textarea — "Cum arată succesul în 90 de zile?")
- `unique_selling_points` (textarea, prefilled with `client.notes`)
- `brand_tone` (select from `BRAND_TONES`, prefilled with `client.tone_of_voice` if it matches a value, otherwise empty)
- `content_donts` (textarea — "Ce să NU postăm niciodată?")
- `extra_notes` (textarea, optional, collapsible)

On Finalizează:
1. `saveClientBrief({ ...existing, ..., preferred_platforms: <from step 1>, completed: true })`.
2. Fire-and-forget `supabase.functions.invoke("client-dashboard-personalize", { body: { client_id } })`.
3. Toast `Onboarding finalizat — îți deschidem dashboardul`.
4. Call `onCompleted()` — `ClientPortal` flips `briefStatus` to `done` and the niche-specific dashboard (already the default `overview` tab) is shown.

## Persistence between steps

Each Continuă writes its step's data (so a refresh keeps progress). Going Înapoi keeps in-memory edits. No localStorage draft needed.

## Validation

- Step 1: at least one platform selected.
- Step 2: at least one objective with non-empty text.
- Step 3: at least one KPI must remain selected.
- Step 4: `main_objective` required.

Show inline errors per step; disable Continuă until the step is valid.

## Out of scope

- Logo upload, brand color, contact info (agency already collected these in the Quick Add).
- No DB migration — all target tables already exist with the right columns.
- `ClientPortal.tsx` is unchanged beyond reusing the same component import.

## Files touched

- **Rewritten**: `src/components/client/QuickClientOnboarding.tsx`
