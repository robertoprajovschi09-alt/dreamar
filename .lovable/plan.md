## Module 3: Swipe File Library

Internal library where the agency saves reusable ideas, hooks, scripts, captions, formats, and content examples — with AI to generate variations and adapt across niches.

### 1. Database

**New table `swipe_files`** (RLS enabled):
- `id uuid pk`, `agency_id uuid not null`, `client_id uuid null`, `niche text null`
- `title text not null`
- `type text not null` — enum-checked: `hook | script | caption | video_idea | ad_angle | carousel_idea | story_idea | offer | cta | full_example`
- `platform text null` (instagram/tiktok/youtube/facebook/linkedin/other)
- `hook text`, `script text`, `caption text`
- `content_angle text`, `content_format text`
- `performance_notes text`, `why_it_worked text`
- `source_url text`, `file_url text`
- `tags text[] default '{}'`
- `visibility text not null default 'agency_internal'` — `agency_internal | client_specific | global_template` (client_specific = visible to that client user)
- `usage_count int default 0`, `performance_score numeric null`
- `source_post_id uuid null` (link back to content_posts when saved from one)
- `created_by uuid`, `created_at`, `updated_at` (with `tg_set_updated_at` trigger)
- Indexes: `(agency_id, created_at desc)`, `(agency_id, type)`, GIN on `tags`

**RLS policies:**
- `swipe_files_read`: agency members OR (visibility='client_specific' AND `is_client_viewer_of(auth.uid(), client_id)`) OR saas_admin. Global templates are readable by any authenticated agency member (cross-agency curated bank reserved for SaaS admin to seed; for now agency-only sees own + globals).
- Insert/update/delete: agency members of `agency_id`. Global templates: only saas_admin can write (`agency_id` still set to creator's agency for traceability).

**Plan flag:** add `swipe_file boolean default false` to `plans`; enable for `growth`, `unlimited`, `white_label`.

### 2. Edge Functions (Lovable AI Gateway, model `google/gemini-3-flash-preview`)

All return JSON via tool-calling, handle 429/402, validate JWT in code.

- **`swipe-analyze`** — input `{ swipe_id }`. AI explains *why it worked* based on hook/script/notes; writes `why_it_worked` back if empty.
- **`swipe-generate-variations`** — input `{ swipe_id, count?=10 }`. Returns 10 hook/script variations preserving angle and tone.
- **`swipe-adapt-niche`** — input `{ swipe_id, target_niche }`. Rewrites hook/script for new niche (e.g. real estate → restaurant). Returns `{ title, hook, script, caption, suggested_tags }`.
- **`swipe-suggest-reuse`** — input `{ swipe_id }`. Returns list of clients (from agency) and platforms where this idea could be reused, with reasoning.

AI rule: never invent metrics; if data missing, say so.

### 3. Frontend

**New files:**
- `src/lib/swipe.ts` — types, type/visibility/platform constants & labels, helpers.
- `src/components/swipe/SwipeCard.tsx` — grid card (title, type badge, platform, tags, usage_count, actions).
- `src/components/swipe/SwipeRow.tsx` — list row.
- `src/components/swipe/SwipeFormDialog.tsx` — create/edit form with validation (zod), all fields, tag input, visibility selector, optional client/niche picker.
- `src/components/swipe/SwipeDetailDialog.tsx` — full view with AI panel (Analyze, Generate Variations, Adapt to Niche, Suggest Reuse) and action buttons.
- `src/components/swipe/SaveToSwipeButton.tsx` — reusable button used from `Content.tsx` (saves a `content_post` as swipe — pre-fills hook/script/caption/platform/source_post_id).
- `src/components/swipe/UseInCalendarDialog.tsx` — picks client + scheduled date, inserts row in `content_posts` from a swipe (increments `usage_count`).
- `src/pages/agency/SwipeLibrary.tsx` — main page. Filters: search, type, platform, niche, client, tag, visibility. Sort: recent / most_used / performance. Toggle list/grid. Empty states. Premium gate via existing pattern.

**Wiring:**
- `App.tsx` — add route `/agency/swipe` → `SwipeLibrary`.
- `AgencyLayout.tsx` — add nav link "Swipe File" (icon: `BookmarkPlus` or `Library`).
- `src/pages/agency/Content.tsx` — add "Save to Swipe File" action on each content post row/card.
- `src/pages/agency/ClientProfile.tsx` — small section "Client swipe ideas" listing client_specific entries.
- `src/pages/client/ClientPortal.tsx` — only when `visibility='client_specific'` items exist, show read-only "Inspiration" tab.

### 4. Action buttons (per spec)
- **Save to Swipe File** — on content posts and from a manual "+ New" button.
- **Generate Similar Ideas** — calls `swipe-generate-variations`, displays results, each with "Save as new swipe".
- **Use in Content Calendar** — opens `UseInCalendarDialog`, creates a `content_posts` row.
- **Create Content From This** — same as above but routes user to `/agency/content` after creating draft.

### 5. Permissions summary
- Agency members: full CRUD on agency's swipes.
- Client users: see only swipes where `visibility='client_specific' AND client_id = their client`.
- Saas admin: can create `global_template` swipes visible across.

### Files created / edited
- New migration: `swipe_files` table + RLS + plan flag.
- 4 edge functions: `swipe-analyze`, `swipe-generate-variations`, `swipe-adapt-niche`, `swipe-suggest-reuse`.
- New: `src/lib/swipe.ts`, `src/components/swipe/*` (6 components), `src/pages/agency/SwipeLibrary.tsx`.
- Edited: `src/App.tsx`, `src/components/AgencyLayout.tsx`, `src/pages/agency/Content.tsx`, `src/pages/agency/ClientProfile.tsx`, `src/pages/client/ClientPortal.tsx`.

Approve to implement.