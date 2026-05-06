
-- Extend ai_feedback
ALTER TABLE public.ai_feedback
  ADD COLUMN IF NOT EXISTS ai_feature text,
  ADD COLUMN IF NOT EXISTS feedback_type text,
  ADD COLUMN IF NOT EXISTS was_useful boolean,
  ADD COLUMN IF NOT EXISTS correction text,
  ADD COLUMN IF NOT EXISTS client_id uuid;

-- Extend ai_prompt_runs (acts as ai_outputs)
ALTER TABLE public.ai_prompt_runs
  ADD COLUMN IF NOT EXISTS feature text,
  ADD COLUMN IF NOT EXISTS output_json jsonb,
  ADD COLUMN IF NOT EXISTS prompt_version_id uuid REFERENCES public.ai_prompts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_ai_prompt_runs_feature ON public.ai_prompt_runs(feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_runs_prompt_version ON public.ai_prompt_runs(prompt_version_id);

-- Extend ai_prompts (acts as ai_prompt_versions)
ALTER TABLE public.ai_prompts
  ADD COLUMN IF NOT EXISTS version_name text,
  ADD COLUMN IF NOT EXISTS developer_prompt text,
  ADD COLUMN IF NOT EXISTS user_prompt_template text,
  ADD COLUMN IF NOT EXISTS output_schema jsonb,
  ADD COLUMN IF NOT EXISTS performance_score numeric,
  ADD COLUMN IF NOT EXISTS feature text;
UPDATE public.ai_prompts SET feature = key WHERE feature IS NULL;

-- Extend ai_evaluations
ALTER TABLE public.ai_evaluations
  ADD COLUMN IF NOT EXISTS feature text,
  ADD COLUMN IF NOT EXISTS test_name text,
  ADD COLUMN IF NOT EXISTS input_sample jsonb,
  ADD COLUMN IF NOT EXISTS expected_behavior text,
  ADD COLUMN IF NOT EXISTS actual_output text,
  ADD COLUMN IF NOT EXISTS evaluator_notes text,
  ADD COLUMN IF NOT EXISTS passed boolean,
  ADD COLUMN IF NOT EXISTS prompt_version_id uuid REFERENCES public.ai_prompts(id) ON DELETE SET NULL;

-- New: ai_learning_events
CREATE TABLE public.ai_learning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id uuid,
  event_type text NOT NULL,
  source text NOT NULL DEFAULT 'feedback',
  summary text,
  recommended_change text,
  proposed_prompt_version_id uuid REFERENCES public.ai_prompts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_learning_events_status ON public.ai_learning_events(status, created_at DESC);

ALTER TABLE public.ai_learning_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_learning_events_read" ON public.ai_learning_events FOR SELECT TO authenticated
USING (public.is_saas_admin(auth.uid()) OR agency_id IS NULL OR public.is_member_of(auth.uid(), agency_id));

CREATE POLICY "ai_learning_events_insert" ON public.ai_learning_events FOR INSERT TO authenticated
WITH CHECK (public.is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND public.is_member_of(auth.uid(), agency_id)));

CREATE POLICY "ai_learning_events_update" ON public.ai_learning_events FOR UPDATE TO authenticated
USING (public.is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND public.is_owner_of(auth.uid(), agency_id)));

CREATE TRIGGER tg_ai_learning_events_updated BEFORE UPDATE ON public.ai_learning_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Scoreboard view
CREATE OR REPLACE VIEW public.ai_prompt_scoreboard AS
SELECT
  p.id AS prompt_id,
  p.key AS feature,
  p.version,
  p.version_name,
  p.is_active,
  p.agency_id,
  COALESCE(r.runs_count, 0) AS runs_count,
  r.last_used_at,
  COALESCE(f.feedback_count, 0) AS feedback_count,
  f.avg_rating,
  COALESCE(f.useful_count, 0) AS useful_count,
  COALESCE(f.hallucinated_count, 0) AS hallucinated_count,
  COALESCE(f.negative_count, 0) AS negative_count,
  CASE WHEN COALESCE(f.feedback_count, 0) > 0
       THEN ROUND((COALESCE(f.useful_count, 0)::numeric / f.feedback_count) * 100, 1)
       ELSE NULL END AS acceptance_rate
FROM public.ai_prompts p
LEFT JOIN (
  SELECT prompt_version_id, COUNT(*) AS runs_count, MAX(created_at) AS last_used_at
  FROM public.ai_prompt_runs WHERE prompt_version_id IS NOT NULL
  GROUP BY prompt_version_id
) r ON r.prompt_version_id = p.id
LEFT JOIN (
  SELECT
    rn.prompt_version_id,
    COUNT(fb.id) AS feedback_count,
    AVG(fb.rating) AS avg_rating,
    COUNT(*) FILTER (WHERE fb.was_useful IS TRUE OR fb.feedback_type IN ('useful','great_output')) AS useful_count,
    COUNT(*) FILTER (WHERE fb.feedback_type = 'hallucinated_data') AS hallucinated_count,
    COUNT(*) FILTER (WHERE fb.rating <= 2 OR fb.feedback_type IN ('inaccurate','too_generic','missing_context','bad_tone','wrong_strategy','hallucinated_data','not_useful')) AS negative_count
  FROM public.ai_feedback fb
  JOIN public.ai_prompt_runs rn ON rn.id = fb.run_id
  WHERE rn.prompt_version_id IS NOT NULL
  GROUP BY rn.prompt_version_id
) f ON f.prompt_version_id = p.id;
