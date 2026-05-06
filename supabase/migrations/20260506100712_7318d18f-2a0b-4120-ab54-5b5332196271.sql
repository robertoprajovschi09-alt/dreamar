-- client_checkins: structured monthly check-in by the client
CREATE TABLE IF NOT EXISTS public.client_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NOT NULL,
  client_user_id uuid NOT NULL,
  month smallint NOT NULL CHECK (month BETWEEN 1 AND 12),
  year smallint NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  main_priority text NOT NULL,
  priority_custom text,
  promoted_focus text,
  observed_real_results text NOT NULL DEFAULT 'unknown',
  real_results_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_feedback text,
  important_notes text,
  satisfaction_score smallint CHECK (satisfaction_score BETWEEN 1 AND 5),
  requested_direction_change text,
  direction_change_custom text,
  ai_processed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, year, month)
);
CREATE INDEX IF NOT EXISTS client_checkins_client_period_idx ON public.client_checkins (client_id, year DESC, month DESC);
CREATE INDEX IF NOT EXISTS client_checkins_agency_period_idx ON public.client_checkins (agency_id, year DESC, month DESC);
CREATE INDEX IF NOT EXISTS client_checkins_unprocessed_idx ON public.client_checkins (ai_processed) WHERE ai_processed = false;

ALTER TABLE public.client_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_checkins_agency_all ON public.client_checkins
  FOR ALL TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id) OR public.is_saas_admin(auth.uid()))
  WITH CHECK (public.is_member_of(auth.uid(), agency_id) OR public.is_saas_admin(auth.uid()));

CREATE POLICY client_checkins_client_select ON public.client_checkins
  FOR SELECT TO authenticated
  USING (public.is_client_viewer_of(auth.uid(), client_id));

CREATE POLICY client_checkins_client_insert ON public.client_checkins
  FOR INSERT TO authenticated
  WITH CHECK (
    client_user_id = auth.uid()
    AND public.is_client_viewer_of(auth.uid(), client_id)
  );

CREATE POLICY client_checkins_client_update ON public.client_checkins
  FOR UPDATE TO authenticated
  USING (
    client_user_id = auth.uid()
    AND public.is_client_viewer_of(auth.uid(), client_id)
    AND ai_processed = false
  )
  WITH CHECK (
    client_user_id = auth.uid()
    AND public.is_client_viewer_of(auth.uid(), client_id)
  );

CREATE TRIGGER set_client_checkins_updated_at
BEFORE UPDATE ON public.client_checkins
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- client_dashboard_contexts: AI-generated dashboard context
CREATE TABLE IF NOT EXISTS public.client_dashboard_contexts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NOT NULL,
  month smallint NOT NULL CHECK (month BETWEEN 1 AND 12),
  year smallint NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  generated_summary text,
  ai_priorities jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_widgets jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  client_friendly_insights jsonb NOT NULL DEFAULT '[]'::jsonb,
  agency_internal_notes text,
  confidence_score numeric(3,2) CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  generated_by_ai_output_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, year, month)
);
CREATE INDEX IF NOT EXISTS client_dashboard_contexts_client_period_idx ON public.client_dashboard_contexts (client_id, year DESC, month DESC);
CREATE INDEX IF NOT EXISTS client_dashboard_contexts_agency_period_idx ON public.client_dashboard_contexts (agency_id, year DESC, month DESC);

ALTER TABLE public.client_dashboard_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_dashboard_contexts_agency_all ON public.client_dashboard_contexts
  FOR ALL TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id) OR public.is_saas_admin(auth.uid()))
  WITH CHECK (public.is_member_of(auth.uid(), agency_id) OR public.is_saas_admin(auth.uid()));

CREATE POLICY client_dashboard_contexts_client_select ON public.client_dashboard_contexts
  FOR SELECT TO authenticated
  USING (public.is_client_viewer_of(auth.uid(), client_id));

CREATE TRIGGER set_client_dashboard_contexts_updated_at
BEFORE UPDATE ON public.client_dashboard_contexts
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();