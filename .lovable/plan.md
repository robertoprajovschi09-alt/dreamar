## Module 4: Competitor Tracking

Internal per-client competitor tracker with observations, screenshots, AI insights, and integration with Swipe File.

### 1. Database (new migration)

**Table `competitors`** (RLS enabled):
- `id uuid pk default gen_random_uuid()`
- `agency_id uuid not null`, `client_id uuid not null`
- `name text not null`, `website text`
- `instagram_url`, `tiktok_url`, `facebook_url`, `youtube_url`, `linkedin_url` — all `text null`
- `niche text null`, `notes text null`
- `created_by uuid`, `created_at`, `updated_at` (with `tg_set_updated_at` trigger)
- Index: `(agency_id, client_id, created_at desc)`

**Table `competitor_observations`** (RLS enabled):
- `id uuid pk`, `agency_id uuid`, `client_id uuid`, `competitor_id uuid not null`
- `title text not null`
- `platform text` (instagram/tiktok/youtube/facebook/linkedin/x/other)
- `content_type text` (reel/story/post/carousel/video/short/ad/live)
- `content_url text`, `screenshot_url text`
- `observed_date date default current_date`
- `hook text`, `caption text`, `offer text`, `content_angle text`
- `estimated_performance text` (low/medium/high/viral) — free text
- `notes text`, `ai_analysis jsonb default '{}'`
- `tags text[] default '{}'`
- `visible_to_client boolean not null default false`
- `created_by uuid`, `created_at`, `updated_at` (trigger)
- Indexes: `(agency_id, client_id, observed_date desc)`, `(competitor_id, observed_date desc)`, GIN on `tags`

**RLS:**
- `competitors_*`: agency members CRUD on own agency; saas_admin read.
- `competitor_observations_read`: agency member OR (`visible_to_client=true AND is_client_viewer_of(auth.uid(), client_id)`) OR saas_admin.
- Insert/update/delete: agency members.

**Storage**: reuse existing `agency-files` bucket; upload screenshots under `competitors/{client_id}/{competitor_id}/{uuid}.png`. No new bucket needed.

**Plan flag**: add `competitor_tracking boolean default false` to `plans`; enable for `growth`, `unlimited`, `white_label`.

### 2. Edge functions (Lovable AI Gateway, model `google/gemini-3-flash-preview`)

All validate JWT, handle 429/402, return JSON via tool-calling. AI rule: **never copy competitor content verbatim — produce original, differentiated ideas**; if data is missing, say so.

- **`competitor-insights`** — input `{ client_id }`. Loads competitors + observations + the client's niche/brand voice. Returns:
  ```
  { patterns: string[], common_content_types: string[],
    missed_opportunities: string[], differentiation_angles: string[],
    original_ideas: { title, hook, angle, why_it_works }[] }
  ```
- **`competitor-compare`** — input `{ client_id, competitor_ids: string[] }`. Returns side-by-side strengths, weaknesses, content mix, and what the client should adopt vs avoid.
- **`competitor-observation-analyze`** — input `{ observation_id }`. Writes structured `ai_analysis` (why it likely worked, hook/offer breakdown, originality score, ideas to test — none copied).

### 3. Frontend

**New files:**
- `src/lib/competitors.ts` — types (`Competitor`, `CompetitorObservation`), platform constants, helpers (`listCompetitors`, `listObservations`, CRUD, `uploadScreenshot`, AI invokers, `saveObservationAsSwipe`).
- `src/components/competitors/CompetitorCard.tsx` — name, niche, social link icons, observation count, last-observed snippet, actions.
- `src/components/competitors/CompetitorFormDialog.tsx` — create/edit (zod-validated; URL fields validated).
- `src/components/competitors/ObservationFormDialog.tsx` — full form, screenshot upload to `agency-files`, tag chips, `visible_to_client` switch.
- `src/components/competitors/ObservationCard.tsx` — preview with screenshot thumbnail, platform badge, hook snippet, actions: View, AI Analyze, Save to Swipe File, Edit, Delete.
- `src/components/competitors/ObservationDetailDialog.tsx` — full view + AI analysis panel + "Save to Swipe File" (prefills hook/caption/angle/platform/source_url).
- `src/components/competitors/CompetitorInsightsDialog.tsx` — runs `competitor-insights`, renders patterns / opportunities / differentiation / original ideas; "Save idea to Swipe File" per item.
- `src/components/competitors/CompareDialog.tsx` — multi-select competitors, calls `competitor-compare`, renders comparison table.

**Wiring:**
- `src/pages/agency/ClientProfile.tsx` — add new **Competitors** tab containing competitor list + filters (platform, tag, search), "Add Competitor", "Generate AI Insights", "Compare". Selecting a competitor opens a panel with that competitor's observations and "Add Observation".
- `src/pages/client/ClientPortal.tsx` — add a read-only **"Market Insights"** section that lists only `visible_to_client=true` observations for that client (no AI internals, no notes). Hidden when none exist.
- No top-level nav route — module is per-client only (matches spec: internal per client).

### 4. Swipe File integration

- "Save to Swipe File" on observations and on AI-generated original ideas → opens existing `SwipeFormDialog` prefilled (`type='video_idea'` or `'hook'`, `platform`, `hook`, `caption`, `content_angle`, `source_url`, `client_id`, `visibility='agency_internal'` by default).

### 5. Permissions summary

- Agency members (`agency_owner`, `agency_team`, `saas_admin`): full CRUD on competitors and observations.
- Client viewers: see only observations where `visible_to_client=true` for their client; cannot see AI analysis, notes, or competitor management UI.
- Risk Detector / Health Score not modified.

### 6. Files created / edited

- New migration: `competitors`, `competitor_observations`, RLS, `plans.competitor_tracking` flag.
- 3 edge functions: `competitor-insights`, `competitor-compare`, `competitor-observation-analyze`.
- New: `src/lib/competitors.ts`, `src/components/competitors/*` (7 components).
- Edited: `src/pages/agency/ClientProfile.tsx` (new tab), `src/pages/client/ClientPortal.tsx` (Market Insights section).

Approve to implement.