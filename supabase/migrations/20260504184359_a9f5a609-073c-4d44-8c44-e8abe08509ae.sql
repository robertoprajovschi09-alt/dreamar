
-- Extend clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS brand_color text,
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS target_audience text,
  ADD COLUMN IF NOT EXISTS tone_of_voice text,
  ADD COLUMN IF NOT EXISTS competitors text,
  ADD COLUMN IF NOT EXISTS budget_estimate numeric,
  ADD COLUMN IF NOT EXISTS services jsonb NOT NULL DEFAULT '[]'::jsonb;

-- client_platforms
CREATE TABLE IF NOT EXISTS public.client_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NOT NULL,
  platform text NOT NULL,
  handle text,
  url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, platform)
);
ALTER TABLE public.client_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_platforms_read ON public.client_platforms FOR SELECT TO authenticated
  USING (is_member_of(auth.uid(), agency_id) OR is_client_viewer_of(auth.uid(), client_id) OR is_saas_admin(auth.uid()));
CREATE POLICY client_platforms_write ON public.client_platforms FOR INSERT TO authenticated
  WITH CHECK (is_member_of(auth.uid(), agency_id));
CREATE POLICY client_platforms_update ON public.client_platforms FOR UPDATE TO authenticated
  USING (is_member_of(auth.uid(), agency_id));
CREATE POLICY client_platforms_delete ON public.client_platforms FOR DELETE TO authenticated
  USING (is_member_of(auth.uid(), agency_id));

CREATE TRIGGER client_platforms_set_updated BEFORE UPDATE ON public.client_platforms
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- monthly_goals
CREATE TABLE IF NOT EXISTS public.monthly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NOT NULL,
  month date NOT NULL DEFAULT (date_trunc('month', now()))::date,
  objective text NOT NULL,
  metric text,
  target numeric,
  progress numeric DEFAULT 0,
  deadline date,
  status text NOT NULL DEFAULT 'in_progress',
  owner uuid,
  notes text,
  final_result text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.monthly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY monthly_goals_read ON public.monthly_goals FOR SELECT TO authenticated
  USING (is_member_of(auth.uid(), agency_id) OR is_client_viewer_of(auth.uid(), client_id) OR is_saas_admin(auth.uid()));
CREATE POLICY monthly_goals_write ON public.monthly_goals FOR INSERT TO authenticated
  WITH CHECK (is_member_of(auth.uid(), agency_id));
CREATE POLICY monthly_goals_update ON public.monthly_goals FOR UPDATE TO authenticated
  USING (is_member_of(auth.uid(), agency_id));
CREATE POLICY monthly_goals_delete ON public.monthly_goals FOR DELETE TO authenticated
  USING (is_member_of(auth.uid(), agency_id));

CREATE TRIGGER monthly_goals_set_updated BEFORE UPDATE ON public.monthly_goals
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- custom_niche_fields
CREATE TABLE IF NOT EXISTS public.custom_niche_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NOT NULL,
  field_key text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL DEFAULT 'number',
  unit text,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, field_key)
);
ALTER TABLE public.custom_niche_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY custom_niche_fields_read ON public.custom_niche_fields FOR SELECT TO authenticated
  USING (is_member_of(auth.uid(), agency_id) OR is_client_viewer_of(auth.uid(), client_id) OR is_saas_admin(auth.uid()));
CREATE POLICY custom_niche_fields_write ON public.custom_niche_fields FOR INSERT TO authenticated
  WITH CHECK (is_member_of(auth.uid(), agency_id));
CREATE POLICY custom_niche_fields_update ON public.custom_niche_fields FOR UPDATE TO authenticated
  USING (is_member_of(auth.uid(), agency_id));
CREATE POLICY custom_niche_fields_delete ON public.custom_niche_fields FOR DELETE TO authenticated
  USING (is_member_of(auth.uid(), agency_id));

CREATE TRIGGER custom_niche_fields_set_updated BEFORE UPDATE ON public.custom_niche_fields
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_client_platforms_client ON public.client_platforms(client_id);
CREATE INDEX IF NOT EXISTS idx_monthly_goals_client_month ON public.monthly_goals(client_id, month);
CREATE INDEX IF NOT EXISTS idx_custom_niche_fields_client ON public.custom_niche_fields(client_id);
