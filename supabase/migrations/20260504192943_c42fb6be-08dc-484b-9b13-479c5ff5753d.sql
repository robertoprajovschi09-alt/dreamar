
-- client_briefs
CREATE TABLE public.client_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NOT NULL UNIQUE,
  submitted_by uuid,
  business_description text,
  main_objective text,
  target_audience text,
  unique_selling_points text,
  main_competitors text,
  brand_tone text,
  content_dos text,
  content_donts text,
  preferred_platforms text[] DEFAULT ARRAY[]::text[],
  posting_frequency text,
  budget_range text,
  extra_notes text,
  completed boolean NOT NULL DEFAULT false,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_briefs_agency_all ON public.client_briefs
  FOR ALL TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id) OR public.is_saas_admin(auth.uid()))
  WITH CHECK (public.is_member_of(auth.uid(), agency_id));

CREATE POLICY client_briefs_client_read ON public.client_briefs
  FOR SELECT TO authenticated
  USING (public.is_client_viewer_of(auth.uid(), client_id));

CREATE POLICY client_briefs_client_insert ON public.client_briefs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_client_viewer_of(auth.uid(), client_id) AND submitted_by = auth.uid());

CREATE POLICY client_briefs_client_update ON public.client_briefs
  FOR UPDATE TO authenticated
  USING (public.is_client_viewer_of(auth.uid(), client_id))
  WITH CHECK (public.is_client_viewer_of(auth.uid(), client_id));

CREATE TRIGGER client_briefs_set_updated_at
  BEFORE UPDATE ON public.client_briefs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Allow client viewers to log business impact for their client
DROP POLICY IF EXISTS business_impact_entries_write ON public.business_impact_entries;
CREATE POLICY business_impact_entries_write ON public.business_impact_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_member_of(auth.uid(), agency_id)
    OR (public.is_client_viewer_of(auth.uid(), client_id) AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS business_impact_entries_read ON public.business_impact_entries;
CREATE POLICY business_impact_entries_read ON public.business_impact_entries
  FOR SELECT TO authenticated
  USING (
    public.is_member_of(auth.uid(), agency_id)
    OR public.is_client_viewer_of(auth.uid(), client_id)
    OR public.is_saas_admin(auth.uid())
  );
