
CREATE TABLE IF NOT EXISTS public.ai_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid,
  client_id uuid,
  user_id uuid NOT NULL,
  feature text NOT NULL,
  context_type text,
  prompt_key text,
  prompt_version integer,
  prompt_version_id uuid REFERENCES public.ai_prompts(id) ON DELETE SET NULL,
  model text,
  input_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_json jsonb,
  output_text text,
  tokens_in integer,
  tokens_out integer,
  cost_usd numeric,
  latency_ms integer,
  status text NOT NULL DEFAULT 'success',
  error_text text,
  safety_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_score numeric,
  missing_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_outputs_agency_feature_idx ON public.ai_outputs (agency_id, feature, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_outputs_client_idx ON public.ai_outputs (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_outputs_user_idx ON public.ai_outputs (user_id, created_at DESC);

ALTER TABLE public.ai_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_outputs_read" ON public.ai_outputs
FOR SELECT TO authenticated
USING (
  public.is_saas_admin(auth.uid())
  OR (agency_id IS NOT NULL AND public.is_member_of(auth.uid(), agency_id))
  OR (client_id IS NOT NULL AND public.is_client_viewer_of(auth.uid(), client_id))
);

CREATE POLICY "ai_outputs_insert" ON public.ai_outputs
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    public.is_saas_admin(auth.uid())
    OR (agency_id IS NOT NULL AND public.is_member_of(auth.uid(), agency_id))
  )
);

CREATE POLICY "ai_outputs_update_admin" ON public.ai_outputs
FOR UPDATE TO authenticated
USING (public.is_saas_admin(auth.uid()));
