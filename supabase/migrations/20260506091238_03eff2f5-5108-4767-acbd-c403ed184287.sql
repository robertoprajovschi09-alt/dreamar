DO $$ BEGIN
  CREATE TYPE public.cie_status AS ENUM ('collecting','evaluating','awaiting_review','completed','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.continuous_improvement_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid,
  run_type text NOT NULL,
  input_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_patterns jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_improvements jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_improvements jsonb NOT NULL DEFAULT '[]'::jsonb,
  rejected_improvements jsonb NOT NULL DEFAULT '[]'::jsonb,
  performance_before jsonb NOT NULL DEFAULT '{}'::jsonb,
  performance_after jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.cie_status NOT NULL DEFAULT 'collecting',
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cie_runs_agency_idx ON public.continuous_improvement_runs(agency_id);
CREATE INDEX IF NOT EXISTS cie_runs_status_idx ON public.continuous_improvement_runs(status);

ALTER TABLE public.continuous_improvement_runs ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS continuous_improvement_runs_updated_at ON public.continuous_improvement_runs;
CREATE TRIGGER continuous_improvement_runs_updated_at
  BEFORE UPDATE ON public.continuous_improvement_runs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP POLICY IF EXISTS "cie_select" ON public.continuous_improvement_runs;
CREATE POLICY "cie_select" ON public.continuous_improvement_runs
  FOR SELECT TO authenticated
  USING (public.is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND public.is_member_of(auth.uid(), agency_id)));

DROP POLICY IF EXISTS "cie_insert" ON public.continuous_improvement_runs;
CREATE POLICY "cie_insert" ON public.continuous_improvement_runs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND public.is_member_of(auth.uid(), agency_id)));

DROP POLICY IF EXISTS "cie_update" ON public.continuous_improvement_runs;
CREATE POLICY "cie_update" ON public.continuous_improvement_runs
  FOR UPDATE TO authenticated
  USING (public.is_saas_admin(auth.uid()) OR (agency_id IS NOT NULL AND public.is_member_of(auth.uid(), agency_id)));