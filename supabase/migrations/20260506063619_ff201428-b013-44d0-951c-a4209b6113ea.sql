CREATE TABLE public.monthly_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NOT NULL,
  month int NOT NULL,
  year int NOT NULL,
  based_on_report_id uuid,
  strategy_title text NOT NULL DEFAULT 'Next Month Strategy',
  executive_summary text,
  key_insights jsonb NOT NULL DEFAULT '[]'::jsonb,
  what_worked jsonb NOT NULL DEFAULT '[]'::jsonb,
  what_did_not_work jsonb NOT NULL DEFAULT '[]'::jsonb,
  content_to_repeat jsonb NOT NULL DEFAULT '[]'::jsonb,
  content_to_stop jsonb NOT NULL DEFAULT '[]'::jsonb,
  new_tests jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_hooks jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_content_formats jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_campaigns jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_calendar_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  business_focus jsonb NOT NULL DEFAULT '[]'::jsonb,
  risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  action_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generated','reviewed','approved','sent_to_client')),
  sent_to_client_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, year, month)
);

CREATE INDEX idx_monthly_strategies_client ON public.monthly_strategies(client_id, year, month);
CREATE INDEX idx_monthly_strategies_agency ON public.monthly_strategies(agency_id);

ALTER TABLE public.monthly_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY monthly_strategies_read ON public.monthly_strategies
  FOR SELECT TO authenticated
  USING (
    public.is_member_of(auth.uid(), agency_id)
    OR public.is_saas_admin(auth.uid())
    OR (status = 'sent_to_client' AND public.is_client_viewer_of(auth.uid(), client_id))
  );

CREATE POLICY monthly_strategies_insert ON public.monthly_strategies
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(auth.uid(), agency_id));

CREATE POLICY monthly_strategies_update ON public.monthly_strategies
  FOR UPDATE TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id));

CREATE POLICY monthly_strategies_delete ON public.monthly_strategies
  FOR DELETE TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id));

CREATE TRIGGER tg_monthly_strategies_updated_at
  BEFORE UPDATE ON public.monthly_strategies
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();