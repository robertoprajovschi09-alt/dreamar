
-- ============== AI Website/App Maintainer ==============

CREATE TABLE public.ai_website_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  audit_type text NOT NULL,
  page_url text,
  page_name text,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  severity text NOT NULL DEFAULT 'medium',
  ai_summary text,
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'completed',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_website_audits_agency ON public.ai_website_audits(agency_id, created_at DESC);

CREATE TABLE public.ai_improvement_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  source_type text NOT NULL DEFAULT 'manual',
  source_id uuid,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'ux',
  priority text NOT NULL DEFAULT 'medium',
  impact_score int NOT NULL DEFAULT 5 CHECK (impact_score BETWEEN 1 AND 10),
  effort_score int NOT NULL DEFAULT 5 CHECK (effort_score BETWEEN 1 AND 10),
  ai_reasoning text,
  suggested_prompt_for_lovable text,
  status text NOT NULL DEFAULT 'new',
  approved_by uuid,
  approved_at timestamptz,
  implemented_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_suggestions_agency_status ON public.ai_improvement_suggestions(agency_id, status, created_at DESC);

CREATE TABLE public.ai_maintenance_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  suggestion_id uuid REFERENCES public.ai_improvement_suggestions(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  task_type text NOT NULL DEFAULT 'fix',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'todo',
  assigned_to uuid,
  due_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_maintenance_tasks_agency ON public.ai_maintenance_tasks(agency_id, status);

ALTER TABLE public.ai_website_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_improvement_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_maintenance_tasks ENABLE ROW LEVEL SECURITY;

-- Audits
CREATE POLICY "ai_website_audits_read" ON public.ai_website_audits FOR SELECT TO authenticated
USING (public.is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND public.is_member_of(auth.uid(), agency_id)));

CREATE POLICY "ai_website_audits_insert" ON public.ai_website_audits FOR INSERT TO authenticated
WITH CHECK (public.is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND public.is_member_of(auth.uid(), agency_id)));

CREATE POLICY "ai_website_audits_update" ON public.ai_website_audits FOR UPDATE TO authenticated
USING (public.is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND public.is_owner_of(auth.uid(), agency_id)));

-- Suggestions
CREATE POLICY "ai_suggestions_read" ON public.ai_improvement_suggestions FOR SELECT TO authenticated
USING (public.is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND public.is_member_of(auth.uid(), agency_id)));

CREATE POLICY "ai_suggestions_insert" ON public.ai_improvement_suggestions FOR INSERT TO authenticated
WITH CHECK (public.is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND public.is_member_of(auth.uid(), agency_id)));

CREATE POLICY "ai_suggestions_update" ON public.ai_improvement_suggestions FOR UPDATE TO authenticated
USING (public.is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND public.is_owner_of(auth.uid(), agency_id)));

-- Tasks
CREATE POLICY "ai_maintenance_tasks_read" ON public.ai_maintenance_tasks FOR SELECT TO authenticated
USING (public.is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND public.is_member_of(auth.uid(), agency_id)));

CREATE POLICY "ai_maintenance_tasks_insert" ON public.ai_maintenance_tasks FOR INSERT TO authenticated
WITH CHECK (public.is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND public.is_member_of(auth.uid(), agency_id)));

CREATE POLICY "ai_maintenance_tasks_update" ON public.ai_maintenance_tasks FOR UPDATE TO authenticated
USING (public.is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND public.is_member_of(auth.uid(), agency_id)));

-- updated_at triggers
CREATE TRIGGER tg_ai_website_audits_updated BEFORE UPDATE ON public.ai_website_audits
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_ai_suggestions_updated BEFORE UPDATE ON public.ai_improvement_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_ai_maintenance_tasks_updated BEFORE UPDATE ON public.ai_maintenance_tasks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
