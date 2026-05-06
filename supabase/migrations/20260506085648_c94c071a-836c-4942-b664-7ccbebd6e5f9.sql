
DO $$ BEGIN CREATE TYPE ai_action_risk AS ENUM ('low','medium','high','critical'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE ai_action_request_status AS ENUM ('pending','approved','rejected','executed','failed','auto_executed','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS ai_auto_execute_low boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.ai_action_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid,
  client_id uuid,
  requested_by_ai_output_id uuid REFERENCES public.ai_outputs(id) ON DELETE SET NULL,
  requested_by_user_id uuid,
  action_type text NOT NULL,
  title text NOT NULL,
  description text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  edited_payload jsonb,
  reasoning text,
  risk_level ai_action_risk NOT NULL DEFAULT 'medium',
  status ai_action_request_status NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid,
  approved_at timestamptz,
  rejected_by uuid,
  rejected_at timestamptz,
  rejection_reason text,
  executed_at timestamptz,
  execution_result jsonb,
  execution_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_action_requests_agency_status_idx ON public.ai_action_requests (agency_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_action_requests_status_risk_idx ON public.ai_action_requests (status, risk_level);

ALTER TABLE public.ai_action_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_action_requests_read" ON public.ai_action_requests
FOR SELECT TO authenticated
USING (
  public.is_saas_admin(auth.uid())
  OR (agency_id IS NOT NULL AND public.is_member_of(auth.uid(), agency_id))
);

CREATE POLICY "ai_action_requests_insert" ON public.ai_action_requests
FOR INSERT TO authenticated
WITH CHECK (
  public.is_saas_admin(auth.uid())
  OR (agency_id IS NOT NULL AND public.is_member_of(auth.uid(), agency_id))
);

CREATE POLICY "ai_action_requests_update" ON public.ai_action_requests
FOR UPDATE TO authenticated
USING (
  public.is_saas_admin(auth.uid())
  OR (agency_id IS NOT NULL AND public.is_member_of(auth.uid(), agency_id))
);

DROP TRIGGER IF EXISTS tg_ai_action_requests_updated_at ON public.ai_action_requests;
CREATE TRIGGER tg_ai_action_requests_updated_at
BEFORE UPDATE ON public.ai_action_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
