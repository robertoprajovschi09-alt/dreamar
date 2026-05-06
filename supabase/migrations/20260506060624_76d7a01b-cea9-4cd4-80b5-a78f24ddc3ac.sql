
CREATE TABLE public.swipe_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid NULL,
  niche text NULL,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('hook','script','caption','video_idea','ad_angle','carousel_idea','story_idea','offer','cta','full_example')),
  platform text NULL,
  hook text,
  script text,
  caption text,
  content_angle text,
  content_format text,
  performance_notes text,
  why_it_worked text,
  source_url text,
  file_url text,
  tags text[] NOT NULL DEFAULT '{}',
  visibility text NOT NULL DEFAULT 'agency_internal' CHECK (visibility IN ('agency_internal','client_specific','global_template')),
  usage_count integer NOT NULL DEFAULT 0,
  performance_score numeric NULL,
  source_post_id uuid NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_swipe_files_agency_created ON public.swipe_files(agency_id, created_at DESC);
CREATE INDEX idx_swipe_files_agency_type ON public.swipe_files(agency_id, type);
CREATE INDEX idx_swipe_files_tags ON public.swipe_files USING GIN(tags);
CREATE INDEX idx_swipe_files_client ON public.swipe_files(client_id) WHERE client_id IS NOT NULL;

ALTER TABLE public.swipe_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY swipe_files_read ON public.swipe_files FOR SELECT TO authenticated
USING (
  is_member_of(auth.uid(), agency_id)
  OR (visibility = 'client_specific' AND client_id IS NOT NULL AND is_client_viewer_of(auth.uid(), client_id))
  OR visibility = 'global_template'
  OR is_saas_admin(auth.uid())
);

CREATE POLICY swipe_files_insert ON public.swipe_files FOR INSERT TO authenticated
WITH CHECK (
  is_member_of(auth.uid(), agency_id)
  AND (visibility <> 'global_template' OR is_saas_admin(auth.uid()))
);

CREATE POLICY swipe_files_update ON public.swipe_files FOR UPDATE TO authenticated
USING (is_member_of(auth.uid(), agency_id) OR is_saas_admin(auth.uid()))
WITH CHECK (is_member_of(auth.uid(), agency_id) OR is_saas_admin(auth.uid()));

CREATE POLICY swipe_files_delete ON public.swipe_files FOR DELETE TO authenticated
USING (is_member_of(auth.uid(), agency_id) OR is_saas_admin(auth.uid()));

CREATE TRIGGER swipe_files_updated_at BEFORE UPDATE ON public.swipe_files
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS swipe_file boolean NOT NULL DEFAULT false;
UPDATE public.plans SET swipe_file = true WHERE tier IN ('growth','unlimited','white_label');
