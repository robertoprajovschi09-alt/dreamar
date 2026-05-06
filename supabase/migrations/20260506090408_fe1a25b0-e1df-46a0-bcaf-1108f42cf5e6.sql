
-- Enums
DO $$ BEGIN
  CREATE TYPE public.ai_memory_type AS ENUM (
    'agency_preference','client_brand_voice','client_goal','niche_insight',
    'content_pattern','winning_hook','failed_hook','reporting_preference',
    'business_context','audience_insight','competitor_insight'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ai_memory_visibility AS ENUM ('internal_agency','client_visible','super_admin_only');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ai_knowledge_source_status AS ENUM ('pending','processing','processed','failed','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ai_memory_items
CREATE TABLE IF NOT EXISTS public.ai_memory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid,
  memory_type public.ai_memory_type NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  confidence_score numeric NOT NULL DEFAULT 0.5,
  is_active boolean NOT NULL DEFAULT true,
  visibility public.ai_memory_visibility NOT NULL DEFAULT 'internal_agency',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_memory_items_source_not_empty CHECK (length(btrim(source_type)) > 0 AND length(btrim(source_id)) > 0)
);

CREATE INDEX IF NOT EXISTS ai_memory_items_agency_idx ON public.ai_memory_items(agency_id);
CREATE INDEX IF NOT EXISTS ai_memory_items_client_idx ON public.ai_memory_items(client_id);
CREATE INDEX IF NOT EXISTS ai_memory_items_type_idx ON public.ai_memory_items(memory_type);

ALTER TABLE public.ai_memory_items ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS ai_memory_items_updated_at ON public.ai_memory_items;
CREATE TRIGGER ai_memory_items_updated_at
  BEFORE UPDATE ON public.ai_memory_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY "ai_memory_items_select" ON public.ai_memory_items
  FOR SELECT TO authenticated
  USING (
    public.is_saas_admin(auth.uid())
    OR (public.is_member_of(auth.uid(), agency_id) AND visibility <> 'super_admin_only')
    OR (visibility = 'client_visible' AND client_id IS NOT NULL AND public.is_client_viewer_of(auth.uid(), client_id))
  );

CREATE POLICY "ai_memory_items_insert" ON public.ai_memory_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_saas_admin(auth.uid()) OR public.is_member_of(auth.uid(), agency_id));

CREATE POLICY "ai_memory_items_update" ON public.ai_memory_items
  FOR UPDATE TO authenticated
  USING (public.is_saas_admin(auth.uid()) OR public.is_member_of(auth.uid(), agency_id));

CREATE POLICY "ai_memory_items_delete" ON public.ai_memory_items
  FOR DELETE TO authenticated
  USING (public.is_saas_admin(auth.uid()) OR public.is_member_of(auth.uid(), agency_id));

-- ai_knowledge_sources
CREATE TABLE IF NOT EXISTS public.ai_knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  client_id uuid,
  source_type text NOT NULL,
  source_id text NOT NULL,
  title text NOT NULL,
  content_summary text,
  extracted_facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.ai_knowledge_source_status NOT NULL DEFAULT 'pending',
  last_processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS ai_knowledge_sources_agency_idx ON public.ai_knowledge_sources(agency_id);
CREATE INDEX IF NOT EXISTS ai_knowledge_sources_client_idx ON public.ai_knowledge_sources(client_id);

ALTER TABLE public.ai_knowledge_sources ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS ai_knowledge_sources_updated_at ON public.ai_knowledge_sources;
CREATE TRIGGER ai_knowledge_sources_updated_at
  BEFORE UPDATE ON public.ai_knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY "ai_knowledge_sources_select" ON public.ai_knowledge_sources
  FOR SELECT TO authenticated
  USING (public.is_saas_admin(auth.uid()) OR public.is_member_of(auth.uid(), agency_id));

CREATE POLICY "ai_knowledge_sources_insert" ON public.ai_knowledge_sources
  FOR INSERT TO authenticated
  WITH CHECK (public.is_saas_admin(auth.uid()) OR public.is_member_of(auth.uid(), agency_id));

CREATE POLICY "ai_knowledge_sources_update" ON public.ai_knowledge_sources
  FOR UPDATE TO authenticated
  USING (public.is_saas_admin(auth.uid()) OR public.is_member_of(auth.uid(), agency_id));

CREATE POLICY "ai_knowledge_sources_delete" ON public.ai_knowledge_sources
  FOR DELETE TO authenticated
  USING (public.is_saas_admin(auth.uid()) OR public.is_member_of(auth.uid(), agency_id));
