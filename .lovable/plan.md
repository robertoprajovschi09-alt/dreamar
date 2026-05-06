# AI Learning & Improvement Loop — Plan

The Core Engine already has `ai_feedback`, `ai_prompts` (versioned), `ai_evaluations`, and `ai_prompt_runs` (= `ai_outputs`). This task extends them rather than creating duplicate tables, and adds the missing piece: `ai_learning_events` plus the full admin loop UI and scoring.

## 1. Database (one migration)

### Extend existing tables (no duplicates)

**`ai_feedback`** — add columns:
- `ai_feature text` (denormalized from run.prompt_key for fast filtering)
- `feedback_type text` enum: `inaccurate | too_generic | missing_context | great_output | bad_tone | wrong_strategy | hallucinated_data | useful | not_useful`
- `was_useful boolean`
- `correction text` (the user's edited/correct version)
- `client_id uuid null` (already existed on runs; add here)

**`ai_prompt_runs`** (acts as `ai_outputs`) — add columns:
- `feature text` (alias for prompt_key, indexed for analytics)
- `output_json jsonb`
- `prompt_version_id uuid` (FK → `ai_prompts.id`, replaces loose `prompt_version` int)

**`ai_prompts`** (acts as `ai_prompt_versions`) — add columns:
- `version_name text`
- `developer_prompt text`
- `user_prompt_template text`
- `output_schema jsonb`
- `performance_score numeric` (cached, recomputed by SQL view)
- `feature text` (alias of `key` for the spec's naming)

**`ai_evaluations`** — add columns:
- `feature text` (alias of `prompt_key`)
- `test_name text`
- `input_sample jsonb`
- `expected_behavior text`
- `actual_output text`
- `evaluator_notes text`
- `passed boolean`
- `prompt_version_id uuid` (FK → `ai_prompts.id`)

### New table

**`ai_learning_events`**
- `id`, `agency_id null`, `client_id null`
- `event_type text` (negative_feedback_pattern | hallucination_spike | low_acceptance | prompt_improvement_proposal | version_promoted | version_rolled_back)
- `source text` (feedback | evaluation | run_metrics | manual)
- `summary text`
- `recommended_change text`
- `proposed_prompt_version_id uuid null` → `ai_prompts.id`
- `status text` default `'new'` (new | reviewed | approved | rejected | applied)
- `reviewed_by uuid`, `reviewed_at`, `created_at`, `updated_at`
- RLS: SaaS Admin full; agency owners read/update their own.

### Scoring view

`ai_prompt_scoreboard` (SQL view) — per `prompt_id`:
- `runs_count`, `feedback_count`, `avg_rating`, `useful_count`, `hallucinated_count`, `accepted_count` (via implemented suggestions / approved actions where applicable), `acceptance_rate`, `last_used_at`.

## 2. Edge functions (two new)

**`ai-feedback-submit`** (extend existing) — accept new fields (`feedback_type`, `was_useful`, `correction`, `ai_feature`); after insert, run a debounced detector: if last 10 feedbacks for the same `ai_feature` + agency have ≥ 5 negative (`rating ≤ 2` or `feedback_type` in negative set), insert an `ai_learning_events` row with `event_type='negative_feedback_pattern'`.

**`ai-propose-prompt-improvement`** (new)
- Input: `{ feature, agency_id? }`
- Loads recent negative feedback + worst runs for the feature.
- Asks OpenAI to draft an improved system prompt with rationale. Output JSON: `{ proposed_system_prompt, rationale, expected_improvement }`.
- Inserts a new draft `ai_prompts` row (`is_active=false`, version = max+1, `version_name='AI proposal'`, `created_by=user`).
- Inserts `ai_learning_events` row `event_type='prompt_improvement_proposal'`, `proposed_prompt_version_id` linking to the draft, `status='new'`.
- Does NOT activate. Admin must approve via UI → calls SQL update to flip `is_active`.

**`ai-run-evaluation`** (new)
- Input: `{ prompt_version_id, dataset?: [{ test_name, input_sample, expected_behavior }] }`
- Runs each sample against OpenAI using that prompt version. Scores via a rubric (LLM-as-judge): 0-1 per test. Inserts rows in `ai_evaluations` with `passed`, `score`, `actual_output`, `evaluator_notes`. Updates the prompt's cached `performance_score` to the avg.

## 3. Admin Panel (new tabs in `/admin/ai-prompts`)

The current `AiPrompts.tsx` lists prompts. Rebuild into a full panel with tabs:

**Versions tab** (per feature): list versions, performance score, runs, avg rating, hallucination count. Buttons: **Create New Prompt Version**, **Run Evaluation**, **Set as Active** (with confirm), **View Diff**.

**Performance tab**: per-feature dashboard from `ai_prompt_scoreboard` — accepted / edited / rejected, avg rating, useful%, hallucinated%, best/worst prompts.

**Feedback tab**: filterable list of `ai_feedback`, with type, rating, correction text, link to the originating run + prompt version.

**Failed outputs tab**: runs where `status='error'` or where feedback marked `hallucinated_data` / rating 1.

**Learning events tab**: list of `ai_learning_events` with **Approve & Apply** (promotes the proposed prompt version to active and marks event `applied`), **Reject**.

Add a feature-level **"Propose improvement"** button that calls `ai-propose-prompt-improvement`.

## 4. Frontend wiring

- `src/components/ai/FeedbackButtons.tsx` — extend with feedback-type dropdown + correction textarea on negative ratings; pass `ai_feature` and optional `correction`.
- `src/lib/aiLearning.ts` — small helper to fetch scoreboard data via Supabase view.

## 5. Reality-grounding

Add a global instruction to all AI Core prompts (in seed prompt content + edge functions): *"If required data is missing, output `Missing data: <field>` and stop. Never fabricate numbers."* Already partly enforced; ensure it's present in the seeded `ai_prompts` rows for each feature key.

## 6. Safety / rules enforced

- AI cannot flip `is_active` on its own. Edge function only inserts draft prompts (`is_active=false`).
- All versions retained (no DELETE used in flow; `ai_prompts` already has owner-only delete policy).
- Every run already logs `prompt_key` + `prompt_version`; this migration adds FK `prompt_version_id` for joins.
- Negative-feedback detector creates a `learning_event`, never auto-applies.

## Files

**Created**
- `supabase/migrations/<ts>_ai_learning_loop.sql`
- `supabase/functions/ai-propose-prompt-improvement/index.ts`
- `supabase/functions/ai-run-evaluation/index.ts`
- `src/lib/aiLearning.ts`
- `src/components/admin/learning/ScoreboardCard.tsx`
- `src/components/admin/learning/LearningEventCard.tsx`

**Edited**
- `supabase/functions/ai-feedback-submit/index.ts` (new fields + pattern detector)
- `src/pages/admin/AiPrompts.tsx` (rebuild with tabs)
- `src/components/ai/FeedbackButtons.tsx` (feedback_type + correction)

## Out of scope

- Auto-promotion of prompt versions (always admin-approved).
- Fine-tuning OpenAI models (only system-prompt iteration).
- Cron-scheduled evaluations (manual trigger; cron can be added later).
