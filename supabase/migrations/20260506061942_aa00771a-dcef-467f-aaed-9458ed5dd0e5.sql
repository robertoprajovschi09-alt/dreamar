
-- Competitors
CREATE TABLE public.competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NOT NULL,
  name text NOT NULL,
  website text,
  instagram_url text,
  tiktok_url text,
  facebook_url text,
  youtube_url text,
  linkedin_url text,
  niche text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_competitors_agency_client ON public.competitors(agency_id, client_id, created_at DESC);
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY competitors_read ON public.competitors FOR SELECT TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id) OR public.is_saas_admin(auth.uid()));
CREATE POLICY competitors_insert ON public.competitors FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(auth.uid(), agency_id));
CREATE POLICY competitors_update ON public.competitors FOR UPDATE TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id));
CREATE POLICY competitors_delete ON public.competitors FOR DELETE TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id));

CREATE TRIGGER competitors_set_updated_at BEFORE UPDATE ON public.competitors
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Observations
CREATE TABLE public.competitor_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NOT NULL,
  competitor_id uuid NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  title text NOT NULL,
  platform text,
  content_type text,
  content_url text,
  screenshot_url text,
  observed_date date NOT NULL DEFAULT current_date,
  hook text,
  caption text,
  offer text,
  content_angle text,
  estimated_performance text,
  notes text,
  ai_analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  visible_to_client boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_co_obs_agency_client_date ON public.competitor_observations(agency_id, client_id, observed_date DESC);
CREATE INDEX idx_co_obs_competitor_date ON public.competitor_observations(competitor_id, observed_date DESC);
CREATE INDEX idx_co_obs_tags ON public.competitor_observations USING GIN (tags);

ALTER TABLE public.competitor_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY competitor_observations_read ON public.competitor_observations FOR SELECT TO authenticated
  USING (
    public.is_member_of(auth.uid(), agency_id)
    OR (visible_to_client = true AND public.is_client_viewer_of(auth.uid(), client_id))
    OR public.is_saas_admin(auth.uid())
  );
CREATE POLICY competitor_observations_insert ON public.competitor_observations FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(auth.uid(), agency_id));
CREATE POLICY competitor_observations_update ON public.competitor_observations FOR UPDATE TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id));
CREATE POLICY competitor_observations_delete ON public.competitor_observations FOR DELETE TO authenticated
  USING (public.is_member_of(auth.uid(), agency_id));

CREATE TRIGGER competitor_observations_set_updated_at BEFORE UPDATE ON public.competitor_observations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Plan flag
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS competitor_tracking boolean NOT NULL DEFAULT false;
UPDATE public.plans SET competitor_tracking = true WHERE tier IN ('growth','unlimited','white_label');
