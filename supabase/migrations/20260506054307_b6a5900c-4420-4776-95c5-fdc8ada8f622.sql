
CREATE TABLE IF NOT EXISTS public.client_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_score numeric(5,2) NOT NULL DEFAULT 0,
  content_consistency_score numeric(5,2),
  performance_score numeric(5,2),
  goal_progress_score numeric(5,2),
  client_engagement_score numeric(5,2),
  business_impact_score numeric(5,2),
  score_status text NOT NULL DEFAULT 'at_risk',
  summary text,
  ai_recommendation jsonb,
  ai_generated_at timestamptz,
  missing_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_health_scores_agency_client_period
  ON public.client_health_scores (agency_id, client_id, period_start DESC);

ALTER TABLE public.client_health_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS health_scores_read ON public.client_health_scores;
CREATE POLICY health_scores_read ON public.client_health_scores
  FOR SELECT TO authenticated
  USING (
    public.is_member_of(auth.uid(), agency_id)
    OR public.is_client_viewer_of(auth.uid(), client_id)
    OR public.is_saas_admin(auth.uid())
  );

DROP POLICY IF EXISTS health_scores_insert ON public.client_health_scores;
CREATE POLICY health_scores_insert ON public.client_health_scores
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(auth.uid(), agency_id));

DROP POLICY IF EXISTS health_scores_update ON public.client_health_scores;
CREATE POLICY health_scores_update ON public.client_health_scores
  FOR UPDATE TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id));

DROP POLICY IF EXISTS health_scores_delete ON public.client_health_scores;
CREATE POLICY health_scores_delete ON public.client_health_scores
  FOR DELETE TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id));

DROP TRIGGER IF EXISTS trg_health_scores_updated_at ON public.client_health_scores;
CREATE TRIGGER trg_health_scores_updated_at
  BEFORE UPDATE ON public.client_health_scores
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS health_score boolean NOT NULL DEFAULT false;
UPDATE public.plans SET health_score = true WHERE tier IN ('growth','unlimited','white_label');
