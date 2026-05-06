
CREATE TABLE public.client_risk_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NOT NULL,
  risk_level text NOT NULL DEFAULT 'low',
  risk_score numeric(5,2) NOT NULL DEFAULT 0,
  risk_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_summary text,
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_generated_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX client_risk_alerts_active_uniq
  ON public.client_risk_alerts (client_id) WHERE status = 'active';
CREATE INDEX client_risk_alerts_agency_idx
  ON public.client_risk_alerts (agency_id, status, risk_score DESC);

CREATE TRIGGER set_updated_at_client_risk_alerts
  BEFORE UPDATE ON public.client_risk_alerts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.client_risk_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY risk_alerts_read ON public.client_risk_alerts
  FOR SELECT TO authenticated
  USING (is_member_of(auth.uid(), agency_id) OR is_saas_admin(auth.uid()));
CREATE POLICY risk_alerts_insert ON public.client_risk_alerts
  FOR INSERT TO authenticated
  WITH CHECK (is_member_of(auth.uid(), agency_id));
CREATE POLICY risk_alerts_update ON public.client_risk_alerts
  FOR UPDATE TO authenticated
  USING (is_member_of(auth.uid(), agency_id));
CREATE POLICY risk_alerts_delete ON public.client_risk_alerts
  FOR DELETE TO authenticated
  USING (is_member_of(auth.uid(), agency_id));

ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS risk_detector boolean NOT NULL DEFAULT false;
UPDATE public.plans SET risk_detector = true WHERE tier IN ('growth','unlimited','white_label');
