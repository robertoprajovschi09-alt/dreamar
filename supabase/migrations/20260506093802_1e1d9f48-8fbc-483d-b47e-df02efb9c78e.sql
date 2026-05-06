
DROP TABLE IF EXISTS public.custom_niche_fields CASCADE;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS niche_id uuid;

CREATE TABLE IF NOT EXISTS public.niches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  is_custom boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS niches_agency_key_uniq
  ON public.niches (COALESCE(agency_id, '00000000-0000-0000-0000-000000000000'::uuid), key);

CREATE TABLE public.custom_niche_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_id uuid NOT NULL REFERENCES public.niches(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  kpi_type text NOT NULL DEFAULT 'number'
    CHECK (kpi_type IN ('number','percentage','currency','text','boolean')),
  reporting_frequency text NOT NULL DEFAULT 'monthly'
    CHECK (reporting_frequency IN ('daily','weekly','monthly')),
  visible_to_client boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.custom_niche_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_id uuid NOT NULL REFERENCES public.niches(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'number'
    CHECK (field_type IN ('number','percentage','currency','text','boolean')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.custom_niche_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_id uuid NOT NULL REFERENCES public.niches(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clients
  ADD CONSTRAINT clients_niche_id_fkey FOREIGN KEY (niche_id)
  REFERENCES public.niches(id) ON DELETE SET NULL;

ALTER TABLE public.niches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_niche_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_niche_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_niche_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY niches_read ON public.niches FOR SELECT TO authenticated
  USING (agency_id IS NULL OR public.is_member_of(auth.uid(), agency_id) OR public.is_saas_admin(auth.uid()));
CREATE POLICY niches_insert ON public.niches FOR INSERT TO authenticated
  WITH CHECK (agency_id IS NOT NULL AND public.is_member_of(auth.uid(), agency_id));
CREATE POLICY niches_update ON public.niches FOR UPDATE TO authenticated
  USING (agency_id IS NOT NULL AND public.is_member_of(auth.uid(), agency_id));
CREATE POLICY niches_delete ON public.niches FOR DELETE TO authenticated
  USING (agency_id IS NOT NULL AND public.is_member_of(auth.uid(), agency_id));
CREATE TRIGGER niches_set_updated BEFORE UPDATE ON public.niches
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY cnk_read ON public.custom_niche_kpis FOR SELECT TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id) OR public.is_saas_admin(auth.uid())
         OR EXISTS (SELECT 1 FROM public.clients c WHERE c.niche_id = custom_niche_kpis.niche_id AND public.is_client_viewer_of(auth.uid(), c.id)));
CREATE POLICY cnk_write ON public.custom_niche_kpis FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(auth.uid(), agency_id));
CREATE POLICY cnk_update ON public.custom_niche_kpis FOR UPDATE TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id));
CREATE POLICY cnk_delete ON public.custom_niche_kpis FOR DELETE TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id));

CREATE POLICY cnf_read ON public.custom_niche_fields FOR SELECT TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id) OR public.is_saas_admin(auth.uid())
         OR EXISTS (SELECT 1 FROM public.clients c WHERE c.niche_id = custom_niche_fields.niche_id AND public.is_client_viewer_of(auth.uid(), c.id)));
CREATE POLICY cnf_write ON public.custom_niche_fields FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(auth.uid(), agency_id));
CREATE POLICY cnf_update ON public.custom_niche_fields FOR UPDATE TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id));
CREATE POLICY cnf_delete ON public.custom_niche_fields FOR DELETE TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id));

CREATE POLICY cnq_read ON public.custom_niche_questions FOR SELECT TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id) OR public.is_saas_admin(auth.uid())
         OR EXISTS (SELECT 1 FROM public.clients c WHERE c.niche_id = custom_niche_questions.niche_id AND public.is_client_viewer_of(auth.uid(), c.id)));
CREATE POLICY cnq_write ON public.custom_niche_questions FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(auth.uid(), agency_id));
CREATE POLICY cnq_update ON public.custom_niche_questions FOR UPDATE TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id));
CREATE POLICY cnq_delete ON public.custom_niche_questions FOR DELETE TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id));

INSERT INTO public.niches (agency_id, key, label, is_custom) VALUES
  (NULL,'real_estate','Real Estate',false),
  (NULL,'restaurant','Restaurants',false),
  (NULL,'beauty','Beauty / Aesthetics',false),
  (NULL,'ecommerce','E-commerce',false),
  (NULL,'fitness','Fitness / Coaches',false),
  (NULL,'medical','Medical / Clinics',false),
  (NULL,'dental','Dental',false),
  (NULL,'education','Education',false),
  (NULL,'auto','Automotive',false),
  (NULL,'legal','Legal',false),
  (NULL,'finance','Finance',false)
ON CONFLICT DO NOTHING;
