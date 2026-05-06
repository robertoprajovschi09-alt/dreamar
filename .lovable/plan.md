# Add Client Wizard — 7-step premium onboarding

Replace the current 4-step wizard with a richer 7-step onboarding flow that captures everything needed to operate a client end-to-end: brand basics, niche-specific KPIs (with full custom support), platform handles & objectives, goals, business context, AI-generated strategy base, portal invite with granular permissions, and a final review that provisions the workspace.

Multi-tenant integrity preserved: every insert carries `agency_id` from `useUser()`; client-scoped rows carry `client_id`. All writes go through Supabase JS so existing RLS policies apply.

## Schema changes (one migration)

1. **`client_kpi_schemas`** (new) — one row per client, holds the live KPI/impact/questions definition. Lets each client (especially Custom niches) have its own metric set without changing core tables.
   - `id`, `agency_id`, `client_id` (unique), `niche_key text`, `custom_niche_label text NULL`,
     `kpi_fields jsonb` (array of `{key,label,unit,type}`),
     `business_impact_fields jsonb`,
     `monthly_questions jsonb`,
     `created_at/updated_at`.
   - RLS: agency members read/write own; client viewers read only.

2. **`client_invites`** — add `display_name text`, `portal_role text default 'client_viewer'` (`client_owner`|`client_viewer`), `permissions jsonb default '{}'`.

3. **`client_users`** — add `permissions jsonb default '{}'` so accepted invites keep their granted permissions.

4. **`accept_client_invite` function** — extend to copy `display_name`/`permissions`/`portal_role` from invite to `client_users`.

5. **`agency-files` bucket policies** — add storage RLS so agency members can upload/read at `clients/<client_id>/...` (verify via `is_member_of`). Bucket stays private.

## Niche presets

New `src/lib/nichePresets.ts` exports default `kpi_fields`, `business_impact_fields`, and `monthly_questions` per niche key (real_estate, restaurant, beauty, ecommerce, fitness, dental, education, automotive, legal, finance) plus an empty preset for `custom`. Selecting a niche pre-fills these editable arrays in step 2.

## Wizard component

Rewrite `src/components/client/AddClientWizard.tsx` with 7 steps and a sticky stepper:

```
[1 Basics] → [2 Niche & KPIs] → [3 Platforms] → [4 Goals] → [5 Context] → [6 Invite] → [7 Review]
```

- **Step 1 — Basics**: name, website, logo upload (to `agency-files`), brand color, contact name/email/phone, status (`active|onboarding|paused` — extend `client_status` enum to add `onboarding` if missing; otherwise map to existing values).
- **Step 2 — Niche & KPIs**: niche dropdown (10 presets + Custom). On Custom → required `custom_niche_label` input. Below: editable KPI list, business-impact list, monthly-questions list (chip/row editors). Selecting a preset replaces lists; changes persist into `client_kpi_schemas`.
- **Step 3 — Platforms**: pick from IG/TikTok/FB/YT/LinkedIn/Google Ads/Meta Ads/Website/Other. Each selected platform reveals: profile URL, username, starting followers, main objective. Stored in `client_platforms` (extend with `starting_followers int`, `objective text` columns via the same migration).
- **Step 4 — Goals**: 9 quick templates + Custom. Each goal row: name, target metric, target value, deadline, priority (low/med/high), notes. Stored in `monthly_goals` (current month). Map: name→`objective`, metric→`metric`, value→`target`, deadline→`deadline`, priority/notes→`notes` (priority prefix) until a richer column is needed.
- **Step 5 — Context**: textareas for sells / services / audience / USP / tone / competitors / objections / offers / notes. Saved to `clients.brand_voice`, `tone_of_voice`, `target_audience`, `competitors`, `services` (jsonb), `notes`, plus a single `business_context` summary entry written to `ai_memory_items` (visibility=`internal_agency`, source_type=`client_brief`, source_id=client_id).
- **AI button "Generate Client Strategy Base"** in Step 5 → new edge function `client-strategy-base` (Lovable AI Gateway, `google/gemini-3-flash-preview`, structured output via tool calling) returns `{summary, content_pillars[], suggested_kpis[], recommended_platforms[], initial_content_ideas[], monthly_reporting_focus}`. Result rendered inline; on accept it writes one `ai_memory_items` row (type `business_context`) with the summary and stores the full JSON in `clients.notes` appendix or a new `ai_strategy_base` jsonb column on clients (added in same migration).
- **Step 6 — Portal invite**: toggle on/off; if on → display_name, email, role (Client Owner / Client Viewer), 5 permission switches (approve content, view reports, upload documents, fill business impact, comment). Three actions: Send invite now / Skip / Copy invite link (after creation).
- **Step 7 — Review**: summary cards (basics, niche + KPI count, platforms, goals, invite status). Final button **Create Client Workspace** runs the provisioning flow (or finalizes if creation already happened on step 6).

## Provisioning on final create

In a single `Promise.all`-style sequence after `clients` insert:
1. Insert `client_kpi_schemas` row.
2. Insert per-platform rows in `client_platforms`.
3. Insert per-goal rows in `monthly_goals` for current month.
4. Insert `ai_memory_items` business-context row (and AI strategy if generated).
5. Insert default onboarding `tasks` (fixed list: "Confirm brand assets", "Schedule kickoff call", "Connect analytics access", "Approve first content batch", "Set up monthly reporting"). All with `client_id`, status `todo`.
6. If invite enabled: insert `client_invites` with permissions/portal_role.
7. Toast + navigate to `/agency/clients/:id`.

No table is needed for "default folders" or "default calendar" — `documents` and `content_posts` are queried by `client_id` and render empty states until populated. Reporting template is unchanged (uses existing `monthly_reports` flow).

## Touched files
- `supabase/migrations/<new>.sql` — new table, columns, function update, storage policies.
- `src/lib/nichePresets.ts` — new presets module.
- `src/lib/niches.ts` — extend `NICHES` to the 10 presets + custom.
- `src/components/client/AddClientWizard.tsx` — full rewrite (7 steps).
- `src/pages/agency/Clients.tsx` — no change (already uses the wizard).
- `supabase/functions/client-strategy-base/index.ts` — new edge function (Lovable AI, structured tool calling, JWT verified, 429/402 surfaced).
- `src/integrations/supabase/types.ts` — auto-regenerated.

## Security & multi-tenancy
- `agency_id` always sourced from `useUser().agency.id`; never from form input.
- `client_invites.invited_by = auth.uid()` and `permissions` validated against an allow-list before insert.
- KPI/goal/platform inserts all carry `agency_id` + `client_id`; RLS policies on existing tables already restrict by `is_member_of`.
- Logo upload path: `clients/<client_id>/logo-<timestamp>.<ext>` inside `agency-files` (private). Public URL only generated via signed URL when displayed.
- AI edge function validates JWT, resolves agency from `profiles`, returns structured JSON only — no raw HTML, no client-controlled prompts.
