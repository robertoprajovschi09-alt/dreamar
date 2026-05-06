## Goal

Promote "Custom Niche" from a single text field into a first-class, reusable **per-agency niche library** with full custom KPI / business-impact / monthly-question schemas. Reusable across future clients of the same agency. Global presets remain available to all agencies.

## 1. Database (one migration)

Create three new tables and link `clients` to them.

```sql
-- Niche registry: global (agency_id NULL) + per-agency custom niches
CREATE TABLE public.niches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE, -- NULL = global
  key text NOT NULL,                 -- slug, unique per scope
  label text NOT NULL,
  is_custom boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (agency_id, key)
);

CREATE TABLE public.custom_niche_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_id uuid NOT NULL REFERENCES public.niches(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  kpi_type text NOT NULL CHECK (kpi_type IN ('number','percentage','currency','text','boolean')),
  reporting_frequency text NOT NULL DEFAULT 'monthly'
       CHECK (reporting_frequency IN ('daily','weekly','monthly')),
  visible_to_client boolean NOT NULL DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.custom_niche_fields (        -- business impact fields
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_id uuid NOT NULL REFERENCES public.niches(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'number'
       CHECK (field_type IN ('number','percentage','currency','text','boolean')),
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.custom_niche_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_id uuid NOT NULL REFERENCES public.niches(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS niche_id uuid REFERENCES public.niches(id) ON DELETE SET NULL;
```

**Seed**: insert one global row per existing preset (`real_estate`, `restaurant`, …, plus `custom` excluded). Done in same migration with `INSERT … ON CONFLICT DO NOTHING` and `agency_id = NULL`.

**RLS**:
- `niches`: SELECT → `agency_id IS NULL OR is_member_of(auth.uid(), agency_id)`; INSERT/UPDATE/DELETE → `is_member_of(auth.uid(), agency_id)` AND `agency_id IS NOT NULL` (no edits to globals).
- `custom_niche_kpis` / `_fields` / `_questions`: full CRUD restricted by `is_member_of(auth.uid(), agency_id)`. Clients can SELECT via `is_client_viewer_of` joining through `clients.niche_id` (read-only).
- `updated_at` trigger on `niches`.

## 2. Frontend — `src/lib/niches.ts` / `nichePresets.ts`

- Keep static presets as fallback/seed source.
- New helper `useAgencyNiches(agencyId)` (in `src/hooks/useAgencyNiches.ts`) that loads `niches` (global + agency) + their KPIs/fields/questions in one query.

## 3. AddClientWizard refactor (Step 2)

Replace the hard-coded `NICHE_PRESET_OPTIONS` dropdown with the dynamic list from `useAgencyNiches`, with one extra entry **"+ Create custom niche"**.

When user picks "+ Create custom niche":
- Reveal an inline panel with:
  - **Custom Niche Name** input (placeholder per spec).
  - **Custom KPIs** editor — rows of `{label, type (number/percentage/currency/text/boolean), reporting_frequency (daily/weekly/monthly), visible_to_client (switch)}`.
  - **Custom Business Impact Fields** editor — rows of `{label, field_type}`.
  - **Custom Monthly Questions** editor — list of question labels.
- Each section has "Add" button + remove buttons; pre-seeded with 1 empty row each.

Validation in Step 2: when custom niche selected, `name` and ≥1 KPI label required.

When user picks an existing custom niche from the agency library, the editors are pre-filled and editable for **this client only** (overrides stored on `client_kpi_schemas` as today). Global presets behave as today.

## 4. Provisioning on Create

In `provision()`:

1. If user created a brand-new custom niche this session:
   - Insert into `niches` with `agency_id=agencyId, is_custom=true, key=slug(name), label=name, created_by=user.id`. Capture `niche_id`.
   - Bulk-insert `custom_niche_kpis`, `custom_niche_fields`, `custom_niche_questions`.
2. Insert `clients` row with `niche='custom'`, `custom_niche=name`, `niche_id=<id>` (or selected existing niche id; for global presets `niche_id` resolves from the seeded global row).
3. Continue inserting `client_kpi_schemas` snapshot exactly as today (per-client copy used by dashboards / monthly reports).

## 5. Dashboard / Analytics / Monthly Reports

- The existing `client_kpi_schemas` snapshot already drives dashboard/analytics/monthly report fields, so custom KPIs & fields surface automatically there. No change needed to those screens beyond reading `kpi_type` / `reporting_frequency` / `visible_to_client` (added as optional props on `KpiField` type) when rendering.
- Update `KpiField` type to include `kpi_type`, `reporting_frequency`, `visible_to_client`, defaulting safely for older rows.

## 6. Reuse UX

- Step 2 dropdown groups: **My agency niches**, **Global presets**, **+ Create custom niche**. Once a custom niche is created, it appears for all future clients of the same agency.
- Add small "Manage niches" link → opens a lightweight modal listing agency custom niches with rename / delete (delete forbidden if any client still references it; show count).

## Files to change

- New migration `supabase/migrations/<ts>_niche_library.sql`
- `src/lib/niches.ts` — extend `KpiField` type with new props
- `src/hooks/useAgencyNiches.ts` — new
- `src/components/client/AddClientWizard.tsx` — Step 2 rewrite, provisioning logic
- `src/components/client/CustomNicheEditor.tsx` — new (KPIs/fields/questions editors)
- `src/components/client/ManageNichesDialog.tsx` — new (small)
- `src/integrations/supabase/types.ts` — auto-regenerated

## Out of scope

No changes to `client-strategy-base` edge function or RLS on existing tables beyond the new ones.